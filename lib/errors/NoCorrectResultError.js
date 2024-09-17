/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import HttpError from './HttpError.js';

class NoCorrectResultError extends HttpError {
  constructor() {
    super(
      'Unexpected return of the export result from the chart generation. Please check your request data.',
      400
    );
  }
}

export default NoCorrectResultError;
