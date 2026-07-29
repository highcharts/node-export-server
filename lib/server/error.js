import { envs } from '../envs.js';
import { logWithStack } from '../logger.js';

/**
 * Middleware for logging errors with stack trace and handling error response.
 *
 * @param {Error} error - The error object.
 * @param {Express.Request} req - The Express request object.
 * @param {Express.Response} res - The Express response object.
 * @param {Function} next - The next middleware function.
 */
const logErrorMiddleware = (error, req, res, next) => {
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
 * @param {Express.Request} req - The Express request object.
 * @param {Express.Response} res - The Express response object.
 * @param {Function} next - The next middleware function.
 */
const returnErrorMiddleware = (error, req, res, next) => {
  // Gather all requied information for the response
  const { statusCode: stCode, status, message, stack, errorCode } = error;
  const statusCode = stCode || status || 400;

  // Set and return response
  //
  // NOTE: The errorCode is only included when the error carries one, so that
  //       the response shape is unchanged for errors that do not. It exists
  //       because the status code alone cannot distinguish a request the server
  //       refused because it was busy from one it refused because it was
  //       malformed - both are reported as 400.
  res.status(statusCode).json({
    statusCode,
    message,
    stack,
    ...(errorCode ? { errorCode } : {})
  });
};

export default (app) => {
  // Add log error middleware
  app.use(logErrorMiddleware);

  // Add set status and return error middleware
  app.use(returnErrorMiddleware);
};
