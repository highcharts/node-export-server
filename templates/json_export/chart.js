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
          animation: false
        },
        exporting: {
          enabled: false
        },
        plotOptions: {
          series: {
            label: {
              enabled: false
            }
          }
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
    ${options.export.themeOptions},
    ${options.export.globalOptions}
  );

  // Set global options
  if (mergedOptions !== {}) {
    Highcharts.setOptions(mergedOptions);
  }

  // The actual demo export
  Highcharts['${options.export.constr}' || 'chart'](
    'container',
    ${options.export.strInj} || ${JSON.stringify(chartOptions)},
    ${options.customCode.callback}
  );
`;
