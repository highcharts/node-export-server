/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import ExportError from './ExportError.js';

class HttpError extends ExportError {
  constructor(message, status) {
    super(message);
    this.status = this.statusCode = status;
  }

  setStatus(status) {
    this.status = status;
    return this;
  }
}

export default HttpError;
