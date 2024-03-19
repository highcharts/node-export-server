/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { v4 as uuid } from 'uuid';

import { getAllowCodeExecution, startExport } from '../../chart.js';
import { getOptions, mergeConfigOptions } from '../../config.js';
import { log } from '../../logger.js';
import {
  fixType,
  isCorrectJSON,
  isObjectEmpty,
  isPrivateRangeUrlFound,
  optionsStringify,
  measureTime
} from '../../utils.js';

import HttpError from '../../errors/HttpError.js';

// Reversed MIME types
const reversedMime = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  pdf: 'application/pdf',
  svg: 'image/svg+xml'
};

// The requests counter
let requestsCounter = 0;

// The array of callbacks to call before a request
const beforeRequest = [];

// The array of callbacks to call after a request
const afterRequest = [];

/**
 * Invokes an array of callback functions with specified parameters, allowing
 * customization of request handling.
 *
 * @param {Function[]} callbacks - An array of callback functions
 * to be executed.
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Object} data - An object containing parameters like id, uniqueId,
 * type, and body.
 *
 * @returns {boolean} - Returns a boolean indicating the overall result
 * of the callback invocations.
 */
const doCallbacks = (callbacks, request, response, data) => {
  let result = true;
  const { id, uniqueId, type, body } = data;

  callbacks.some((callback) => {
    if (callback) {
      let callResponse = callback(request, response, id, uniqueId, type, body);

      if (callResponse !== undefined && callResponse !== true) {
        result = callResponse;
      }

      return true;
    }
  });

  return result;
};

/**
 * Handles the export requests from the client.
 *
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 *
 * @returns {Promise<void>} - A promise that resolves once the export process
 * is complete.
 */
const exportHandler = async (request, response, next) => {
  try {
    // Start counting time
    const stopCounter = measureTime();

    // Create a unique ID for a request
    const uniqueId = uuid().replace(/-/g, '');

    // Get the current server's general options
    const defaultOptions = getOptions();

    const body = request.body;
    const id = ++requestsCounter;

    let type = fixType(body.type);

    // Throw 'Bad Request' if there's no body
    if (!body || isObjectEmpty(body)) {
      throw new HttpError(
        'The request body is required. Please ensure that your Content-Type header is correct (accepted types are application/json and multipart/form-data).',
        400
      );
    }

    // All of the below can be used
    let instr = isCorrectJSON(body.infile || body.options || body.data);

    // Throw 'Bad Request' if there's no JSON or SVG to export
    if (!instr && !body.svg) {
      log(
        2,
        `The request with ID ${uniqueId} from ${
          request.headers['x-forwarded-for'] || request.connection.remoteAddress
        } was incorrect. Payload received: ${JSON.stringify(body)}.`
      );

      throw new HttpError(
        "No correct chart data found. Ensure that you are using either application/json or multipart/form-data headers. If sending JSON, make sure the chart data is in the 'infile', 'options', or 'data' attribute. If sending SVG, ensure it is in the 'svg' attribute.",
        400
      );
    }

    let callResponse = false;

    // Call the before request functions
    callResponse = doCallbacks(beforeRequest, request, response, {
      id,
      uniqueId,
      type,
      body
    });

    // Block the request if one of a callbacks failed
    if (callResponse !== true) {
      return response.send(callResponse);
    }

    let connectionAborted = false;

    // In case the connection is closed, force to abort further actions
    request.socket.on('close', () => {
      connectionAborted = true;
    });

    log(4, `[export] Got an incoming HTTP request with ID ${uniqueId}.`);

    body.constr = (typeof body.constr === 'string' && body.constr) || 'chart';

    // Gather and organize options from the payload
    const requestOptions = {
      export: {
        instr,
        type,
        constr: body.constr[0].toLowerCase() + body.constr.substr(1),
        height: body.height,
        width: body.width,
        scale: body.scale || defaultOptions.export.scale,
        globalOptions: isCorrectJSON(body.globalOptions, true),
        themeOptions: isCorrectJSON(body.themeOptions, true)
      },
      customLogic: {
        allowCodeExecution: getAllowCodeExecution(),
        allowFileResources: false,
        resources: isCorrectJSON(body.resources, true),
        callback: body.callback,
        customCode: body.customCode
      }
    };

    if (instr) {
      // Stringify JSON with options
      requestOptions.export.instr = optionsStringify(
        instr,
        requestOptions.customLogic.allowCodeExecution
      );
    }

    // Merge the request options into default ones
    const options = mergeConfigOptions(defaultOptions, requestOptions);

    // Save the JSON if exists
    options.export.options = instr;

    // Lastly, add the server specific arguments into options as payload
    options.payload = {
      svg: body.svg || false,
      b64: body.b64 || false,
      noDownload: body.noDownload || false,
      requestId: uniqueId
    };

    // Test xlink:href elements from payload's SVG
    if (body.svg && isPrivateRangeUrlFound(options.payload.svg)) {
      throw new HttpError(
        'SVG potentially contain at least one forbidden URL in xlink:href element. Please review the SVG content and ensure that all referenced URLs comply with security policies.',
        400
      );
    }

    // Start the export process
    await startExport(options, (error, info) => {
      // Remove the close event from the socket
      request.socket.removeAllListeners('close');

      // After the whole exporting process
      if (defaultOptions.server.benchmarking) {
        log(
          5,
          `[benchmark] Request with ID ${uniqueId} - After the whole exporting process: ${stopCounter()}ms.`
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
      if (!info || !info.result) {
        throw new HttpError(
          `Unexpected return from chart generation. Please check your request data. For the request with ID ${uniqueId}, the result is ${info.result}.`,
          400
        );
      }

      // Get the type from options
      type = info.options.export.type;

      // The after request callbacks
      doCallbacks(afterRequest, request, response, { id, body: info.result });

      if (info.result) {
        // If only base64 is required, return it
        if (body.b64) {
          // SVG Exception for the Highcharts 11.3.0 version
          if (type === 'pdf' || type == 'svg') {
            return response.send(
              Buffer.from(info.result, 'utf8').toString('base64')
            );
          }

          return response.send(info.result);
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
          ? response.send(info.result)
          : response.send(Buffer.from(info.result, 'base64'));
      }
    });
  } catch (error) {
    next(error);
  }
};

export default (app) => {
  /**
   * Adds the POST / a route for handling POST requests at the root endpoint.
   */
  app.post('/', exportHandler);

  /**
   * Adds the POST /:filename a route for handling POST requests with
   * a specified filename parameter.
   */
  app.post('/:filename', exportHandler);
};
