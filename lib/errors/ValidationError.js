/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import HttpError from './HttpError.js';

/**
 * The `ValidationError` error class that extends `HttpError`. Used to handle
 * errors related to validation of provided options.
 */
class ValidationError extends HttpError {
  /**
   * Creates an instance of `ValidationError`.
   */
  constructor() {
    super(
      'The provided options are not correct. Please check if your data is of the correct types.',
      400
    );
  }
}

export default ValidationError;
