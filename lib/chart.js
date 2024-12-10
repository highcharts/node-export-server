/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module provides functions to manage the exporting
 * of Highcharts configurations into various output formats such as images
 * and SVGs. It supports single and batch export operations and allows extensive
 * customization through options passed from configurations or APIs.
 */

import { readFileSync, writeFileSync } from 'fs';

import { getOptions } from './config.js';
import { log, logWithStack, logZodIssues } from './logger.js';
import { killPool, postWork, getPoolStats } from './pool.js';
import { sanitize } from './sanitize.js';
import {
  fixType,
  isCorrectJSON,
  optionsStringify,
  roundNumber,
  wrapAround
} from './utils.js';
import { strictValidate, validateOption } from './validation.js';

import ExportError from './errors/ExportError.js';

let allowCodeExecution = false;

/**
 * Starts an export process. The `options` object contains final options
 * gathered from all possible sources (config, custom json, env, cli).
 * The `endCallback` is called when the export is completed, with the `error`
 * object as the first argument and the `data` object as the second,
 * which contains the base64 respresentation of a chart.
 *
 * @async
 * @function startExport
 *
 * @param {Object} [options=getOptions()] - The `options` object containing
 * configuration for a custom export. The default value is the global options
 * of the export server instance.
 * @param {Function} endCallback - The callback function to be invoked upon
 * finalizing work or upon error occurance of the exporting process.
 *
 * @returns {void} This function does not return a value directly. Instead,
 * it communicates results via the `endCallback`.
 *
 * @throws {ExportError} Throws an `ExportError` if there is a problem with
 * processing input of any type.
 */
export async function startExport(options = getOptions(), endCallback) {
  // Starting exporting process message
  log(4, '[chart] Starting the exporting process.');

  // Get the export options
  const exportOptions = options.export;

  // Export using SVG as an input
  if (exportOptions.svg !== null) {
    try {
      log(4, '[chart] Attempting to export from an SVG input.');

      // Export from an SVG string
      const result = _exportAsString(
        sanitize(exportOptions.svg), // #209
        options,
        endCallback
      );

      // SVG export attempt counter
      ++getPoolStats().exportFromSvgAttempts;

      // Return SVG export result
      return result;
    } catch (error) {
      return endCallback(
        new ExportError('[chart] Error loading an SVG input.', 400).setError(
          error
        )
      );
    }
  }

  // Export using options from the file as an input
  if (exportOptions.infile !== null) {
    try {
      log(4, '[chart] Attempting to export from a file input.');

      // Try to read the file to get the string representation
      try {
        exportOptions.instr = validateOption(
          'instr',
          readFileSync(exportOptions.infile, 'utf8'),
          false
        );
      } catch (error) {
        logZodIssues(
          1,
          error.issues,
          '[config] The `infile` option validation error'
        );
        throw error;
      }

      // Export from a file options
      return _exportAsString(exportOptions.instr, options, endCallback);
    } catch (error) {
      return endCallback(
        new ExportError('[chart] Error loading a file input.', 400).setError(
          error
        )
      );
    }
  }

  // Export using options from the raw representation as an input
  if (exportOptions.instr !== null || exportOptions.options !== null) {
    // If not found, make sure that the instr gets the value from the options
    if (!exportOptions.instr && exportOptions.options) {
      exportOptions.instr = exportOptions.options;
    }

    try {
      log(4, '[chart] Attempting to export from a raw input.');

      // Perform a direct inject when forced
      if (options.customLogic.allowCodeExecution) {
        return _doStraightInject(options, endCallback);
      }

      // Export from stringified options
      if (typeof exportOptions.instr === 'string') {
        return _exportAsString(exportOptions.instr, options, endCallback);
      }

      // Export from object options
      return _prepareExport(options, endCallback, exportOptions.instr, null);
    } catch (error) {
      return endCallback(
        new ExportError('[chart] Error loading a raw input.', 400).setError(
          error
        )
      );
    }
  }

  // No input specified, pass an error message to the callback
  return endCallback(
    new ExportError(
      `[chart] No valid input specified. Check if at least one of the following parameters is correctly set: 'infile', 'instr', 'options', or 'svg'.`,
      400
    )
  );
}

/**
 * Starts a single export process based on the specified options.
 *
 * @async
 * @function singleExport
 *
 * @param {Object} [options=getOptions()] - The `options` object containing
 * configuration for a custom export. The default value is the global options
 * of the export server instance.
 *
 * @returns {Promise<void>} A Promise that resolves once the single export
 * process is completed.
 *
 * @throws {ExportError} Throws an `ExportError` if an error occurs during
 * the single export process.
 */
export async function singleExport(options = getOptions()) {
  // Use `instr` or its alias, `options`
  options.export.instr = options.export.instr || options.export.options;

  // Perform an export
  await startExport(options, async (error, data) => {
    // Exit process when error exists
    if (error) {
      throw error;
    }

    // Get the `outfile` and `type` for a chart
    const { outfile, type } = data.options.export;

    // Save the base64 from a buffer to a correct image format
    writeFileSync(
      outfile || `chart.${type}`,
      type !== 'svg' ? Buffer.from(data.result, 'base64') : data.result
    );

    // Kill pool and close browser after finishing single export
    await killPool();
  });
}

/**
 * Starts a batch export process for multiple charts based on the information
 * in the `batch` option. The `batch` is a string in the following format:
 * "infile1.json=outfile1.png;infile2.json=outfile2.png;...".
 *
 * @async
 * @function batchExport
 *
 * @param {Object} [options=getOptions()] - The `options` object containing
 * configuration for a custom export. The default value is the global options
 * of the export server instance.
 *
 * @returns {Promise<void>} A Promise that resolves once the batch export
 * process is completed.
 *
 * @throws {ExportError} Throws an `ExportError` if an error occurs during
 * any of the batch export process.
 */
export async function batchExport(options = getOptions()) {
  const batchFunctions = [];

  // Split and pair the `batch` arguments
  for (let pair of options.export.batch.split(';') || []) {
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
          (error, data) => {
            // Throw an error
            if (error) {
              throw error;
            }

            // Get the `outfile` and `type` for a chart
            const { outfile, type } = data.options.export;

            // Save the base64 from a buffer to a correct image file
            writeFileSync(
              outfile,
              type !== 'svg' ? Buffer.from(data.result, 'base64') : data.result
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
      '[chart] Error encountered during batch export.',
      400
    ).setError(error);
  }
}

/**
 * Retrieves and returns the current status of the code execution permission.
 *
 * @function getAllowCodeExecution
 *
 * @returns {boolean} The value of the global `allowCodeExecution` option.
 */
export function getAllowCodeExecution() {
  return allowCodeExecution;
}

/**
 * Sets the code execution permission based on the provided boolean value.
 *
 * @function setAllowCodeExecution
 *
 * @param {boolean} value - The value to be assigned to the global
 * `allowCodeExecution` option.
 */
export function setAllowCodeExecution(value) {
  allowCodeExecution = value;
}

/**
 * Performs a direct inject of options before export. The function attempts
 * to stringify the provided options and removes unnecessary characters,
 * ensuring a clean and formatted input. The resulting string is saved
 * as a 'stright inject' string in the export options. It then invokes
 * the `_prepareExport` function with the updated options.
 *
 * IMPORTANT: Dangerous and must be used deliberately by someone who sets
 * up a server (see the `allowCodeExecution` option).
 *
 * @function _doStraightInject
 *
 * @param {Object} options - The `options` object containing the input
 * to be injected.
 * @param {Function} endCallback - The callback function to be invoked
 * at the end of the process.
 *
 * @returns {Promise} A Promise that resolves with the result of the export
 * operation or rejects with an error if any issues occur during the process.
 */
function _doStraightInject(options, endCallback) {
  try {
    let strInj;
    let instr = options.export.instr;

    if (typeof instr !== 'string') {
      // Try to stringify options
      strInj = instr = optionsStringify(
        instr,
        options.customLogic.allowCodeExecution,
        false
      );
    }
    strInj = instr.replaceAll(/\t|\n|\r/g, '').trim();

    // Get rid of the ;
    if (strInj[strInj.length - 1] === ';') {
      strInj = strInj.substring(0, strInj.length - 1);
    }

    // Save as stright inject string
    options.export.strInj = strInj;

    // Call the `_prepareExport` function with the straight injected string
    return _prepareExport(options, endCallback, null, null);
  } catch (error) {
    return endCallback(
      new ExportError(
        (options.export?.requestId
          ? `[chart] Malformed input detected for the request: ${options.export?.requestId}. `
          : '[chart] Malformed input detected. ') +
          'Please make sure that your JSON/JavaScript options are sent using the "options" attribute, and that if you are using SVG, it is unescaped.',
        400
      ).setError(error)
    );
  }
}

/**
 * Exports a string based on the provided options and invokes the end callback.
 *
 * @function _exportAsString
 *
 * @param {string} stringToExport - The string content to be exported.
 * @param {Object} options - The `options` object containing general options
 * configuration.
 * @param {Function} endCallback - Callback function to be invoked at the end
 * of the export process.
 *
 * @returns {unknown} Result of the export process or an error if encountered.
 */
function _exportAsString(stringToExport, options, endCallback) {
  // Check if it is SVG
  if (
    stringToExport.indexOf('<svg') >= 0 ||
    stringToExport.indexOf('<?xml') >= 0
  ) {
    log(4, '[chart] Parsing input as SVG.');

    // Call the `_prepareExport` function with an SVG string
    return _prepareExport(options, endCallback, null, stringToExport);
  }

  try {
    log(4, '[chart] Parsing input from a file.');

    // Try to parse to JSON
    const chartJSON = JSON.parse(stringToExport.replaceAll(/\t|\n|\r/g, ' '));

    if (!chartJSON || typeof chartJSON !== 'object') {
      return endCallback(
        new ExportError(
          '[chart] Invalid configuration provided - the options must be an object, not a string.',
          400
        )
      );
    }

    // Call the `_prepareExport` function with a chart JSON options
    return _prepareExport(options, endCallback, chartJSON, null);
  } catch (error) {
    // If not a valid JSON, try to inject stingified version
    if (options.customLogic.allowCodeExecution) {
      return _doStraightInject(options, endCallback);
    } else {
      // Do not allow straight injection if the `allowCodeExecution` is false
      return endCallback(
        new ExportError(
          '[chart] Only JSON configurations and SVG are allowed for this server. If this is your server, JavaScript custom code can be enabled by starting the server with the `allowCodeExecution` options set to true.',
          403
        ).setError(error)
      );
    }
  }
}

/**
 * Function for finalizing options before export.
 *
 * @async
 * @function _prepareExport
 *
 * @param {Object} options - The `options` object containing configuration
 * for the export process.
 * @param {Function} endCallback - The callback function to be called upon
 * completion or error.
 * @param {Object} json - The JSON representation of the chart.
 * @param {string} svg - The SVG representation of the chart.
 *
 * @returns {Promise<void>} A Promise that resolves once the export process
 * is completed.
 */
async function _prepareExport(options, endCallback, json, svg) {
  const { export: exportOptions, customLogic: customLogicOptions } = options;

  const allowCodeExecutionScoped =
    customLogicOptions.allowCodeExecution || allowCodeExecution;

  // Prepare the custom logic (`customCode`, `callback`, `resources`) options
  try {
    _handleCustomLogic(customLogicOptions, allowCodeExecutionScoped);
  } catch (error) {
    return endCallback(error);
  }

  // Prepare the `globalOptions` and `themeOptions` options
  _handleGlobalAndTheme(
    exportOptions,
    customLogicOptions.allowFileResources,
    allowCodeExecutionScoped
  );

  // Prepare the `type` option
  exportOptions.type = fixType(exportOptions.type, exportOptions.outfile);

  // Prepare the `chart` and `exporting` properties to keep it lean and mean
  if (json) {
    json.chart = json.chart || {};
    json.exporting = json.exporting || {};
    json.exporting.enabled = false;
  }

  // Set the `width` option to null in case of exporting to an SVG
  if (exportOptions.type === 'svg') {
    exportOptions.width = null;
  }

  // Prepare the `height`, `width` and `scale` options
  options.export = {
    ...exportOptions,
    ..._findChartSize(exportOptions)
  };

  // The last strict validation of options right before exporting process
  try {
    // Validate final options
    options = strictValidate(options);
  } catch (error) {
    logZodIssues(1, error.issues, '[config] Final options validation error');
  }

  // Post the work to the pool
  try {
    const result = await postWork(exportOptions.strInj || json || svg, options);
    return endCallback(null, result);
  } catch (error) {
    return endCallback(error);
  }
}

/**
 * Calculates the `height`, `width` and `scale` for chart exports based
 * on the provided export options.
 *
 * The function prioritizes values in the following order:
 * 1. The `height`, `width`, `scale` from the `exportOptions`.
 * 2. Options from the chart configuration (`chart` and `exporting` sections).
 * 3. Options from the global options (`chart` and `exporting` sections).
 * 4. Options from the theme options (`chart` and `exporting` sections).
 * 5. The `defaultHeight`, `defaultWidth`, `defaultScale` from the
 * `exportOptions`.
 * 6. Fallback values (`height` = 400, `width` = 600, `scale` = 1).
 *
 * @function _findChartSize
 *
 * @param {Object} exportOptions - The `exportOptions` object containing
 * export configuration.
 *
 * @returns {Object} An object containing the calculated `height`, `width`
 * and `scale` values for the chart export.
 */
function _findChartSize(exportOptions) {
  // Check the `options` and `instr` for chart and exporting sections
  const { chart: optionsChart, exporting: optionsExporting } =
    exportOptions.options || isCorrectJSON(exportOptions.instr) || false;

  // Check the `globalOptions` for chart and exporting sections
  const { chart: globalOptionsChart, exporting: globalOptionsExporting } =
    isCorrectJSON(exportOptions.globalOptions) || false;

  // Check the `themeOptions` for chart and exporting sections
  const { chart: themeOptionsChart, exporting: themeOptionsExporting } =
    isCorrectJSON(exportOptions.themeOptions) || false;

  // Find the `scale` value:
  // - It cannot be lower than 0.1
  // - It cannot be higher than 5.0
  // - It must be rounded to 2 decimal places (e.g. 0.23234 -> 0.23)
  const scale = roundNumber(
    Math.max(
      0.1,
      Math.min(
        exportOptions.scale ||
          optionsExporting?.scale ||
          globalOptionsExporting?.scale ||
          themeOptionsExporting?.scale ||
          exportOptions.defaultScale ||
          1,
        5.0
      )
    ),
    2
  );

  // Find the `height` value
  const height =
    exportOptions.height ||
    optionsExporting?.sourceHeight ||
    optionsChart?.height ||
    globalOptionsExporting?.sourceHeight ||
    globalOptionsChart?.height ||
    themeOptionsExporting?.sourceHeight ||
    themeOptionsChart?.height ||
    exportOptions.defaultHeight ||
    400;

  // Find the `width` value
  const width =
    exportOptions.width ||
    optionsExporting?.sourceWidth ||
    optionsChart?.width ||
    globalOptionsExporting?.sourceWidth ||
    globalOptionsChart?.width ||
    themeOptionsExporting?.sourceWidth ||
    themeOptionsChart?.width ||
    exportOptions.defaultWidth ||
    600;

  // Gather `height`, `width` and `scale` information
  const size = { height, width, scale };

  // Get rid of potential px and %
  for (let [param, value] of Object.entries(size)) {
    size[param] =
      typeof value === 'string' ? +value.replace(/px|%/gi, '') : value;
  }

  // Return the size object
  return size;
}

/**
 * Handles the execution of custom logic options, including loading `resources`,
 * `customCode`, and `callback`. If code execution is allowed, it processes
 * the custom logic options accordingly. If code execution is not allowed,
 * it disables the usage of resources, custom code and callback.
 *
 * @function _handleCustomLogic
 *
 * @param {Object} customLogicOptions - Options containing custom logic settings
 * such as `resources`, `customCode` and `callback`.
 * @param {boolean} allowCodeExecution - A flag indicating whether code
 * execution is allowed.
 *
 * @throws {ExportError} Throws an `ExportError` if code execution
 * is not allowed but custom logic options are still provided.
 */
function _handleCustomLogic(customLogicOptions, allowCodeExecution) {
  // In case of allowing code execution
  if (allowCodeExecution) {
    // Process the `resources`
    if (typeof customLogicOptions.resources === 'string') {
      // Custom stringified resources
      customLogicOptions.resources = _handleResources(
        customLogicOptions.resources,
        customLogicOptions.allowFileResources,
        true
      );
    } else if (!customLogicOptions.resources) {
      try {
        // Load the default one
        const resources = readFileSync('resources.json', 'utf8');
        customLogicOptions.resources = _handleResources(
          resources,
          customLogicOptions.allowFileResources,
          true
        );
      } catch (error) {
        log(2, `[chart] Unable to load the default resources.json file.`);
      }
    }

    // Process the `customCode`
    try {
      // Try to load custom code and wrap around it in a self invoking function
      customLogicOptions.customCode = wrapAround(
        customLogicOptions.customCode,
        customLogicOptions.allowFileResources
      );
    } catch (error) {
      logWithStack(2, error, `[chart] The 'customCode' cannot be loaded.`);
    }

    // Process the `callback`
    if (
      customLogicOptions.callback &&
      customLogicOptions.callback.endsWith('.js')
    ) {
      // The `allowFileResources` is always set to false for HTTP requests
      // to avoid injecting arbitrary files from the fs
      if (customLogicOptions.allowFileResources) {
        try {
          customLogicOptions.callback = readFileSync(
            customLogicOptions.callback,
            'utf8'
          );
        } catch (error) {
          customLogicOptions.callback = null;
          logWithStack(2, error, `[chart] The 'callback' cannot be loaded.`);
        }
      } else {
        customLogicOptions.callback = null;
      }
    }

    // Check if there is the `customCode` present
    if ([null, undefined].includes(customLogicOptions.customCode)) {
      log(3, `[cli] No custom code found.`);
    }

    // Check if there is the `callback` present
    if ([null, undefined].includes(customLogicOptions.callback)) {
      log(3, `[cli] No callback found.`);
    }

    // Check if there is the `resources` present
    if ([null, undefined].includes(customLogicOptions.resources)) {
      log(3, `[cli] No resources found.`);
    }
  } else {
    // If the `allowCodeExecution` flag is not set, we should refuse the usage
    // of `callback`, `resources`, and `customCode`. Additionally, the worker
    // will refuse to run arbitrary JavaScript. Prioritized should be the scoped
    // option
    if (
      customLogicOptions.callback ||
      customLogicOptions.resources ||
      customLogicOptions.customCode
    ) {
      // Send a message saying that the exporter does not support these settings
      throw new ExportError(
        `[chart] The 'callback', 'resources', and 'customCode' options have been disabled for this server.`,
        403
      );
    }

    // Reset all additional custom code
    customLogicOptions.callback = null;
    customLogicOptions.resources = null;
    customLogicOptions.customCode = null;
  }
}

/**
 * Handles and validates resources for export.
 *
 * @function _handleResources
 *
 * @param {(Object|string|null)} [resources=null] - The resources to be handled.
 * Can be either a JSON object, stringified JSON, a path to a JSON file or null.
 * @param {boolean} allowFileResources - Whether to allow loading resources
 * from files.
 * @param {boolean} allowCodeExecution - Whether to allow executing arbitrary
 * JS code.
 *
 * @returns {(Object|null)} The handled resources or null if no valid resources
 * are found.
 */
function _handleResources(
  resources = null,
  allowFileResources,
  allowCodeExecution
) {
  // List of allowed sections in the resources JSON
  const allowedProps = ['js', 'css', 'files'];

  let handledResources = resources;
  let correctResources = false;

  // Try to load resources from a file
  if (allowFileResources && resources.endsWith('.json')) {
    try {
      handledResources = isCorrectJSON(
        readFileSync(resources, 'utf8'),
        false,
        allowCodeExecution
      );
    } catch {
      return null;
    }
  } else {
    // Try to get JSON
    handledResources = isCorrectJSON(resources, false, allowCodeExecution);

    // Get rid of the files section
    if (handledResources && !allowFileResources) {
      delete handledResources.files;
    }
  }

  // Filter from unnecessary properties
  for (const propName in handledResources) {
    if (!allowedProps.includes(propName)) {
      delete handledResources[propName];
    } else if (!correctResources) {
      correctResources = true;
    }
  }

  // Check if at least one of allowed properties is present
  if (!correctResources) {
    return null;
  }

  // Handle files section
  if (handledResources.files) {
    handledResources.files = handledResources.files.map((item) => item.trim());
    if (!handledResources.files || handledResources.files.length <= 0) {
      delete handledResources.files;
    }
  }

  // Return resources
  return handledResources;
}

/**
 * Handles the loading and validation of the `globalOptions` and `themeOptions`
 * in the export options. If the option is a string and references a JSON file
 * (when `allowFileResources` is true), it reads and parses the file. Otherwise,
 * it attempts to parse the string or object as JSON. If any errors occur during
 * this process, the option is set to null. If there is an error loading
 * or parsing the `globalOptions` or `themeOptions`, the error is logged
 * and the option is set to null.
 *
 * @function _handleGlobalAndTheme
 *
 * @param {Object} exportOptions - The `exportOptions` object containing
 * the `globalOptions` and `themeOptions`.
 * @param {boolean} allowFileResources - A flag indicating whether file
 * resources (e.g. the .json files) are allowed.
 * @param {boolean} allowCodeExecution - A flag indicating whether executing
 * code (e.g., within JSON or theme options) is allowed.
 */
function _handleGlobalAndTheme(
  exportOptions,
  allowFileResources,
  allowCodeExecution
) {
  // Check the `globalOptions` and `themeOptions` options
  ['globalOptions', 'themeOptions'].forEach((optionsName) => {
    try {
      // Check if the option exists
      if (exportOptions[optionsName]) {
        // Check if it is a string
        if (typeof exportOptions[optionsName] === 'string') {
          // Check if it is a file name with the .json extension
          if (
            allowFileResources &&
            exportOptions[optionsName].endsWith('.json')
          ) {
            // Check if the file content can be a JSON, and save it as a string
            exportOptions[optionsName] = isCorrectJSON(
              readFileSync(exportOptions[optionsName], 'utf8'),
              true,
              allowCodeExecution
            );
          } else {
            // Check if the value can be a JSON, and save it as a string
            exportOptions[optionsName] = isCorrectJSON(
              exportOptions[optionsName],
              true,
              allowCodeExecution
            );
          }
        } else {
          // Check if the value can be a JSON, and save it as an object
          exportOptions[optionsName] = isCorrectJSON(
            exportOptions[optionsName],
            true,
            allowCodeExecution
          );
        }
      }
    } catch (error) {
      logWithStack(2, error, `[chart] The '${optionsName}' cannot be loaded.`);

      // In case of an error, set the option with null
      exportOptions[optionsName] = null;
    }
  });
}

export default {
  startExport,
  singleExport,
  batchExport,
  getAllowCodeExecution,
  setAllowCodeExecution
};
