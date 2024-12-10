/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import ExportError from './ExportError.js';

/**
 * A custom HTTP error class that extends `ExportError`. Used to handle errors
 * with HTTP status codes.
 */
class HttpError extends ExportError {
  /**
   * Creates an instance of `HttpError`.
   *
   * @param {string} message - The error message to be displayed.
   * @param {number} statusCode - Optional HTTP status code associated
   * with the error (e.g., 400, 500).
   */
  constructor(message, statusCode) {
    super(message, statusCode);
  }

  /**
   * Sets or updates the HTTP status code for the error.
   *
   * @param {number} statusCode - The HTTP status code to assign to the error.
   *
   * @returns {HttpError} The updated instance of the `HttpError` class.
   */
  setStatus(statusCode) {
    this.statusCode = statusCode;

    return this;
  }
}

export default HttpError;
