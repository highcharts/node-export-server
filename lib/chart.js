/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { readFileSync, writeFileSync } from 'fs';

import { getOptions, initExportSettings } from './config.js';
import { log, logWithStack } from './logger.js';
import { killPool, postWork, stats } from './pool.js';
import {
  fixType,
  handleResources,
  isCorrectJSON,
  optionsStringify,
  roundNumber,
  toBoolean,
  wrapAround
} from './utils.js';
import { sanitize } from './sanitize.js';
import ExportError from './errors/ExportError.js';

let allowCodeExecution = false;

/**
 * Starts an export process. The `settings` contains final options gathered
 * from all possible sources (config, env, cli, json). The `endCallback` is
 * called when the export is completed, with an error object as the first
 * argument and the second containing the base64 respresentation of a chart.
 *
 * @param {Object} settings - The settings object containing export
 * configuration.
 * @param {function} endCallback - The callback function to be invoked upon
 * finalizing work or upon error occurance of the exporting process.
 *
 * @returns {void} This function does not return a value directly; instead,
 * it communicates results via the endCallback.
 */
export const startExport = async (settings, endCallback) => {
  // Starting exporting process message
  log(4, '[chart] Starting the exporting process.');

  // Initialize options
  const options = initExportSettings(settings, getOptions());

  // Get the export options
  const exportOptions = options.export;

  // If SVG is an input (argument can be sent only by the request)
  if (options.payload?.svg && options.payload.svg !== '') {
    try {
      log(4, '[chart] Attempting to export from a SVG input.');

      const result = exportAsString(
        sanitize(options.payload.svg), // #209
        options,
        endCallback
      );

      ++stats.exportFromSvgAttempts;
      return result;
    } catch (error) {
      return endCallback(
        new ExportError('[chart] Error loading SVG input.').setError(error)
      );
    }
  }

  // Export using options from the file
  if (exportOptions.infile && exportOptions.infile.length) {
    // Try to read the file to get the string representation
    try {
      log(4, '[chart] Attempting to export from an input file.');
      options.export.instr = readFileSync(exportOptions.infile, 'utf8');
      return exportAsString(options.export.instr.trim(), options, endCallback);
    } catch (error) {
      return endCallback(
        new ExportError('[chart] Error loading input file.').setError(error)
      );
    }
  }

  // Export with options from the raw representation
  if (
    (exportOptions.instr && exportOptions.instr !== '') ||
    (exportOptions.options && exportOptions.options !== '')
  ) {
    try {
      log(4, '[chart] Attempting to export from a raw input.');

      // Perform a direct inject when forced
      if (toBoolean(options.customLogic?.allowCodeExecution)) {
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
    } catch (error) {
      return endCallback(
        new ExportError('[chart] Error loading raw input.').setError(error)
      );
    }
  }

  // No input specified, pass an error message to the callback
  return endCallback(
    new ExportError(
      `[chart] No valid input specified. Check if at least one of the following parameters is correctly set: 'infile', 'instr', 'options', or 'svg'.`
    )
  );
};

/**
 * Starts a batch export process for multiple charts based on the information
 * in the batch option. The batch is a string in the following format:
 * "infile1.json=outfile1.png;infile2.json=outfile2.png;..."
 *
 * @param {Object} options - The options object containing configuration for
 * a batch export.
 *
 * @returns {Promise<void>} A Promise that resolves once the batch export
 * process is completed.
 *
 * @throws {ExportError} Throws an ExportError if an error occurs during
 * any of the batch export process.
 */
export const batchExport = async (options) => {
  const batchFunctions = [];

  // Split and pair the --batch arguments
  for (let pair of options.export.batch.split(';')) {
    pair = pair.split('=');
    if (pair.length === 2) {
      batchFunctions.push(
        startExport(
          {
            ...options,
            export: {
              ...options.export,
              infile: pair[0],
              outfile: pair[1]
            }
          },
          (error, info) => {
            // Throw an error
            if (error) {
              throw error;
            }

            // Save the base64 from a buffer to a correct image file
            writeFileSync(
              info.options.export.outfile,
              info.options.export.type !== 'svg'
                ? Buffer.from(info.result, 'base64')
                : info.result
            );
          }
        )
      );
    }
  }

  try {
    // Await all exports are done
    await Promise.all(batchFunctions);

    // Kill pool and close browser after finishing batch export
    await killPool();
  } catch (error) {
    throw new ExportError(
      '[chart] Error encountered during batch export.'
    ).setError(error);
  }
};

/**
 * Starts a single export process based on the specified options.
 *
 * @param {Object} options - The options object containing configuration for
 * a single export.
 *
 * @returns {Promise<void>} A Promise that resolves once the single export
 * process is completed.
 *
 * @throws {ExportError} Throws an ExportError if an error occurs during
 * the single export process.
 */
export const singleExport = async (options) => {
  // Use instr or its alias, options
  options.export.instr = options.export.instr || options.export.options;

  // Perform an export
  await startExport(options, async (error, info) => {
    // Exit process when error
    if (error) {
      throw error;
    }

    const { outfile, type } = info.options.export;

    // Save the base64 from a buffer to a correct image file
    writeFileSync(
      outfile || `chart.${type}`,
      type !== 'svg' ? Buffer.from(info.result, 'base64') : info.result
    );

    // Kill pool and close browser after finishing single export
    await killPool();
  });
};

/**
 * Determines the size and scale for chart export based on the provided options.
 *
 * @param {Object} options - The options object containing configuration for
 * chart export.
 *
 * @returns {Object} An object containing the calculated height, width,
 * and scale for the chart export.
 */
export const findChartSize = (options) => {
  const { chart, exporting } =
    options.export?.options || isCorrectJSON(options.export?.instr);

  // See if globalOptions holds chart or exporting size
  const globalOptions = isCorrectJSON(options.export?.globalOptions);

  // Secure scale value
  let scale =
    options.export?.scale ||
    exporting?.scale ||
    globalOptions?.exporting?.scale ||
    options.export?.defaultScale ||
    1;

  // the scale cannot be lower than 0.1 and cannot be higher than 5.0
  scale = Math.max(0.1, Math.min(scale, 5.0));

  // we want to round the numbers like 0.23234 -> 0.23
  scale = roundNumber(scale, 2);

  // Find chart size and scale
  const size = {
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

  // Get rid of potential px and %
  for (let [param, value] of Object.entries(size)) {
    size[param] =
      typeof value === 'string' ? +value.replace(/px|%/gi, '') : value;
  }
  return size;
};

/**
 * Function for finalizing options before export.
 *
 * @param {Object} options - The options object containing configuration for
 * the export process.
 * @param {Object} chartJson - The JSON representation of the chart.
 * @param {Function} endCallback - The callback function to be called upon
 * completion or error.
 * @param {string} svg - The SVG representation of the chart.
 *
 * @returns {Promise<void>} A Promise that resolves once the export process
 * is completed.
 */
const doExport = async (options, chartJson, endCallback, svg) => {
  let { export: exportOptions, customLogic: customLogicOptions } = options;

  const allowCodeExecutionScoped =
    typeof customLogicOptions.allowCodeExecution === 'boolean'
      ? customLogicOptions.allowCodeExecution
      : allowCodeExecution;

  if (!customLogicOptions) {
    customLogicOptions = options.customLogic = {};
  } else if (allowCodeExecutionScoped) {
    if (typeof options.customLogic.resources === 'string') {
      // Process resources
      options.customLogic.resources = handleResources(
        options.customLogic.resources,
        toBoolean(options.customLogic.allowFileResources)
      );
    } else if (!options.customLogic.resources) {
      try {
        const resources = readFileSync('resources.json', 'utf8');
        options.customLogic.resources = handleResources(
          resources,
          toBoolean(options.customLogic.allowFileResources)
        );
      } catch (error) {
        logWithStack(
          2,
          error,
          `[chart] Unable to load the default resources.json file.`
        );
      }
    }
  }

  // If the allowCodeExecution flag isn't set, we should refuse the usage
  // of callback, resources, and custom code. Additionally, the worker will
  // refuse to run arbitrary JavaScript. Prioritized should be the scoped
  // option, then we should take a look at the overall pool option.
  if (!allowCodeExecutionScoped && customLogicOptions) {
    if (
      customLogicOptions.callback ||
      customLogicOptions.resources ||
      customLogicOptions.customCode
    ) {
      // Send back a friendly message saying that the exporter does not support
      // these settings.
      return endCallback(
        new ExportError(
          `[chart] The 'callback', 'resources' and 'customCode' options have been disabled for this server.`
        )
      );
    }

    // Reset all additional custom code
    customLogicOptions.callback = false;
    customLogicOptions.resources = false;
    customLogicOptions.customCode = false;
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
            readFileSync(exportOptions[optionsName], 'utf8'),
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
      logWithStack(2, error, `[chart] The '${optionsName}' cannot be loaded.`);
    }
  });

  // Prepare the customCode
  if (customLogicOptions.allowCodeExecution) {
    try {
      customLogicOptions.customCode = wrapAround(
        customLogicOptions.customCode,
        customLogicOptions.allowFileResources
      );
    } catch (error) {
      logWithStack(2, error, `[chart] The 'customCode' cannot be loaded.`);
    }
  }

  // Get the callback
  if (
    customLogicOptions &&
    customLogicOptions.callback &&
    customLogicOptions.callback?.indexOf('{') < 0
  ) {
    // The allowFileResources is always set to false for HTTP requests to avoid
    // injecting arbitrary files from the fs
    if (customLogicOptions.allowFileResources) {
      try {
        customLogicOptions.callback = readFileSync(
          customLogicOptions.callback,
          'utf8'
        );
      } catch (error) {
        customLogicOptions.callback = false;
        logWithStack(2, error, `[chart] The 'callback' cannot be loaded.`);
      }
    } else {
      customLogicOptions.callback = false;
    }
  }

  // Size search
  options.export = {
    ...options.export,
    ...findChartSize(options)
  };

  // Post the work to the pool
  try {
    const result = await postWork(
      exportOptions.strInj || chartJson || svg,
      options
    );
    return endCallback(false, result);
  } catch (error) {
    return endCallback(error);
  }
};

/**
 * Performs a direct inject of options before export. The function attempts
 * to stringify the provided options and removes unnecessary characters,
 * ensuring a clean and formatted input. The resulting string is saved as
 * a "stright inject" string in the export options. It then invokes the
 * doExport function with the updated options.
 *
 * IMPORTANT: Dangerous and must be used deliberately by someone who sets up
 * a server (see the  --allowCodeExecution option).
 *
 * @param {Object} options - The export options containing the input
 * to be injected.
 * @param {function} endCallback - The callback function to be invoked
 * at the end of the process.
 *
 * @returns {Promise} A Promise that resolves with the result of the export
 * operation or rejects with an error if any issues occur during the process.
 */
const doStraightInject = (options, endCallback) => {
  try {
    let strInj;
    let instr = options.export.instr || options.export.options;

    if (typeof instr !== 'string') {
      // Try to stringify options
      strInj = instr = optionsStringify(
        instr,
        options.customLogic?.allowCodeExecution
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
    return endCallback(
      new ExportError(
        `[chart] Malformed input detected for ${options.export?.requestId || '?'}. Please make sure that your JSON/JavaScript options are sent using the "options" attribute, and that if you're using SVG, it is unescaped.`
      ).setError(error)
    );
  }
};

/**
 * Exports a string based on the provided options and invokes an end callback.
 *
 * @param {string} stringToExport - The string content to be exported.
 * @param {Object} options - Export options, including customLogic with
 * allowCodeExecution flag.
 * @param {Function} endCallback - Callback function to be invoked at the end
 * of the export process.
 *
 * @returns {any} Result of the export process or an error if encountered.
 */
const exportAsString = (stringToExport, options, endCallback) => {
  const { allowCodeExecution } = options.customLogic;

  // Check if it is SVG
  if (
    stringToExport.indexOf('<svg') >= 0 ||
    stringToExport.indexOf('<?xml') >= 0
  ) {
    log(4, '[chart] Parsing input as SVG.');
    return doExport(options, false, endCallback, stringToExport);
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
      return endCallback(
        new ExportError(
          '[chart] Only JSON configurations and SVG are allowed for this server. If this is your server, JavaScript custom code can be enabled by starting the server with the --allowCodeExecution flag.'
        ).setError(error)
      );
    }
  }
};

/**
 * Retrieves and returns the current status of code execution permission.
 *
 * @returns {any} The value of allowCodeExecution.
 */
export const getAllowCodeExecution = () => allowCodeExecution;

/**
 * Sets the code execution permission based on the provided boolean value.
 *
 * @param {any} value - The value to be converted and assigned
 * to allowCodeExecution.
 */
export const setAllowCodeExecution = (value) => {
  allowCodeExecution = toBoolean(value);
};

export default {
  batchExport,
  singleExport,
  getAllowCodeExecution,
  setAllowCodeExecution,
  startExport,
  findChartSize
};
