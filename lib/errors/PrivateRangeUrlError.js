/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import HttpError from './HttpError.js';

class PrivateRangeUrlError extends HttpError {
  constructor() {
    super(
      "SVG potentially contain at least one forbidden URL in 'xlink:href' element. Please review the SVG content and ensure that all referenced URLs comply with security policies.",
      400
    );
  }
}

export default PrivateRangeUrlError;
