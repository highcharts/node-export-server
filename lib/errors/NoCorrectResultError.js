/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import HttpError from './HttpError.js';

/**
 * The `NoCorrectResultError` error class that extends `HttpError`. Used
 * to handle errors related to unexpected return of the export result.
 */
class NoCorrectResultError extends HttpError {
  /**
   * Creates an instance of `NoCorrectResultError`.
   */
  constructor() {
    super(
      'Unexpected return of the export result from the chart generation. Please check your request data.',
      400
    );
  }
}

export default NoCorrectResultError;
