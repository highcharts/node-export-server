/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

class ExportError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.stackMessage = message;
  }

  setError(error) {
    this.error = error;
    if (error.name) {
      this.name = error.name;
    }
    if (error.statusCode) {
      this.statusCode = error.statusCode;
    }
    if (error.stack) {
      this.stackMessage = error.message;
      this.stack = error.stack;
    }
    return this;
  }
}

export default ExportError;
