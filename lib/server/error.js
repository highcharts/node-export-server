/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { getOptions } from '../config.js';
import { logWithStack } from '../logger.js';

/**
 * Middleware for logging errors with stack trace and handling error response.
 *
 * @param {Error} error - The error object.
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 */
function logErrorMiddleware(error, request, response, next) {
  // Display the error with stack in a correct format
  logWithStack(1, error);

  // Delete the stack for the environment other than the development
  if (getOptions().other.nodeEnv !== 'development') {
    delete error.stack;
  }

  // Call the returnErrorMiddleware
  return next(error);
}

/**
 * Middleware for returning error response.
 *
 * @param {Error} error - The error object.
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 */
function returnErrorMiddleware(error, request, response, next) {
  // Gather all requied information for the response
  const { statusCode: stCode, status, message, stack } = error;
  const statusCode = stCode || status || 400;

  // Set and return response
  response.status(statusCode).json({ statusCode, message, stack });
}

export default (app) => {
  // Add log error middleware
  app.use(logErrorMiddleware);

  // Add set status and return error middleware
  app.use(returnErrorMiddleware);
};
