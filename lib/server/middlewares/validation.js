/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Defines middleware functions for validating incoming HTTP requests
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
import { log } from '../../logger.js';
import {
  fixConstr,
  fixType,
  isCorrectJSON,
  isObjectEmpty,
  isPrivateRangeUrlFound
} from '../../utils.js';

import HttpError from '../../errors/HttpError.js';
import NoCorrectBodyError from '../../errors/NoCorrectBodyError.js';
import NoCorrectChartDataError from '../../errors/NoCorrectChartDataError.js';
import PrivateRangeUrlError from '../../errors/PrivateRangeUrlError.js';

/**
 * Middleware for validating the content-type header.
 *
 * @function contentTypeMiddleware
 *
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} _response - The Express response object.
 * @param {Function} next - The next middleware function.
 *
 * @throws {HttpError} Throws an `HttpError` if the content-type
 * is not correct.
 */
function contentTypeMiddleware(request, _response, next) {
  // Get the content type header
  const contentType = request.headers['content-type'] || '';

  // Allow only JSON, URL-encoded and form data without files types of data
  if (
    !contentType.includes('application/json') &&
    !contentType.includes('application/x-www-form-urlencoded') &&
    !contentType.includes('multipart/form-data')
  ) {
    throw new HttpError(
      'Content-Type must be application/json, application/x-www-form-urlencoded, or multipart/form-data.',
      415
    );
  }
  return next();
}

/**
 * Middleware for validating the request body.
 *
 * @function requestBodyMiddleware
 *
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} _response - The Express response object.
 * @param {Function} next - The next middleware function.
 *
 * @throws {NoCorrectBodyError} Throws an `NoCorrectBodyError` if the body
 * is not correct.
 * @throws {NoCorrectChartDataError} Throws an `NoCorrectChartDataError`
 * if the chart data from the body is not correct.
 * @throws {PrivateRangeUrlError} Throws an `PrivateRangeUrlError` in case
 * of the private range url error.
 * @throws {ValidationError} Throws an `ValidationError` in case of the body
 * validation error.
 */
function requestBodyMiddleware(request, _response, next) {
  // Get the request body
  const body = request.body;

  // Create a unique ID for a request
  const requestId = uuid().replace(/-/g, '');

  // Throw 'NoCorrectBodyError' if there is no correct body
  if (!body || isObjectEmpty(body)) {
    log(
      2,
      `The request with ID ${requestId} from ${
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

  // Throw 'NoCorrectChartDataError' if there is no correct chart data
  if (instr === null && !body.svg) {
    log(
      2,
      `The request with ID ${requestId} from ${
        request.headers['x-forwarded-for'] || request.connection.remoteAddress
      } was incorrect. Received payload is missing correct chart data for export: ${JSON.stringify(body)}.`
    );
    throw new NoCorrectChartDataError();
  }

  // Test xlink:href elements from payload's SVG
  if (body.svg && isPrivateRangeUrlFound(body.svg)) {
    throw PrivateRangeUrlError();
  }

  // Get options from the body and store parsed structure in the request
  request.validatedOptions = {
    export: {
      instr,
      svg: body.svg,
      outfile:
        body.outfile ||
        `${request.params.filename || 'chart'}.${fixType(body.type)}`,
      type: fixType(body.type),
      constr: fixConstr(body.constr),
      b64: body.b64,
      noDownload: body.noDownload,
      height: body.height,
      width: body.width,
      scale: body.scale,
      globalOptions: isCorrectJSON(
        body.globalOptions,
        true,
        allowCodeExecution
      ),
      themeOptions: isCorrectJSON(body.themeOptions, true, allowCodeExecution)
    },
    customLogic: {
      allowCodeExecution,
      allowFileResources: false,
      customCode: body.customCode,
      callback: body.callback,
      resources: isCorrectJSON(body.resources, true, allowCodeExecution)
    },
    payload: {
      requestId
    }
  };

  return next();
}

/**
 * Adds the two validation middlewares to the passed express app instance.
 *
 * @param {Express} app - The Express app instance.
 */
export default function validationMiddleware(app) {
  // Add content type validation middleware
  app.post(['/', '/:filename'], contentTypeMiddleware);

  // Add request body request validation middleware
  app.post(['/', '/:filename'], requestBodyMiddleware);
}
