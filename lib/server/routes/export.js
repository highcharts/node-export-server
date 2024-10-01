/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { v4 as uuid } from 'uuid';

import { getAllowCodeExecution, startExport } from '../../chart.js';
import { getOptions } from '../../config.js';
import { log, logZodIssues } from '../../logger.js';
import { prepareTelemetry } from '../../telemetry.js';
import {
  fixConstr,
  fixType,
  isCorrectJSON,
  isObjectEmpty,
  isPrivateRangeUrlFound,
  measureTime,
  mergeConfigOptions
} from '../../utils.js';
import { looseValidate } from '../../validate.js';

import NoCorrectBodyError from '../../errors/NoCorrectBodyError.js';
import NoCorrectChartDataError from '../../errors/NoCorrectChartDataError.js';
import NoCorrectResultError from '../../errors/NoCorrectResultError.js';
import PrivateRangeUrlError from '../../errors/PrivateRangeUrlError.js';
import ValidationError from '../../errors/ValidationError.js';

// Reversed MIME types
const reversedMime = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  pdf: 'application/pdf',
  svg: 'image/svg+xml'
};

/**
 * Handles the export requests from the client.
 *
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 *
 * @returns {Promise<void>} A promise that resolves once the export process is
 * complete.
 */
async function requestExport(request, response, next) {
  try {
    // Start counting time for a request
    const requestCounter = measureTime();

    // Create a unique ID for a request
    const uniqueId = uuid().replace(/-/g, '');

    // Get the request body
    const body = request.body;

    // Throw 'NoCorrectBodyError' if there is no correct body
    if (!body || isObjectEmpty(body)) {
      log(
        2,
        `The request with ID ${uniqueId} from ${
          request.headers['x-forwarded-for'] || request.connection.remoteAddress
        } was incorrect. Received payload is empty.`
      );
      throw new NoCorrectBodyError();
    }

    // Get the allowCodeExecution option for the server
    const allowCodeExecution = getAllowCodeExecution();

    // Find a correct chart options
    const instr = isCorrectJSON(
      // Use one of the below
      body.infile || body.options || body.data,
      // Stringify options
      true,
      // Allow or disallow functions
      allowCodeExecution
    );

    // Throw 'NoCorrectChartDataError' if there is no correct options or SVG
    if (!instr && !body.svg) {
      log(
        2,
        `The request with ID ${uniqueId} from ${
          request.headers['x-forwarded-for'] || request.connection.remoteAddress
        } was incorrect. Received payload is ${JSON.stringify(body)}.`
      );
      throw new NoCorrectChartDataError();
    }

    // In case the connection is closed, force to abort further actions
    let connectionAborted = false;
    request.socket.on('close', () => {
      connectionAborted = true;
    });

    // Gather and organize options from the payload
    let requestOptions = null;
    try {
      // Validate options from the request body
      requestOptions = looseValidate({
        export: {
          instr,
          type: fixType(body.type),
          constr: fixConstr(body.constr),
          height: body.height,
          width: body.width,
          scale: body.scale,
          globalOptions: isCorrectJSON(
            body.globalOptions,
            true,
            allowCodeExecution
          ),
          themeOptions: isCorrectJSON(
            body.themeOptions,
            true,
            allowCodeExecution
          )
        },
        customLogic: {
          allowCodeExecution,
          allowFileResources: false,
          resources: isCorrectJSON(body.resources, true, allowCodeExecution),
          callback: body.callback,
          customCode: body.customCode
        },
        payload: {
          svg: body.svg,
          b64: body.b64,
          noDownload: body.noDownload,
          requestId: uniqueId
        }
      });
    } catch (error) {
      logZodIssues(
        1,
        error.issues,
        '[config] Request options validation error'
      );
      throw new ValidationError();
    }

    // Log info about an incoming request with correct data
    log(4, `[export] Got an incoming HTTP request with ID ${uniqueId}.`);

    // Get the current server's global options
    const defaultOptions = getOptions();

    // Merge the request options into default ones
    const options = mergeConfigOptions(defaultOptions, requestOptions);

    // Save the instr in the options
    options.export.options = instr;

    // Test xlink:href elements from payload's SVG
    if (options.payload.svg && isPrivateRangeUrlFound(options.payload.svg)) {
      throw PrivateRangeUrlError();
    }

    // Start the export process
    await startExport(options, (error, data) => {
      // Remove the close event from the socket
      request.socket.removeAllListeners('close');

      // After the whole exporting process
      if (defaultOptions.server.benchmarking) {
        log(
          5,
          `[benchmark] Request: ${uniqueId} - After the whole exporting process: ${requestCounter()}ms.`
        );
      }

      // If the connection was closed, do nothing
      if (connectionAborted) {
        return log(
          3,
          `[export] The client closed the connection before the chart finished processing.`
        );
      }

      // If error, log it and send it to the error middleware
      if (error) {
        throw error;
      }

      // If data is missing, log the message and send it to the error middleware
      if (!data || !data.result) {
        log(
          2,
          `The request with ID ${uniqueId} from ${
            request.headers['x-forwarded-for'] ||
            request.connection.remoteAddress
          } was incorrect. Received result is ${data.result}.`
        );
        throw NoCorrectResultError();
      }

      // Telemetry only for the options based request
      if (!options.payload.svg) {
        // Prepare and send the options through the WebSocket
        prepareTelemetry(options.export.options, options.payload.requestId);
      }

      // Return the result in an appropriate format
      if (data.result) {
        // Get the type from options
        const type = data.options.export.type;

        // If only base64 is required, return it
        if (body.b64) {
          // SVG Exception for the Highcharts 11.3.0 version
          if (type === 'pdf' || type == 'svg') {
            return response.send(
              Buffer.from(data.result, 'utf8').toString('base64')
            );
          }

          // If b64, return base64 content
          return response.send(data.result);
        }

        // Set correct content type
        response.header('Content-Type', reversedMime[type] || 'image/png');

        // Decide whether to download or not chart file
        if (!body.noDownload) {
          response.attachment(
            `${request.params.filename || request.body.filename || 'chart'}.${
              type || 'png'
            }`
          );
        }

        // If SVG, return plain content
        return type === 'svg'
          ? response.send(data.result)
          : response.send(Buffer.from(data.result, 'base64'));
      }
    });
  } catch (error) {
    next(error);
  }
}

export default (app) => {
  /**
   * Adds the POST / a route for handling POST requests at the root endpoint.
   */
  app.post('/', requestExport);

  /**
   * Adds the POST /:filename a route for handling POST requests with
   * a specified filename parameter.
   */
  app.post('/:filename', requestExport);
};
