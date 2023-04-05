/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

module.exports = (chart) =>
  `

#chart-container {
  height: ${chart.height}px;
  max-width: ${chart.width}px;
}

#chart-container #container{
  height: ${chart.height}px;
  max-width: ${chart.width}px;
}

`.replace(/\s/g, '');
