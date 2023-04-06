/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import cssTemplate from './css.js';

export default (chart) => `
<!DOCTYPE html>
<html lang='en-US'>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Highcarts Export</title>
  </head>
  <style>
    ${cssTemplate()}
  </style>
  <body>
    <div id="chart-container">
      ${chart}
    </div>
  </body>
</html>

`;
