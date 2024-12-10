/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import HttpError from './HttpError.js';

/**
 * The `NoCorrectBodyError` error class that extends `HttpError`. Used to handle
 * errors related to incorrect request's body.
 */
class NoCorrectBodyError extends HttpError {
  /**
   * Creates an instance of `NoCorrectBodyError`.
   */
  constructor() {
    super(
      "The request body is required. Please ensure that your Content-Type header is correct. Accepted types are 'application/json' and 'multipart/form-data'.",
      400
    );
  }
}

export default NoCorrectBodyError;
