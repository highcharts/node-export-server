/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Provides middlewares for logging errors with stack traces
 * and handling error responses in an Express application.
 */

import { getOptions } from '../../config.js';
import { logWithStack } from '../../logger.js';

/**
 * Middleware for logging errors with stack trace and handling error response.
 *
 * @function logErrorMiddleware
 *
 * @param {Error} error - The error object.
 * @param {Express.Request} _request - The Express request object.
 * @param {Express.Response} _response - The Express response object.
 * @param {Function} next - The next middleware function.
 */
function logErrorMiddleware(error, _request, _response, next) {
  // Display the error with stack in a correct format
  logWithStack(1, error);

  // Delete the stack for the environment other than the development
  if (getOptions().other.nodeEnv !== 'development') {
    delete error.stack;
  }

  // Call the `returnErrorMiddleware`
  return next(error);
}

/**
 * Middleware for returning error response.
 *
 * @function returnErrorMiddleware
 *
 * @param {Error} error - The error object.
 * @param {Express.Request} _request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} _next - The next middleware function.
 */
function returnErrorMiddleware(error, _request, response, _next) {
  // Gather all requied information for the response
  const { message, stack } = error;

  // Use the error's status code or the default 400
  const statusCode = error.statusCode || 400;

  // Set and return response
  response.status(statusCode).json({ statusCode, message, stack });
}

/**
 * Adds the two error middlewares to the passed express app instance.
 *
 * @param {Express} app - The Express app instance.
 */
export default function errorMiddleware(app) {
  // Add log error middleware
  app.use(logErrorMiddleware);

  // Add set status and return error middleware
  app.use(returnErrorMiddleware);
}
