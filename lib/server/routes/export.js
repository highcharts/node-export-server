/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Defines the export routes and logic for handling chart export
 * requests in an Express server. This module processes incoming requests
 * to export charts in various formats (e.g. JPEG, PNG, PDF, SVG). It integrates
 * with Highcharts' core functionalities and supports both immediate download
 * responses and Base64-encoded content returns. The code also features
 * benchmarking for performance monitoring.
 */

import { startExport } from '../../chart.js';
import { log } from '../../logger.js';
import { getBase64, measureTime } from '../../utils.js';

import HttpError from '../../errors/HttpError.js';

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
 * @returns {Promise<void>} A Promise that resolves once the export process
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

    // Get the options previously validated in the validation middleware
    const requestOptions = request.validatedOptions;

    // Get the request id
    const requestId = requestOptions._requestId;

    // Info about an incoming request with correct data
    log(4, `[export] Got an incoming HTTP request with ID ${requestId}.`);

    // Start the export process
    await startExport(requestOptions, (error, data) => {
      // Remove the close event from the socket
      request.socket.removeAllListeners('close');

      // If the connection was closed, do nothing
      if (connectionAborted) {
        log(
          3,
          `[export] Request [${requestId}] - The client closed the connection before the chart finished processing.`
        );
        return;
      }

      // If error, log it and send it to the error middleware
      if (error) {
        throw error;
      }

      // If data is missing, log the message and send it to the error middleware
      if (!data || !data.result) {
        log(
          2,
          `[export] Request [${requestId}] - Request from ${
            request.headers['x-forwarded-for'] ||
            request.connection.remoteAddress
          } was incorrect. Received result is ${data.result}.`
        );

        throw new HttpError(
          '[export] Unexpected return of the export result from the chart generation. Please check your request data.',
          400
        );
      }

      // Return the result in an appropriate format
      if (data.result) {
        log(
          3,
          `[export] Request [${requestId}] - The whole exporting process took ${requestCounter()}ms.`
        );

        // Get the `type`, `b64`, `noDownload`, and `outfile` from options
        const { type, b64, noDownload, outfile } = data.options.export;

        // If only Base64 is required, return it
        if (b64) {
          return response.send(getBase64(data.result, type));
        }

        // Set correct content type
        response.header('Content-Type', reversedMime[type] || 'image/png');

        // Decide whether to download or not chart file
        if (!noDownload) {
          response.attachment(outfile);
        }

        // If SVG, return plain content, otherwise a b64 string from a buffer
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
 * Adds the `export` routes.
 *
 * @function exportRoutes
 *
 * @param {Express} app - The Express app instance.
 */
export default function exportRoutes(app) {
  /**
   * Adds the POST '/' - A route for handling POST requests at the root
   * endpoint.
   */
  app.post('/', requestExport);

  /**
   * Adds the POST '/:filename' - A route for handling POST requests with
   * a specified filename parameter.
   */
  app.post('/:filename', requestExport);
}
