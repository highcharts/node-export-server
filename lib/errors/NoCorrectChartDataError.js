/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import HttpError from './HttpError.js';

/**
 * The `NoCorrectChartDataError` error class that extends `HttpError`. Used
 * to handle errors related to incorrect chart's data.
 */
class NoCorrectChartDataError extends HttpError {
  /**
   * Creates an instance of `NoCorrectChartDataError`.
   */
  constructor() {
    super(
      "No correct chart data found. Ensure that you are using either application/json or multipart/form-data headers. If sending JSON, make sure the chart data is in the 'infile', 'options', or 'data' attribute. If sending SVG, ensure it is in the 'svg' attribute.",
      400
    );
  }
}

export default NoCorrectChartDataError;
