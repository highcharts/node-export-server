/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { v4 as uuid } from 'uuid';

import { getAllowCodeExecution } from '../chart.js';
import { log, logZodIssues } from '../logger.js';
import {
  fixConstr,
  fixType,
  isCorrectJSON,
  isObjectEmpty,
  isPrivateRangeUrlFound
} from '../utils.js';
import { looseValidate } from '../validate.js';

import HttpError from '../errors/HttpError.js';
import NoCorrectBodyError from '../errors/NoCorrectBodyError.js';
import NoCorrectChartDataError from '../errors/NoCorrectChartDataError.js';
import PrivateRangeUrlError from '../errors/PrivateRangeUrlError.js';
import ValidationError from '../errors/ValidationError.js';

/**
 * Middleware for validating the content-type header.
 *
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 */
function contentTypeMiddleware(request, response, next) {
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
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 */
function requestBodyMiddleware(request, response, next) {
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

  try {
    // Validate options from the body and store parsed structure in the request
    request.validatedOptions = looseValidate({
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
    });
  } catch (error) {
    logZodIssues(1, error.issues, '[config] Request options validation error');
    throw new ValidationError();
  }
  return next();
}

export default (app) => {
  // Add content type validation middleware
  app.post(['/', '/:filename'], contentTypeMiddleware);

  // Add request body request validation middleware
  app.post(['/', '/:filename'], requestBodyMiddleware);
};
