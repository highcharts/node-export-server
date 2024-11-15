import { envs } from '../envs.js';
import { logWithStack } from '../logger.js';

/**
 * Middleware for logging errors with stack trace and handling error response.
 *
 * @param {Error} error - The error object.
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 */
const logErrorMiddleware = (error, request, response, next) => {
  // Display the error with stack in a correct format
  logWithStack(1, error);

  // Delete the stack for the environment other than the development
  if (envs.OTHER_NODE_ENV !== 'development') {
    delete error.stack;
  }

  // Call the returnErrorMiddleware
  next(error);
};

/**
 * Middleware for returning error response.
 *
 * @param {Error} error - The error object.
 * @param {Express.Request} request - The Express request object.
 * @param {Express.Response} response - The Express response object.
 * @param {Function} next - The next middleware function.
 */
const returnErrorMiddleware = (error, request, response, next) => {
  // Gather all requied information for the response
  const { message, stack } = error;

  // Use the error's status code or the default 400
  const statusCode = error.statusCode || 400;

  // Set and return response
  response.status(statusCode).json({ statusCode, message, stack });
};

export default (app) => {
  // Add log error middleware
  app.use(logErrorMiddleware);

  // Add set status and return error middleware
  app.use(returnErrorMiddleware);
};
