/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import HttpError from './HttpError.js';

class ValidationError extends HttpError {
  constructor() {
    super(
      'The provided options are not correct. Please check if your data is of the correct types.',
      400
    );
  }
}

export default ValidationError;
