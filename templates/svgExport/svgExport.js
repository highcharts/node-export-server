/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import cssTemplate from './css.js';

/**
 * The SVG template to use when loading SVG content to be exported.
 *
 * @param {string} svg - The SVG input content to be exported.
 *
 * @returns {string} The SVG template.
 */
export default (svg) => `
<!DOCTYPE html>
<html lang='en-US'>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Highcharts Export</title>
  </head>
  <style>
    ${cssTemplate()}
  </style>
  <body>
    <div id="chart-container">
      ${svg}
    </div>
  </body>
</html>

`;
