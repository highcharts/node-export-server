/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

/**
 *
 * This template is used by puppeteer when doing exports
 * based on configurations.
 *
 */
module.exports = (chartOptions, options) => `
  var merge = Highcharts.merge;
  window.isRenderComplete = false;
  Highcharts.animObject = function () { return { duration: 0 }; };

  Highcharts.wrap(
    Highcharts.Chart.prototype,
    'init',
    function (proceed, userOptions, cb) {
      // Override userOptions with image friendly options
      userOptions = merge(userOptions, {
        chart: {
          animation: false,
          borderWidth: 0,
          forExport: true
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        caption: {
          string: ''
        },
        /*
        Expects tooltip in userOptions when forExport is true.
        https://github.com/highcharts/highcharts/blob/3ad430a353b8056b9e764aa4e5cd6828aa479db2/js/parts/Chart.js#L241
        */
        tooltip: {}
      });

      (userOptions.series || []).forEach(function (series) {
        series.animation = false;
      });

      // Add flag to know if chart render has been called.
      if (!window.onHighchartsRender) {
        window.onHighchartsRender = Highcharts.addEvent(
          this, 'render', () => { window.isRenderComplete = true; }
        );
      }

      proceed.apply(this, [userOptions, cb]);
    }
  );

  Highcharts.wrap(
    Highcharts.Series.prototype,
    'init',
    function (proceed, chart, options) {
      proceed.apply(this, [chart, options]);
    }
  );

  // Merge the globalOptions and themeOptions
  var mergedOptions = merge(
    ${JSON.stringify(options.export.themeOptions)},
    ${JSON.stringify(options.export.globalOptions)}
  );

  // Set global options
  if (mergedOptions !== {}) {
    Highcharts.setOptions(mergedOptions);
  }

  // Execute the customCode function directly before chart render
  var customCodeFunc = ${JSON.stringify(options.payload.customCode)};

  // If a correct function, call it
  if (typeof customCodeFunc === 'function') {
    customCodeFunc(${JSON.stringify(chartOptions)});
  }

  // The actual demo export
  Highcharts.chart(
    'container',
    ${JSON.stringify(chartOptions)},
    ${options.customCode.callback}
  );
`;
