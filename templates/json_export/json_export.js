/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const cssTemplate = require('./css.js');
const jsTemplate = require('./chart.js');

/**
 * This template is used when doing config based exports.
 * @TODO: Add option to use CDN
 */
module.exports = (chartOptions, options, hcSources) => `
<!DOCTYPE html>
<html lang='en-US'>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Highcarts Export</title>

    <style>${cssTemplate(chartOptions)}</style>

    <script>
      ${hcSources}
    </script>

  </head>
  <body>
    <div id="chart-container">
      <div id="container"></div>
    </div>

    <script>
      ${jsTemplate(chartOptions, options)}
    </script>
  </body>
</html>

`;
