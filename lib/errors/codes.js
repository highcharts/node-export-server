/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * Machine readable error codes, returned as the `errorCode` property of an
 * error response.
 *
 * These exist because the HTTP status code cannot carry the distinction that
 * matters most in production: a request refused because the server was busy and
 * a request refused because it was malformed are both reported as 400. Without a
 * code, a dashboard cannot separate a capacity problem from callers sending bad
 * data, and a client cannot tell whether retrying is worthwhile.
 *
 * Treat these as a stable contract - callers may branch on them.
 */
export const errorCodes = {
  // The request itself was not usable: missing body, no chart data, or content
  // that is not allowed. Retrying without changing the request will not help.
  INVALID_REQUEST: 'EXPORT_INVALID_REQUEST',

  // The server was already holding as many queued exports as it is willing to,
  // and refused this one without starting work on it. Retrying later, ideally
  // with backoff, is appropriate.
  QUEUE_FULL: 'EXPORT_QUEUE_FULL',

  // No worker became available within the acquire timeout. Same meaning for a
  // caller as QUEUE_FULL, but reached by waiting rather than by being refused
  // up front.
  ACQUIRE_TIMEOUT: 'EXPORT_ACQUIRE_TIMEOUT',

  // The chart was too large or complex to render within the allotted time.
  RASTERIZATION_TIMEOUT: 'EXPORT_RASTERIZATION_TIMEOUT',

  // The export failed for a reason that is not one of the above.
  EXPORT_FAILED: 'EXPORT_FAILED'
};

export default errorCodes;
