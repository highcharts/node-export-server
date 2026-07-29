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
  // NOTE: Once the response has started there is no status left to set, and
  //       handing the error onwards would let Express's default handler take
  //       over, which answers 500. Ending the response is the only action here
  //       that cannot produce one.
  if (res.headersSent) {
    return res.end();
  }

  // Gather all requied information for the response
  const { statusCode: stCode, status, message, stack, errorCode } = error;
  let statusCode = stCode || status || 400;

  // NOTE: This server must never answer with a 5xx. Treat that as an absolute
  //       rule, not a preference.
  //
  //       Nothing in this codebase sets a 5xx deliberately, but the status is not
  //       always ours: setError copies statusCode up from a wrapped error, and
  //       wrapped errors include ones from outbound HTTP calls, which can carry
  //       any status a remote gave us. Clamping at the one place every error
  //       response passes through makes a 5xx structurally impossible instead of
  //       something to be careful about.
  //
  //       It is logged loudly because reaching here means an error carried a
  //       status it should not have, which is worth knowing about even though the
  //       response is safe.
  if (statusCode >= 500 || statusCode < 100) {
    logWithStack(
      1,
      error,
      `[server] An error carried the out-of-contract status ${statusCode}, answering with 400 instead. This server must never return a 5xx.`
    );

    statusCode = 400;
  }

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
