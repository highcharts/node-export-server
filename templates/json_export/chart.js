/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 *
 * This template is used by puppeteer when doing exports
 * based on configurations.
 *
 */
module.exports = (chartOptions, options) => `

const merge = Highcharts.merge;

// By default animation is disabled
const chart = {
  animation: false
};

// When straight inject, the size is set through CSS only
if (${options.export.strInj}) {
  chart.height = ${chartOptions.chart.height};
  chart.width = null;
}

window.isRenderComplete = false;

Highcharts.animObject = function () { return { duration: 0 }; };

Highcharts.wrap(
  Highcharts.Chart.prototype,
  'init',
  function (proceed, userOptions, cb) {
    // Override userOptions with image friendly options
    userOptions = merge(userOptions, {
      chart,
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

// Highcharts.wrap(
//   Highcharts.Series.prototype,
//   'init',
//   function (proceed, chart, options) {
//     proceed.apply(this, [chart, options]);
//   }
// );


// Merge the globalOptions and themeOptions
const mergedOptions = merge(
  ${options.export.themeOptions},
  ${options.export.globalOptions}
);

// Set global options
if (mergedOptions !== {}) {
  Highcharts.setOptions(mergedOptions);
}

Highcharts['${options.export.constr}' || 'chart'](
  'container',
  ${options.export.strInj} || ${JSON.stringify(chartOptions)},
  ${options.customCode.callback}
);

`;
