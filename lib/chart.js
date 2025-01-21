/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module provides functions to prepare for the exporting charts
 * into various image output formats such as JPEG, PNG, PDF, and SVGs.
 * It supports single and batch export operations and allows customization
 * through options passed from configurations or APIs.
 */

import { readFileSync, writeFileSync } from 'fs';

import {
  getOptions,
  isAllowedConfig,
  mergeOptions,
  validateOption,
  validateOptions
} from './config.js';
import { log, logWithStack } from './logger.js';
import { getPoolStats, killPool, postWork } from './pool.js';
import { sanitize } from './sanitize.js';
import {
  deepCopy,
  fixConstr,
  fixOutfile,
  fixType,
  getAbsolutePath,
  getBase64,
  isObject,
  roundNumber,
  wrapAround
} from './utils.js';

import ExportError from './errors/ExportError.js';

// The global flag for the code execution permission
let allowCodeExecution = false;

/**
 * Starts a single export process based on the specified options and saves
 * the resulting image to the provided output file.
 *
 * @async
 * @function singleExport
 *
 * @param {Object} options - The `options` object, which should include settings
 * from the `export` and `customLogic` sections. It can be a partial or complete
 * set of options from these sections. The object must contain at least one
 * of the following `export` properties: `infile`, `instr`, `options`, or `svg`
 * to generate a valid image.
 *
 * @returns {Promise<void>} A Promise that resolves once the single export
 * process is completed.
 *
 * @throws {ExportError} Throws an `ExportError` if an error occurs during
 * the single export process.
 */
export async function singleExport(options) {
  // Check if the export makes sense
  if (options && options.export) {
    // Validate single export options
    options = validateOptions(options);

    // Perform an export
    await startExport(
      { export: options.export, customLogic: options.customLogic },
      async (error, data) => {
        // Exit process when error exists
        if (error) {
          throw error;
        }

        // Get the `b64`, `outfile`, and `type` for a chart
        const { b64, outfile, type } = data.options.export;

        // Save the result
        try {
          if (b64) {
            // As a Base64 string to a txt file
            writeFileSync(
              `${outfile.split('.').shift() || 'chart'}.txt`,
              getBase64(data.result, type)
            );
          } else {
            // As a correct image format
            writeFileSync(
              outfile || `chart.${type}`,
              type !== 'svg' ? Buffer.from(data.result, 'base64') : data.result
            );
          }
        } catch (error) {
          throw new ExportError(
            '[chart] Error while saving a chart.',
            500
          ).setError(error);
        }

        // Kill pool and close browser after finishing single export
        await killPool();
      }
    );
  } else {
    throw new ExportError(
      '[chart] No expected `export` options were found. Please provide one of the following options: `infile`, `instr`, `options`, or `svg` to generate a valid image.',
      400
    );
  }
}

/**
 * Starts a batch export process for multiple charts based on information
 * provided in the `batch` option. The `batch` is a string in the following
 * format: "infile1.json=outfile1.png;infile2.json=outfile2.png;...". Results
 * are saved to the specified output files.
 *
 * @async
 * @function batchExport
 *
 * @param {Object} options - The `options` object, which should include settings
 * from the `export` and `customLogic` sections. It can be a partial or complete
 * set of options from these sections. It must contain the `batch` option from
 * the `export` section to generate valid images.
 *
 * @returns {Promise<void>} A Promise that resolves once the batch export
 * processes are completed.
 *
 * @throws {ExportError} Throws an `ExportError` if an error occurs during
 * any of the batch export process.
 */
export async function batchExport(options) {
  // Check if the export makes sense
  if (options && options.export && options.export.batch) {
    // Validate batch export options
    options = validateOptions(options);

    // An array for collecting batch exports
    const batchFunctions = [];

    // Split and pair the `batch` arguments
    for (let pair of options.export.batch.split(';') || []) {
      pair = pair.split('=');
      if (pair.length === 2) {
        batchFunctions.push(
          startExport(
            {
              export: {
                ...options.export,
                infile: pair[0],
                outfile: pair[1]
              },
              customLogic: options.customLogic
            },
            (error, data) => {
              // Exit process when error exists
              if (error) {
                throw error;
              }

              // Get the `b64`, `outfile`, and `type` for a chart
              const { b64, outfile, type } = data.options.export;

              // Save the result
              try {
                if (b64) {
                  // As a Base64 string to a txt file
                  writeFileSync(
                    `${outfile.split('.').shift() || 'chart'}.txt`,
                    getBase64(data.result, type)
                  );
                } else {
                  // As a correct image format
                  writeFileSync(
                    outfile,
                    type !== 'svg'
                      ? Buffer.from(data.result, 'base64')
                      : data.result
                  );
                }
              } catch (error) {
                throw new ExportError(
                  '[chart] Error while saving a chart.',
                  500
                ).setError(error);
              }
            }
          )
        );
      } else {
        log(2, '[chart] No correct pair found for the batch export.');
      }
    }

    // Await all exports are done
    const batchResults = await Promise.allSettled(batchFunctions);

    // Kill pool and close browser after finishing batch export
    await killPool();

    // Log errors if found
    batchResults.forEach((result, index) => {
      // Log the error with stack about the specific batch export
      if (result.reason) {
        logWithStack(
          1,
          result.reason,
          `[chart] Batch export number ${index + 1} could not be correctly completed.`
        );
      }
    });
  } else {
    throw new ExportError(
      '[chart] No expected `export` options were found. Please provide the `batch` option to generate valid images.',
      400
    );
  }
}

/**
 * Starts an export process. The `exportingOptions` parameter is an object that
 * should include settings from the `export` and `customLogic` sections. It can
 * be a partial or complete set of options from these sections. If partial
 * options are provided, missing values will be merged with the current global
 * options.
 *
 * The `endCallback` function is invoked upon the completion of the export,
 * either successfully or with an error. The `error` object is provided
 * as the first argument, and the `data` object is the second, containing
 * the Base64 representation of the chart in the `result` property
 * and the complete set of options in the `options` property.
 *
 * @async
 * @function startExport
 *
 * @param {Object} exportingOptions - The `exportingOptions` object, which
 * should include settings from the `export` and `customLogic` sections. It can
 * be a partial or complete set of options from these sections. If the provided
 * options are partial, missing values will be merged with the current global
 * options.
 * @param {Function} endCallback - The callback function to be invoked upon
 * finalizing the export process or upon encountering an error. The first
 * argument is the `error` object, and the second argument is the `data` object,
 * which includes the Base64 representation of the chart in the `result`
 * property and the full set of options in the `options` property.
 *
 * @returns {Promise<void>} This function does not return a value directly.
 * Instead, it communicates results via the `endCallback`.
 *
 * @throws {ExportError} Throws an `ExportError` if there is a problem with
 * processing input of any type. The error is passed into the `endCallback`
 * function and processed there.
 */
export async function startExport(exportingOptions, endCallback) {
  try {
    // Check if provided options is an object
    if (!isObject(exportingOptions)) {
      throw new ExportError(
        '[chart] Incorrect value of the provided `exportingOptions`. Needs to be an object.',
        400
      );
    }

    // Merge additional options to the copy of the instance options
    const options = mergeOptions(deepCopy(getOptions()), {
      export: exportingOptions.export,
      customLogic: exportingOptions.customLogic
    });

    // Get the `export` options
    const exportOptions = options.export;

    // Starting exporting process message
    log(4, '[chart] Starting the exporting process.');

    // Export using options from the file as an input
    if (exportOptions.infile !== null) {
      log(4, '[chart] Attempting to export from a file input.');

      let fileContent;
      try {
        // Try to read the file to get the string representation
        fileContent = readFileSync(
          getAbsolutePath(exportOptions.infile),
          'utf8'
        );
      } catch (error) {
        throw new ExportError(
          '[chart] Error loading content from a file input.',
          400
        ).setError(error);
      }

      // Check the file's extension
      if (exportOptions.infile.endsWith('.svg')) {
        // Set to the `svg` option
        exportOptions.svg = validateOption('svg', fileContent);
      } else if (exportOptions.infile.endsWith('.json')) {
        // Set to the `instr` option
        exportOptions.instr = validateOption('instr', fileContent);
      } else {
        throw new ExportError(
          '[chart] Incorrect value of the `infile` option.',
          400
        );
      }
    }

    // Export using SVG as an input
    if (exportOptions.svg !== null) {
      log(4, '[chart] Attempting to export from an SVG input.');

      // SVG exports attempts counter
      ++getPoolStats().exportsFromSvgAttempts;

      // Export from an SVG string
      const result = await _exportFromSvg(
        sanitize(exportOptions.svg), // #209
        options
      );

      // SVG exports counter
      ++getPoolStats().exportsFromSvg;

      // Pass SVG export result to the end callback
      return endCallback(null, result);
    }

    // Export using options as an input
    if (exportOptions.instr !== null || exportOptions.options !== null) {
      log(4, '[chart] Attempting to export from options input.');

      // Options exports attempts counter
      ++getPoolStats().exportsFromOptionsAttempts;

      // Export from options
      const result = await _exportFromOptions(
        exportOptions.instr || exportOptions.options,
        options
      );

      // Options exports counter
      ++getPoolStats().exportsFromOptions;

      // Pass options export result to the end callback
      return endCallback(null, result);
    }

    // No input specified, pass an error message to the callback
    return endCallback(
      new ExportError(
        `[chart] No valid input specified. Check if at least one of the following parameters is correctly set: 'infile', 'instr', 'options', or 'svg'.`,
        400
      )
    );
  } catch (error) {
    return endCallback(error);
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
 * @param {boolean} value - The boolean value to be assigned to the global
 * `allowCodeExecution` option.
 */
export function setAllowCodeExecution(value) {
  allowCodeExecution = value;
}

/**
 * Exports from an SVG based input with the provided options.
 *
 * @async
 * @function _exportFromSvg
 *
 * @param {string} inputToExport - The SVG based input to be exported.
 * @param {Object} options - The configuration object containing complete set
 * of options.
 *
 * @returns {Promise<unknown>} A Promise that resolves to a result of the export
 * process.
 *
 * @throws {ExportError} Throws an `ExportError` if there is not a correct SVG
 * input.
 */
async function _exportFromSvg(inputToExport, options) {
  // Check if it is SVG
  if (
    typeof inputToExport === 'string' &&
    (inputToExport.indexOf('<svg') >= 0 || inputToExport.indexOf('<?xml') >= 0)
  ) {
    log(4, '[chart] Parsing input as SVG.');

    // Set the export input as SVG
    options.export.svg = inputToExport;

    // Reset the rest of the export input options
    options.export.instr = null;
    options.export.options = null;

    // Call the function with an SVG string as an export input
    return _prepareExport(options);
  } else {
    throw new ExportError('[chart] Not a correct SVG input.', 400);
  }
}

/**
 * Exports from an options based input with the provided options.
 *
 * @async
 * @function _exportFromOptions
 *
 * @param {string} inputToExport - The options based input to be exported.
 * @param {Object} options - The configuration object containing complete set
 * of options.
 *
 * @returns {Promise<unknown>} A Promise that resolves to a result of the export
 * process.
 *
 * @throws {ExportError} Throws an `ExportError` if there is not a correct
 * chart options input.
 */
async function _exportFromOptions(inputToExport, options) {
  log(4, '[chart] Parsing input from options.');

  // Try to check, validate and parse to stringified options
  const stringifiedOptions = isAllowedConfig(
    inputToExport,
    true,
    options.customLogic.allowCodeExecution
  );

  // Check if a correct stringified options
  if (
    stringifiedOptions === null ||
    typeof stringifiedOptions !== 'string' ||
    !stringifiedOptions.startsWith('{') ||
    !stringifiedOptions.endsWith('}')
  ) {
    throw new ExportError(
      '[chart] Invalid configuration provided - Only options configurations and SVG are allowed for this server. If this is your server, JavaScript custom code can be enabled by starting the server with the `allowCodeExecution` options set to true.',
      403
    );
  }

  // Set the export input as a stringified chart options
  options.export.instr = stringifiedOptions;

  // Reset the rest of the export input options
  options.export.svg = null;

  // Call the function with a stringified chart options
  return _prepareExport(options);
}

/**
 * Function for finalizing options and configurations before export.
 *
 * @async
 * @function _prepareExport
 *
 * @param {Object} options - The configuration object containing complete set
 * of options.
 *
 * @returns {Promise<unknown>} A Promise that resolves to a result of the export
 * process.
 */
async function _prepareExport(options) {
  const { export: exportOptions, customLogic: customLogicOptions } = options;

  // Prepare the `type` option
  exportOptions.type = fixType(exportOptions.type, exportOptions.outfile);

  // Prepare the `outfile` option
  exportOptions.outfile = fixOutfile(exportOptions.type, exportOptions.outfile);

  // Prepare the `constr` option
  exportOptions.constr = fixConstr(exportOptions.constr);

  // Notify about the custom logic usage status
  log(
    3,
    `[chart] The custom logic is ${customLogicOptions.allowCodeExecution ? 'allowed' : 'disallowed'}.`
  );

  // Prepare the custom logic options (`customCode`, `callback`, `resources`)
  _handleCustomLogic(customLogicOptions, customLogicOptions.allowCodeExecution);

  // Prepare the `globalOptions` and `themeOptions` options
  _handleGlobalAndTheme(
    exportOptions,
    customLogicOptions.allowFileResources,
    customLogicOptions.allowCodeExecution
  );

  // Prepare the `height`, `width`, and `scale` options
  options.export = {
    ...exportOptions,
    ..._findChartSize(exportOptions)
  };

  // Post the work to the pool
  return postWork(options);
}

/**
 * Calculates the `height`, `width` and `scale` for chart exports based
 * on the provided export options.
 *
 * The function prioritizes values in the following order:
 * 1. The `height`, `width`, `scale` from the `exportOptions`.
 * 2. Options from the chart configuration (from `exporting` and `chart`).
 * 3. Options from the global options (from `exporting` and `chart`).
 * 4. Options from the theme options (from `exporting` and `chart` sections).
 * 5. Fallback default values (`height = 400`, `width = 600`, `scale = 1`).
 *
 * @function _findChartSize
 *
 * @param {Object} exportOptions - The configuration object containing `export`
 * options.
 *
 * @returns {Object} The object containing calculated `height`, `width`
 * and `scale` values for the chart export.
 */
function _findChartSize(exportOptions) {
  // Check the `options` and `instr` for chart and exporting sections
  const { chart: optionsChart, exporting: optionsExporting } =
    exportOptions.options || isAllowedConfig(exportOptions.instr) || false;

  // Check the `globalOptions` for chart and exporting sections
  const { chart: globalOptionsChart, exporting: globalOptionsExporting } =
    isAllowedConfig(exportOptions.globalOptions) || false;

  // Check the `themeOptions` for chart and exporting sections
  const { chart: themeOptionsChart, exporting: themeOptionsExporting } =
    isAllowedConfig(exportOptions.themeOptions) || false;

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

  // Gather `height`, `width` and `scale` information in one object
  const size = { height, width, scale };

  // Get rid of potential `px` and `%`
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
 * @param {Object} customLogicOptions - The configuration object containing
 * `customLogic` options.
 * @param {boolean} allowCodeExecution - A flag indicating whether code
 * execution is allowed.
 *
 * @throws {ExportError} Throws an `ExportError` if code execution
 * is not allowed but custom logic options are still provided.
 */
function _handleCustomLogic(customLogicOptions, allowCodeExecution) {
  // In case of allowing code execution
  if (allowCodeExecution) {
    // Process the `resources` option
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
        customLogicOptions.resources = _handleResources(
          readFileSync(getAbsolutePath('resources.json'), 'utf8'),
          customLogicOptions.allowFileResources,
          true
        );
      } catch (error) {
        log(2, '[chart] Unable to load the default `resources.json` file.');
      }
    }

    // Process the `customCode` option
    try {
      // Try to load custom code and wrap around it in a self invoking function
      customLogicOptions.customCode = wrapAround(
        customLogicOptions.customCode,
        customLogicOptions.allowFileResources
      );

      // Validate the option
      customLogicOptions.customCode = validateOption(
        'customCode',
        customLogicOptions.customCode
      );
    } catch (error) {
      logWithStack(2, error, '[chart] The `customCode` cannot be loaded.');

      // In case of an error, set the option with null
      customLogicOptions.customCode = null;
    }

    // Process the `callback` option
    try {
      // Try to load callback function
      customLogicOptions.callback = wrapAround(
        customLogicOptions.callback,
        customLogicOptions.allowFileResources,
        true
      );

      // Validate the option
      customLogicOptions.callback = validateOption(
        'callback',
        customLogicOptions.callback
      );
    } catch (error) {
      logWithStack(2, error, '[chart] The `callback` cannot be loaded.');

      // In case of an error, set the option with null
      customLogicOptions.callback = null;
    }

    // Check if there is the `customCode` present
    if ([null, undefined].includes(customLogicOptions.customCode)) {
      log(3, '[chart] No value for the `customCode` option found.');
    }

    // Check if there is the `callback` present
    if ([null, undefined].includes(customLogicOptions.callback)) {
      log(3, '[chart] No value for the `callback` option found.');
    }

    // Check if there is the `resources` present
    if ([null, undefined].includes(customLogicOptions.resources)) {
      log(3, '[chart] No value for the `resources` option found.');
    }
  } else {
    // If the `allowCodeExecution` flag is set to false, we should refuse
    // the usage of the `callback`, `resources`, and `customCode` options.
    // Additionally, the worker will refuse to run arbitrary JavaScript.
    if (
      customLogicOptions.callback ||
      customLogicOptions.resources ||
      customLogicOptions.customCode
    ) {
      // Reset all custom code options
      customLogicOptions.callback = null;
      customLogicOptions.resources = null;
      customLogicOptions.customCode = null;

      // Send a message saying that the exporter does not support these settings
      throw new ExportError(
        `[chart] The 'callback', 'resources', and 'customCode' options have been disabled for this server.`,
        403
      );
    }
  }
}

/**
 * Handles and validates resources from the `resources` option for export.
 *
 * @function _handleResources
 *
 * @param {(Object|string|null)} [resources=null] - The resources to be handled.
 * Can be either a JSON object, stringified JSON, a path to a JSON file,
 * or null. The default value is `null`.
 * @param {boolean} allowFileResources - A flag indicating whether loading
 * resources from files is allowed.
 * @param {boolean} allowCodeExecution - A flag indicating whether code
 * execution is allowed.
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
      handledResources = isAllowedConfig(
        readFileSync(getAbsolutePath(resources), 'utf8'),
        false,
        allowCodeExecution
      );
    } catch {
      return null;
    }
  } else {
    // Try to get JSON
    handledResources = isAllowedConfig(resources, false, allowCodeExecution);

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

  // Validate option
  handledResources = validateOption('resources', handledResources);

  // Return resources
  return handledResources;
}

/**
 * Handles the loading and validation of the `globalOptions` and `themeOptions`
 * in the export options. If the option is a string and references a JSON file
 * (when the `allowFileResources` is true), it reads and parses the file.
 * Otherwise, it attempts to parse the string or object as JSON. If any errors
 * occur during this process, the option is set to null. If there is an error
 * loading or parsing the `globalOptions` or `themeOptions`, the error is logged
 * and the option is set to null.
 *
 * @function _handleGlobalAndTheme
 *
 * @param {Object} exportOptions - The configuration object containing `export`
 * options.
 * @param {boolean} allowFileResources - A flag indicating whether loading
 * resources from files is allowed.
 * @param {boolean} allowCodeExecution - A flag indicating whether code
 * execution is allowed.
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
        // Check if it is a string and a file name with the `.json` extension
        if (
          allowFileResources &&
          typeof exportOptions[optionsName] === 'string' &&
          exportOptions[optionsName].endsWith('.json')
        ) {
          // Check if the file content can be a config, and save it as a string
          exportOptions[optionsName] = isAllowedConfig(
            readFileSync(getAbsolutePath(exportOptions[optionsName]), 'utf8'),
            true,
            allowCodeExecution
          );
        } else {
          // Check if the value can be a config, and save it as a string
          exportOptions[optionsName] = isAllowedConfig(
            exportOptions[optionsName],
            true,
            allowCodeExecution
          );
        }

        // Validate the option
        exportOptions[optionsName] = validateOption(
          optionsName,
          exportOptions[optionsName]
        );
      }
    } catch (error) {
      logWithStack(
        2,
        error,
        `[chart] The \`${optionsName}\` cannot be loaded.`
      );

      // In case of an error, set the option with null
      exportOptions[optionsName] = null;
    }
  });

  // Check if there is the `globalOptions` present
  if ([null, undefined].includes(exportOptions.globalOptions)) {
    log(3, '[chart] No value for the `globalOptions` option found.');
  }

  // Check if there is the `themeOptions` present
  if ([null, undefined].includes(exportOptions.themeOptions)) {
    log(3, '[chart] No value for the `themeOptions` option found.');
  }
}

export default {
  singleExport,
  batchExport,
  startExport,
  getAllowCodeExecution,
  setAllowCodeExecution
};
