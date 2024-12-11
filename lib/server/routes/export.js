/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Defines the export routes and logic for handling chart export
 * requests in an Express server. This module processes incoming requests
 * to export charts in various formats (e.g. JPEG, PNG, PDF, SVG). It integrates
 * with Highcharts' core functionalities and supports both immediate download
 * responses and base64-encoded content returns. The code also features
 * benchmarking for performance monitoring.
 */

import { startExport } from '../../chart.js';
import { getOptions } from '../../config.js';
import { log } from '../../logger.js';
import { prepareTelemetry } from '../../telemetry.js';
import { measureTime, mergeConfigOptions } from '../../utils.js';

import NoCorrectResultError from '../../errors/NoCorrectResultError.js';

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
 * @async
 * @function requestExport
 *
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 *
 * @returns {Promise<void>} A promise that resolves once the export process
 * is complete.
 */
async function requestExport(request, response, next) {
  try {
    // Start counting time for a request
    const requestCounter = measureTime();

    // In case the connection is closed, force to abort further actions
    let connectionAborted = false;
    request.socket.on('close', (hadErrors) => {
      if (hadErrors) {
        connectionAborted = true;
      }
    });

    // Get the options previously validated in the middleware
    const requestOptions = request.validatedOptions;

    // Get the request id
    const requestId = requestOptions.payload.requestId;

    // Log info about an incoming request with correct data
    log(4, `[export] Got an incoming HTTP request with ID ${requestId}.`);

    // Get the current server's global options
    const defaultOptions = getOptions();

    // Merge the request options into default ones
    const options = mergeConfigOptions(defaultOptions, requestOptions);

    // Save the instr in the options
    options.export.options = requestOptions.export.instr;

    // Start the export process
    await startExport(options, (error, data) => {
      // Remove the close event from the socket
      request.socket.removeAllListeners('close');

      // After the whole exporting process
      if (defaultOptions.server.benchmarking) {
        log(
          5,
          `[benchmark] Request: ${requestId} - After the whole exporting process: ${requestCounter()}ms.`
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
          `The request with ID ${requestId} from ${
            request.headers['x-forwarded-for'] ||
            request.connection.remoteAddress
          } was incorrect. Received result is ${data.result}.`
        );
        throw NoCorrectResultError();
      }

      // Telemetry only for the options based request
      if (!options.export.svg) {
        // Prepare and send the options through the WebSocket
        prepareTelemetry(options.export.options, options.payload.requestId);
      }

      // Return the result in an appropriate format
      if (data.result) {
        // Get the type from options
        const type = data.options.export.type;

        // If only base64 is required, return it
        if (options.export.b64) {
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
        if (!options.export.noDownload) {
          response.attachment(options.export.outfile);
        }

        // If SVG, return plain content
        return type === 'svg'
          ? response.send(data.result)
          : response.send(Buffer.from(data.result, 'base64'));
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Adds the POST / and /:filename routes for the chart exporting.
 *
 * @function exportRoute
 *
 * @param {Express} app - The Express app instance.
 */
export default function exportRoute(app) {
  /**
   * Adds the POST / - a route for handling POST requests at the root endpoint.
   */
  app.post('/', requestExport);

  /**
   * Adds the POST /:filename - a route for handling POST requests with
   * a specified filename parameter.
   */
  app.post('/:filename', requestExport);
}
