/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Provides middleware functions for validating incoming HTTP requests
 * in an Express application. This module ensures that requests contain
 * appropriate content types and valid request bodies, including proper JSON
 * structures and chart data for exports. It checks for potential issues such
 * as missing or malformed data, private range URLs in SVG payloads, and allows
 * for flexible options validation. The middleware logs detailed information
 * and handles errors related to incorrect payloads, chart data, and private URL
 * usage.
 */

import { v4 as uuid } from 'uuid';

import { getAllowCodeExecution } from '../../chart.js';
import { isAllowedConfig } from '../../config.js';
import { log } from '../../logger.js';
import { isObjectEmpty, isPrivateRangeUrlFound } from '../../utils.js';

import ExportError from '../../errors/ExportError.js';

/**
 * Middleware for validating the content-type header.
 *
 * @function contentTypeMiddleware
 *
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 *
 * @returns {undefined} The call to the next middleware function.
 *
 * @throws {ExportError} Throws an `ExportError` if the content-type
 * is not correct.
 */
function contentTypeMiddleware(request, response, next) {
  try {
    // Get the content type header
    const contentType = request.headers['content-type'] || '';

    // Allow only JSON, URL-encoded and form data without files types of data
    if (
      !contentType.includes('application/json') &&
      !contentType.includes('application/x-www-form-urlencoded') &&
      !contentType.includes('multipart/form-data')
    ) {
      throw new ExportError(
        '[validation] Content-Type must be application/json, application/x-www-form-urlencoded, or multipart/form-data.',
        415
      );
    }

    // Call the `requestBodyMiddleware` middleware
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Middleware for validating the request's body.
 *
 * @function requestBodyMiddleware
 *
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 *
 * @returns {undefined} The call to the next middleware function.
 *
 * @throws {ExportError} Throws an `ExportError` if the body is not correct.
 * @throws {ExportError} Throws an `ExportError` if the chart data from the body
 * is not correct.
 * @throws {ExportError} Throws an `ExportError` in case of the private range
 * url error.
 */
function requestBodyMiddleware(request, response, next) {
  try {
    // Get the request body
    const body = request.body;

    // Create a unique ID for a request
    const requestId = uuid();

    // Throw an error if there is no correct body
    if (!body || isObjectEmpty(body)) {
      log(
        2,
        `[validation] Request [${requestId}] - The request from ${
          request.headers['x-forwarded-for'] || request.connection.remoteAddress
        } was incorrect. Received payload is empty.`
      );

      throw new ExportError(
        `[validation] Request [${requestId}] - The request body is required. Please ensure that your Content-Type header is correct. Accepted types are 'application/json' and 'multipart/form-data'.`,
        400
      );
    }

    // Get the `allowCodeExecution` option for the server
    const allowCodeExecution = getAllowCodeExecution();

    // Find a correct chart options
    const instr = isAllowedConfig(
      // Use one of the below
      body.instr || body.options || body.infile || body.data,
      // Stringify options
      true,
      // Allow or disallow functions
      allowCodeExecution
    );

    // Throw an error if there is no correct chart data
    if (instr === null && !body.svg) {
      log(
        2,
        `[validation] Request [${requestId}] - The request with ID ${requestId} from ${
          request.headers['x-forwarded-for'] || request.connection.remoteAddress
        } was incorrect:
      Content-Type: ${request.headers['content-type']}.
      Chart constructor: ${body.constr}.
      Dimensions: ${body.width}x${body.height} @ ${body.scale} scale.
      Type: ${body.type}.
      Is SVG set? ${typeof body.svg !== 'undefined'}.
      B64? ${typeof body.b64 !== 'undefined'}.
      No download? ${typeof body.noDownload !== 'undefined'}.
      Received payload is missing correct chart data for export: ${JSON.stringify(body)}.
      `
      );

      throw new ExportError(
        `[validation] Request [${requestId}] - No correct chart data found. Ensure that you are using either application/json or multipart/form-data headers. If sending JSON, make sure the chart data is in the 'infile', 'options', or 'data' attribute. If sending SVG, ensure it is in the 'svg' attribute.`,
        400
      );
    }

    // Throw an error if test of xlink:href elements from payload's SVG fails
    if (body.svg && isPrivateRangeUrlFound(body.svg)) {
      throw new ExportError(
        `[validation] Request [${requestId}] - SVG potentially contain at least one forbidden URL in 'xlink:href' element. Please review the SVG content and ensure that all referenced URLs comply with security policies.`,
        400
      );
    }

    // Get and pre-validate the options and store them in the request
    request.validatedOptions = {
      // Set the created ID as a `requestId` property in the options
      requestId,
      export: {
        instr,
        svg: body.svg,
        outfile:
          body.outfile ||
          `${request.params.filename || 'chart'}.${body.type || 'png'}`,
        type: body.type,
        constr: body.constr,
        b64: body.b64,
        noDownload: body.noDownload,
        height: body.height,
        width: body.width,
        scale: body.scale,
        globalOptions: isAllowedConfig(
          body.globalOptions,
          true,
          allowCodeExecution
        ),
        themeOptions: isAllowedConfig(
          body.themeOptions,
          true,
          allowCodeExecution
        )
      },
      customLogic: {
        allowCodeExecution,
        allowFileResources: false,
        customCode: body.customCode,
        callback: body.callback,
        resources: isAllowedConfig(body.resources, true, allowCodeExecution)
      }
    };

    // Call the next middleware
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Adds the validation middlewares to the passed express app instance.
 *
 * @param {Express} app - The Express app instance.
 */
export default function validationMiddleware(app) {
  // Add content type validation middleware
  app.post(['/', '/:filename'], contentTypeMiddleware);

  // Add request body request validation middleware
  app.post(['/', '/:filename'], requestBodyMiddleware);
}
