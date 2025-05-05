/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * A custom error class for handling export-related errors. Extends the native
 * `Error` class to include additional properties like status code and stack
 * trace details.
 */
class ExportError extends Error {
  /**
   * Creates an instance of the `ExportError`.
   *
   * @param {string} message - The error message to be displayed.
   * @param {number} statusCode - Optional HTTP status code associated
   * with the error (e.g., 400, 500).
   */
  constructor(message, statusCode) {
    super();

    // Set the `message` and `stackMessage` with provided message
    this.message = message;
    this.stackMessage = message;

    // Set the `statusCode` if provided
    if (statusCode) {
      this.statusCode = statusCode;
    }
  }

  /**
   * Sets additional error details based on an existing error object.
   *
   * @param {Error} error - An error object containing details to populate
   * the `ExportError` instance.
   *
   * @returns {ExportError} The updated instance of the `ExportError` class.
   */
  setError(error) {
    // Save the provided error
    this.error = error;

    // Set the error's name if present
    if (error.name) {
      this.name = error.name;
    }

    // Set the error's status code if present
    if (error.statusCode) {
      this.statusCode = error.statusCode;
    }

    // Set the error's stack and stack's message if present
    if (error.stack) {
      this.stackMessage = error.message;
      this.stack = error.stack;
    }

    // Return updated `ExportError` instance
    return this;
  }
}

export default ExportError;
