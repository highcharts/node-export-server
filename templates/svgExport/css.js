/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * The CSS to be used on the exported page.
 *
 * @returns {string} The CSS configuration.
 */
export default () => `

html, body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#table-div, #sliders, #datatable, #controls, .ld-row {
  display: none;
  height: 0;
}

#chart-container {
  box-sizing: border-box;
  margin: 0;
  overflow: auto;
  font-size: 0;
}

#chart-container > figure, div {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

`;
