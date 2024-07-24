/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/* eslint-disable no-undef */

/**
 * Setting the animObject. Called when initing the page.
 */
export function setupHighcharts() {
  Highcharts.animObject = function () {
    return { duration: 0 };
  };
}

/**
 * Creates the actual chart.
 *
 * @param {object} chartOptions - The options for the Highcharts chart.
 * @param {object} options - The export options.
 * @param {boolean} displayErrors - A flag indicating whether to display errors.
 */
export async function triggerExport(chartOptions, options, displayErrors) {
  // Display errors flag taken from chart options nad debugger module
  window._displayErrors = displayErrors;

  // Get required functions
  const { getOptions, merge, setOptions, wrap } = Highcharts;

  // Create a separate object for a potential setOptions usages in order to
  // prevent from polluting other exports that can happen on the same page
  Highcharts.setOptionsObj = merge(false, {}, getOptions());

  // Trigger custom code
  if (options.customLogic.customCode) {
    new Function(options.customLogic.customCode)();
  }

  // By default animation is disabled
  const chart = {
    animation: false
  };

  // When straight inject, the size is set through CSS only
  if (options.export.strInj) {
    chart.height = chartOptions.chart.height;
    chart.width = chartOptions.chart.width;
  }

  // NOTE: Is this used for anything useful?
  window.isRenderComplete = false;
  wrap(Highcharts.Chart.prototype, 'init', function (proceed, userOptions, cb) {
    // Override userOptions with image friendly options
    userOptions = merge(userOptions, {
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
      /* Expects tooltip in userOptions when forExport is true.
        https://github.com/highcharts/highcharts/blob/3ad430a353b8056b9e764aa4e5cd6828aa479db2/js/parts/Chart.js#L241
        */
      tooltip: {}
    });

    (userOptions.series || []).forEach(function (series) {
      series.animation = false;
    });

    // Add flag to know if chart render has been called.
    if (!window.onHighchartsRender) {
      window.onHighchartsRender = Highcharts.addEvent(this, 'render', () => {
        window.isRenderComplete = true;
      });
    }

    proceed.apply(this, [userOptions, cb]);
  });

  wrap(Highcharts.Series.prototype, 'init', function (proceed, chart, options) {
    proceed.apply(this, [chart, options]);
  });

  // Get the user options
  const userOptions = options.export.strInj
    ? new Function(`return ${options.export.strInj}`)()
    : chartOptions;

  // Merge the globalOptions, themeOptions, options from the wrapped
  // setOptions function and user options to create the final options object
  const finalOptions = merge(
    false,
    JSON.parse(options.export.themeOptions),
    userOptions,
    // Placed it here instead in the init because of the size issues
    { chart }
  );

  const finalCallback = options.customLogic.callback
    ? new Function(`return ${options.customLogic.callback}`)()
    : undefined;

  // Set the global options if exist
  const globalOptions = JSON.parse(options.export.globalOptions);
  if (globalOptions) {
    setOptions(globalOptions);
  }

  Highcharts[options.export.constr || 'chart'](
    'container',
    finalOptions,
    finalCallback
  );

  // Get the current global options
  const defaultOptions = getOptions();

  // Clear it just in case (e.g. the setOptions was used in the customCode)
  for (const prop in defaultOptions) {
    if (typeof defaultOptions[prop] !== 'function') {
      delete defaultOptions[prop];
    }
  }

  // Set the default options back
  setOptions(Highcharts.setOptionsObj);

  // Empty the custom global options object
  Highcharts.setOptionsObj = {};
}
