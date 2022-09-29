/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const { readFile, readFileSync } = require('fs');
const path = require('path');

const pool = require('./pool.js');
const { log } = require('./logger');
const {
  clearText,
  fixType,
  handleResources,
  isCorrectJSON,
  optionsStringify,
  roundNumber,
  toBoolean,
  wrapAround
} = require('./utils.js');

let allowCodeExecution = false;

/** Function for choosing chart's size and scale based on options prioritization
 * @module chart
 * @param options {object} - All options
 */
const findChartSize = (options) => {
  const { chart, exporting } =
    options.export?.options || isCorrectJSON(options.export?.instr);

  // See if globalOptions holds chart or exporting size
  const globalOptions = isCorrectJSON(options.export?.globalOptions);

  // Secure scale value
  let scale = roundNumber(
    options.export?.scale ||
      exporting?.scale ||
      globalOptions?.exporting?.scale ||
      options.export?.defaultScale ||
      1
  );

  if (scale > 5) {
    scale = 5;
  } else if (scale < 0.1) {
    scale = 1;
  }

  // Find chart size and scale
  return {
    height:
      options.export?.height ||
      exporting?.sourceHeight ||
      chart?.height ||
      globalOptions?.exporting?.sourceHeight ||
      globalOptions?.chart?.height ||
      options.export?.defaultHeight ||
      400,
    width:
      options.export?.width ||
      exporting?.sourceWidth ||
      chart?.width ||
      globalOptions?.exporting?.sourceWidth ||
      globalOptions?.chart?.width ||
      options.export?.defaultWidth ||
      600,
    scale
  };
};

/** Function for final options preparation before export
 * @module chart
 * @param options {object} - All options
 * @param chartJson {object} - Chart JSON
 * @param endCallback {function} - The end callback
 * @param svg {string} - SVG representation
 */
const doExport = (options, chartJson, endCallback, svg) => {
  let { export: exportOptions, customCode: customCodeOptions } = options;

  if (!customCodeOptions) {
    customCodeOptions = options.customCode = {};
  } else if (
    typeof options.customCode.resources === 'string' &&
    options.customCode.resources.endsWith('.json')
  ) {
    // Process resources
    options.customCode.resources = handleResources(
      options.customCode.resources,
      toBoolean(options.customCode.allowFileResources)
    );
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
          message: clearText(
            `The callback, resources and customCode have been disabled for this
            server.`
          )
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
  }

  exportOptions.constr = exportOptions.constr || 'chart';
  exportOptions.type = fixType(exportOptions.type, exportOptions.outfile);
  if (exportOptions.type === 'svg') {
    exportOptions.width = false;
  }

  // Prepare global and theme options
  ['globalOptions', 'themeOptions'].forEach((optionsName) => {
    try {
      if (exportOptions && exportOptions[optionsName]) {
        if (
          typeof exportOptions[optionsName] === 'string' &&
          exportOptions[optionsName].endsWith('.json')
        ) {
          exportOptions[optionsName] = isCorrectJSON(
            readFileSync(
              path.join(__basedir, exportOptions[optionsName]),
              'utf8'
            ),
            true
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
      log(1, `[chart] The ${optionsName} not found.`);
    }
  });

  // Prepare customCode
  if (customCodeOptions.allowCodeExecution) {
    customCodeOptions.customCode = wrapAround(
      customCodeOptions.customCode,
      customCodeOptions.allowFileResources
    );
  }

  // Get the callback
  if (
    customCodeOptions &&
    customCodeOptions.callback &&
    customCodeOptions.callback.indexOf('{') < 0
  ) {
    // The allowFileResources is always set to false for HTTP requests to avoid
    // injecting arbitrary files from the fs
    if (customCodeOptions.allowFileResources) {
      try {
        customCodeOptions.callback = clearText(
          readFileSync(path.join(__basedir, customCodeOptions.callback), 'utf8')
        );
      } catch (error) {
        log(2, `[chart] Error loading callback: ${error}.`);
        customCodeOptions.callback = false;
      }
    } else {
      customCodeOptions.callback = false;
    }
  }

  // Size search
  options.export = {
    ...options.export,
    ...findChartSize(options)
  };

  // Post the work to the pool
  pool
    .postWork(exportOptions.strInj || chartJson || svg, options)
    .then((result) => endCallback(result))
    .catch((error) => endCallback(false, error));
};

/** Function for straight injecting the code
 * @module chart
 * @param options {object} - All options
 * @param endCallback {function} - The function to call when exporting is done
 *
 * Dangerous and must be used deliberately by someone who sets up a server
 * (see  --allowCodeExecution)
 */
const doStraightInject = (options, endCallback) => {
  try {
    let strInj;
    let instr = options.export.instr || options.export.options;

    if (typeof instr !== 'string') {
      // Try to stringify options
      strInj = instr = optionsStringify(
        instr,
        options.customCode?.allowCodeExecution
      );
    }
    strInj = instr.replaceAll(/\t|\n|\r/g, '').trim();

    // Get rid of the ;
    if (strInj[strInj.length - 1] === ';') {
      strInj = strInj.substring(0, strInj.length - 1);
    }

    // Save as stright inject string
    options.export.strInj = strInj;
    return doExport(options, false, endCallback);
  } catch (error) {
    log(
      1,
      clearText(
        `[chart] Malformed input detected for ${
          exportOptions.requestId || '???'
        } input was ${JSON.stringify(exportOptions, undefined, '  ')}.`
      )
    );

    return (
      endCallback &&
      endCallback(
        false,
        JSON.stringify({
          error: true,
          message: clearText(
            `Malformed input: Please make sure that your JSON/JavaScript options
            are sent using the "options" attribute, and that if you're using
            SVG, it is unescaped.`
          )
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
  const { allowCodeExecution, allowForceInject } = options.customCode;

  // Check if it is SVG
  if (
    stringToExport.indexOf('<svg') >= 0 ||
    stringToExport.indexOf('<?xml') >= 0
  ) {
    log(4, '[chart] Parsing input as SVG.');
    return doExport(options, false, endCallback, stringToExport);
  }

  // Perform a direct inject when forced
  if (toBoolean(allowForceInject)) {
    return doStraightInject(options, endCallback);
  }

  try {
    // Try to parse to JSON and call the doExport function
    const chartJSON = JSON.parse(stringToExport.replaceAll(/\t|\n|\r/g, ' '));

    // If a correct JSON, do the export
    return doExport(options, chartJSON, endCallback);
  } catch (error) {
    // Not a valid JSON
    if (toBoolean(allowCodeExecution)) {
      return doStraightInject(options, endCallback);
    } else {
      // Do not allow straight injection without the allowCodeExecution flag
      return (
        endCallback &&
        endCallback(false, {
          error: true,
          message: clearText(
            `Only JSON configurations and SVG is allowed for this server. If
            this is your server, JavaScript exporting can be enabled by starting
            the server with the --allowCodeExecution flag.`
          )
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
    log(4, '[chart] Starting exporting process.');

    // Get the export options
    const exportOptions = options.export;

    // If SVG is an input (argument can be sent only by the request)
    if (options.payload?.svg && options.payload.svg !== '') {
      return exportAsString(options.payload.svg.trim(), options, endCallback);
    }

    // Export using options from the file
    if (exportOptions.infile && exportOptions.infile.length) {
      log(4, '[chart] Attempting to export from an input file.');

      // Try to read the file
      return readFile(exportOptions.infile, 'utf8', (error, infile) => {
        if (error) {
          return log(1, `[chart] Error loading input file: ${error}.`);
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
    if (
      (exportOptions.instr && exportOptions.instr !== '') ||
      (exportOptions.options && exportOptions.options !== '')
    ) {
      log(4, '[chart] Attempting to export from a raw input.');

      // Perform a direct inject when forced
      if (toBoolean(options.customCode?.allowCodeExecution)) {
        return doStraightInject(options, endCallback);
      }

      // Either try to parse to JSON first or do the direct export
      return typeof exportOptions.instr === 'string'
        ? exportAsString(exportOptions.instr.trim(), options, endCallback)
        : doExport(
            options,
            exportOptions.instr || exportOptions.options,
            endCallback
          );
    }

    // No input specified, pass an error message to the callback
    log(
      1,
      clearText(
        `[chart] No input specified.
        ${JSON.stringify(exportOptions, undefined, '  ')}.`
      )
    );

    return (
      endCallback &&
      endCallback(false, {
        error: true,
        message: 'No input specified.'
      })
    );
  },
  getAllowCodeExecution: () => allowCodeExecution,
  setAllowCodeExecution: (value) => {
    allowCodeExecution = toBoolean(value);
  },
  findChartSize
};
