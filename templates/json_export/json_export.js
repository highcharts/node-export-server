/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const cssTemplate = require('./css.js');
const cssSizeTemplate = require('./css_size.js');

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
    <title>Highcharts Export</title>

    <style>${cssTemplate()}</style>

    <script>
      ${hcSources}
    </script>

  </head>
  <body>
    <div id="chart-container">
      <div id="container"></div>
    </div>

    <script>
      // Trigger custom code
      if (${options.customCode.customCode}) {
        (${options.customCode.customCode})();
      }

      // When straight inject, the size is set through CSS only
      if (${options.export.strInj}) {
        const style = document.createElement('style');
        style.textContent = '${cssSizeTemplate(chartOptions.chart)}';
        document.head.appendChild(style);
      }

      ${jsTemplate(chartOptions, options)}
    </script>
  </body>
</html>

`;
