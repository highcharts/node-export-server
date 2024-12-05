/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

class ExportError extends Error {
  /**
   * @param {string} message
   * @param {number} [status] describes the status code (400, 500, etc.)
   */
  constructor(message, status) {
    super();

    this.message = message;
    this.stackMessage = message;

    if (status) {
      this.status = status;
    }
  }

  setError(error) {
    this.error = error;

    if (error.name) {
      this.name = error.name;
    }

    if (!this.status && error.statusCode) {
      this.status = error.statusCode;
    }

    if (error.stack) {
      this.stackMessage = error.message;
      this.stack = error.stack;
    }

    return this;
  }
}

export default ExportError;
