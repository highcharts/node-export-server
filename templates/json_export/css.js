/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

module.exports = (options) => `

html, body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#table-div, #sliders, #datatable, .highcharts-description, .highcharts-caption, #controls, .ld-row {
  display:none;
  height: 0;
}

#chart-container {
  box-sizing: border-box;
  margin: 0;
  max-width: ${options.chart.width}px;
  max-height: 100vh;
  overflow: auto;
}

#chart-container > figure, div {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

#chart-container #container {
  max-width: ${options.chart.width}px;
}

`;
