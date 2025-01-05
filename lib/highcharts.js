/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Provides methods for initializing Highcharts with customized
 * animation settings and triggering the creation of Highcharts charts with
 * export-specific configurations in the page context. Supports dynamic option
 * merging, custom logic injection, and control over rendering behaviors. Used
 * by the Puppeteer page.
 */

/* eslint-disable no-undef */

/**
 * Setting the `Highcharts.animObject` function. Called when initing the page.
 *
 * @function setupHighcharts
 */
export function setupHighcharts() {
  Highcharts.animObject = function () {
    return { duration: 0 };
  };
}

/**
 * Creates the actual Highcharts chart on a page.
 *
 * @async
 * @function createChart
 *
 * @param {Object} options - The `options` object containing complete set
 * of options.
 */
export async function createChart(options) {
  // Get required functions
  const { getOptions, merge, setOptions, wrap } = Highcharts;

  // Create a separate object for a potential `setOptions` usages in order
  // to prevent from polluting other exports that can happen on the same page
  Highcharts.setOptionsObj = merge(false, {}, getOptions());

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

  // Some mandatory additional `chart` and `exporting` options
  const additionalOptions = {
    chart: {
      // By default animation is disabled
      animation: false,
      // Get the right size values
      height: options.export.height,
      width: options.export.width
    },
    exporting: {
      // No need for the exporting button
      enabled: false
    }
  };

  // Get the input to export from the `instr` option
  const userOptions = new Function(`return ${options.export.instr}`)();

  // Get the `themeOptions` option
  const themeOptions = new Function(`return ${options.export.themeOptions}`)();

  // Get the `globalOptions` option
  const globalOptions = new Function(
    `return ${options.export.globalOptions}`
  )();

  // Merge the following options objects to create final options
  const finalOptions = merge(
    false,
    themeOptions,
    userOptions,
    // Placed it here instead in the init because of the size issues
    additionalOptions
  );

  // Prepare the `callback` option
  const finalCallback = options.customLogic.callback
    ? new Function(`return ${options.customLogic.callback}`)()
    : null;

  // Trigger the `customCode` option
  if (options.customLogic.customCode) {
    new Function('options', options.customLogic.customCode)(userOptions);
  }

  // Set the global options if exist
  if (globalOptions) {
    setOptions(globalOptions);
  }

  // Call the chart creation
  Highcharts[options.export.constr]('container', finalOptions, finalCallback);

  // Get the current global options
  const defaultOptions = getOptions();

  // Clear it just in case (e.g. the `setOptions` was used in the `customCode`)
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

export default {
  setupHighcharts,
  createChart
};
