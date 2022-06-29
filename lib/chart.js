/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format
const { readFile, readFileSync } = require('fs');
const path = require('path');

const pool = require('./pool.js');
const { log } = require('./logger');
const { fixType, isCorrectJSON, toBoolean, wrapAround } = require('./utils.js');

let allowCodeExecution = false;

const doExport = (options, chartJson, endCallback, svg) => {
  let { export: exportOptions, customCode: customCodeOptions } = options;

  if (!customCodeOptions) {
    customCodeOptions = options.customCode = {};
  }

  // If the allowCodeExecution flag isn't set, we should refuse the usage
  // of callback, resources, and custom code. Additionally, the worker will
  // refuse to run arbitrary JavaScript.
  if (!allowCodeExecution && customCodeOptions) {
    if (
      customCodeOptions.callback ||
      customCodeOptions.resources ||
      customCodeOptions.customCode
    ) {
      // Send back a friendly message saying that the exporter does not support
      // these settings.
      return (
        endCallback &&
        endCallback(false, {
          error: true,
          message:
            'The callback, resources and customCode have been disabled for this server.'
        })
      );
    }

    // Reset all additional custom code
    customCodeOptions.callback = false;
    customCodeOptions.resources = false;
    customCodeOptions.customCode = false;
  }

  // Clean properties to keep it lean and mean
  if (chartJson) {
    chartJson.chart = chartJson.chart || {};
    chartJson.exporting = chartJson.exporting || {};
    chartJson.exporting.enabled = false;

    if (chartJson.exporting.sourceWidth) {
      chartJson.chart.width = chartJson.exporting.sourceWidth;
    }

    if (chartJson.exporting.sourceHeight) {
      chartJson.chart.height = chartJson.exporting.sourceHeight;
    }

    if (!chartJson.chart.width) {
      chartJson.chart.width = exportOptions.width || 600;
    }

    if (!chartJson.chart.height) {
      chartJson.chart.height = exportOptions.height || 400;
    }
  }

  exportOptions.type = fixType(exportOptions.type, exportOptions.outfile);
  if (exportOptions.type === 'svg') {
    exportOptions.width = false;
  }

  if (exportOptions.scale && parseInt(exportOptions.scale, 10) > 5) {
    exportOptions.scale = 5;
  }

  if (exportOptions.scale && parseInt(exportOptions.scale, 10) < 1) {
    exportOptions.scale = 1;
  }

  // Prepare global and theme options
  ['globalOptions', 'themeOptions'].forEach((optionsName) => {
    try {
      if (exportOptions && exportOptions[optionsName]) {
        if (exportOptions[optionsName].endsWith('.json')) {
          exportOptions[optionsName] = isCorrectJSON(
            readFileSync(
              path.join(__basedir, exportOptions[optionsName]),
              'utf8'
            )
          );
        } else {
          exportOptions[optionsName] = isCorrectJSON(
            exportOptions[optionsName],
            true
          );
        }
      }
    } catch (error) {
      exportOptions[optionsName] = {};
      log(1, `[chart] - The ${optionsName} not found.`);
    }
  });

  // Prepare customCode
  customCodeOptions.customCode = wrapAround(customCodeOptions.customCode);

  const executeExport = () => {
    // Post the work to the pool
    pool
      .postWork(exportOptions.strInj || chartJson || svg, options)
      .then((result) => endCallback(result))
      .catch((error) => endCallback(false, error));
  };

  // This is kind of hacky, but looking for braces is a good way of knowing
  // if this is a file or not without having to waste time stating.
  // 'Cause no one uses curly braces in filename, right? ...right?
  // One interesting thing here is that this is a huge security issue
  // if this is a file and the options are coming from the http server
  // since it's possible to inject random files from the filesystem with it.
  // It *should* just cause a crash though.
  //
  // UPDATE: Added allowFileResources which is always set to false for HTTP
  // requests to avoid injecting arbitrary files from the fs.
  if (
    customCodeOptions &&
    customCodeOptions.allowFileResources &&
    customCodeOptions.callback &&
    customCodeOptions.callback.indexOf('{') < 0
  ) {
    readFile(
      path.join(__basedir, customCodeOptions.callback),
      (error, data) => {
        if (error) {
          log(2, `[chart] - Error loading callback: ${error}.`);
          return (
            endCallback &&
            endCallback(
              false,
              'Error loading callback script. Check the file path.'
            )
          );
        }
        customCodeOptions.callback = data.toString();
        executeExport();
      }
    );
  } else {
    executeExport();
  }
};

const doStraightInject = (options, endCallback) => {
  const exportOptions = options.export;

  // This is not cool, but there are some crazy edge cases that make it hard
  // to parse it. People have a tendency of passing straight JavaScript in here,
  // with full comments and other things.
  if (typeof exportOptions.instr !== 'undefined') {
    exportOptions.strInj = exportOptions.instr.replace(/\t/g, '').trim();

    // Get rid of the ;
    if (exportOptions.strInj[exportOptions.strInj.length - 1] === ';') {
      exportOptions.strInj = exportOptions.strInj.substring(
        0,
        exportOptions.strInj.length - 1
      );
    }

    return doExport(options, false, endCallback);
  } else {
    log(
      1,
      '[chart] - Malformed input detected for',
      exportOptions.requestId || '???',
      'input was',
      JSON.stringify(exportOptions, undefined, '  '),
      '.'
    );

    const message =
      'Malformed input: Please make sure that your ' +
      'JSON/JavaScript options are sent using the "options" attribute, and that' +
      " if you're using SVG it's unescaped.";

    return (
      endCallback &&
      endCallback(
        false,
        JSON.stringify({
          error: true,
          message
        })
      )
    );
  }
};

/** Prepare input before exporting
 * @module chart
 * @param stringToExport {string} - String representation of SVG/export options
 * @param options {object} - All options
 * @param endCallback {function} - The function to call when exporting is done
 */
const exportAsString = (stringToExport, options, endCallback) => {
  const exportOptions = options.export;

  // Check if it is SVG
  if (
    stringToExport.indexOf('<svg') >= 0 ||
    stringToExport.indexOf('<?xml') >= 0
  ) {
    log(4, '[chart] - Parsing input as SVG.');
    return doExport(options, false, endCallback, stringToExport);
  }

  // Perform a direct inject when forced
  if (exportOptions.allowForceInject) {
    return doStraightInject(options, endCallback);
  }

  // Try to parse to JSON and call the doExport function
  try {
    const chartJSON = JSON.parse(
      stringToExport.replace(/\t/g, ' ').replace(/\n/g, '').replace(/\r/g, '')
    );

    // Do the export
    return doExport(options, chartJSON, endCallback);
  } catch (error) {
    // Not a valid JSON
    if (allowCodeExecution) {
      return doStraightInject(options, endCallback);
    } else {
      // Do not allow straight injection without the allowCodeExecution flag
      return (
        endCallback &&
        endCallback(false, {
          error: true,
          message: `Only JSON configurations and SVG is allowed for this server. If this is your server, JavaScript exporting can be enabled by starting the server with the --allowCodeExecution flag.`
        })
      );
    }
  }
};

/** Start an exporting process
 * @module chart
 * @param options {object} - All options
 * @param endCallback {function} - The function to call when exporting is done
 */
module.exports = {
  startExport: async (options, endCallback) => {
    // Starting exporting process message
    log(4, '[chart] - Starting exporting process.');

    // Get the export options
    const exportOptions = options.export;

    // If SVG is an input (argument can be sent only by the request)
    if (options.payload && options.payload.svg && options.payload.svg !== '') {
      return exportAsString(options.payload.svg.trim(), options, endCallback);
    }

    // Export using options from the file
    if (exportOptions.infile && exportOptions.infile.length) {
      log(4, '[chart] - Attempting to export from an input file.');

      // Try to read the file
      return readFile(exportOptions.infile, 'utf8', (error, infile) => {
        if (error) {
          return log(0, `[chart] - Error loading input file:${error}.`);
        }

        // Get the string representation
        options.export.instr = infile;
        return exportAsString(
          options.export.instr.trim(),
          options,
          endCallback
        );
      });
    }

    // Export with options from the raw representation
    if (exportOptions.instr && exportOptions.instr !== '') {
      log(4, '[chart] - Attempting to export from a raw input.');

      // Perform a direct inject when forced
      if (exportOptions.allowForceInject) {
        return doStraightInject(options, endCallback);
      }

      // Either try to parse to JSON first or do the direct export
      return typeof exportOptions.instr === 'string'
        ? exportAsString(exportOptions.instr.trim(), options, endCallback)
        : doExport(options, exportOptions.instr, endCallback);
    }

    // No input specified, pass an error message to the callback
    log(
      1,
      '[chart] - No input specified.',
      JSON.stringify(exportOptions, undefined, '  '),
      '.'
    );

    return endCallback && endCallback(false, 'No input specified.');
  },
  setAllowCodeExecution: (value) => {
    allowCodeExecution = toBoolean(value);
  }
};
