/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module provides functions that prepare for the exporting
 * charts into various image output formats such as JPEG, PNG, PDF, and SVGs.
 * It supports single and batch export operations and allows customization
 * through options passed from configurations or APIs.
 */

import { readFileSync, writeFileSync } from 'fs';

import { isAllowedConfig, updateOptions } from './config.js';
import { log, logWithStack } from './logger.js';
import { getPoolStats, killPool, postWork } from './pool.js';
import { sanitize } from './sanitize.js';
import { getAbsolutePath, getBase64, isObject, roundNumber } from './utils.js';

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
 * Starts an export process. The `imageOptions` parameter is an object that
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
 * @param {Object} imageOptions - The `imageOptions` object, which should
 * include settings from the `export` and `customLogic` sections. It can
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
export async function startExport(imageOptions, endCallback) {
  try {
    // Check if provided options are in an object
    if (!isObject(imageOptions)) {
      throw new ExportError(
        '[chart] Incorrect value of the provided `imageOptions`. Needs to be an object.',
        400
      );
    }

    // Merge additional options to the copy of the instance options
    const options = updateOptions(
      {
        export: imageOptions.export,
        customLogic: imageOptions.customLogic
      },
      true
    );

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
        exportOptions.svg = fileContent;
      } else if (exportOptions.infile.endsWith('.json')) {
        // Set to the `instr` option
        exportOptions.instr = fileContent;
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
    options.export.options = null;
    options.export.instr = null;

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
  options.export.options = null;
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
  // Get the `export` and `customLogic` options
  const { export: exportOptions, customLogic: customLogicOptions } = options;

  // Prepare the `constr` option
  exportOptions.constr = _fixConstr(exportOptions.constr);

  // Prepare the `type` option
  exportOptions.type = _fixType(exportOptions.type, exportOptions.outfile);

  // Prepare the `outfile` option
  exportOptions.outfile = _fixOutfile(
    exportOptions.type,
    exportOptions.outfile
  );

  // Notify about the custom logic usage status
  log(
    3,
    `[chart] The custom logic is ${customLogicOptions.allowCodeExecution ? 'allowed' : 'disallowed'}.`
  );

  // Prepare the `customCode`, `callback`, and `resources` options
  _handleCustomLogic(customLogicOptions);

  // Prepare the `globalOptions` and `themeOptions` options
  _handleGlobalAndTheme(exportOptions, customLogicOptions);

  // Prepare the `height`, `width`, and `scale` options
  _handleSize(exportOptions);

  // Check if the image options object does not exceed the size limit
  _checkDataSize({ export: exportOptions, customLogic: customLogicOptions });

  // Post the work to the pool
  return postWork(options);
}

/**
 * Handles adjusting the constructor name by transforming and normalizing
 * it based on common chart types.
 *
 * @function _fixConstr
 *
 * @param {string} constr - The original constructor name to be adjusted.
 *
 * @returns {string} The corrected constructor name, or 'chart' if the input
 * is not recognized.
 */
function _fixConstr(constr) {
  try {
    // Fix the constructor by lowering casing
    const fixedConstr = `${constr.toLowerCase().replace('chart', '')}Chart`;

    // Handle the case where the result is just 'Chart'
    if (fixedConstr === 'Chart') {
      fixedConstr.toLowerCase();
    }

    // Return the corrected constructor, otherwise default to 'chart'
    return ['chart', 'stockChart', 'mapChart', 'ganttChart'].includes(
      fixedConstr
    )
      ? fixedConstr
      : 'chart';
  } catch {
    // Default to 'chart' in case of any error
    return 'chart';
  }
}

/**
 * Handles fixing the outfile based on provided type.
 *
 * @function _fixOutfile
 *
 * @param {string} type - The original export type.
 * @param {string} outfile - The file path or name.
 *
 * @returns {string} The corrected outfile, or 'chart.png' if the input
 * is not recognized.
 */
function _fixOutfile(type, outfile) {
  // Get the file name from the `outfile` option
  const fileName = getAbsolutePath(outfile || 'chart')
    .split('.')
    .shift();

  // Return a correct outfile
  return `${fileName}.${type || 'png'}`;
}

/**
 * Handles fixing the export type based on MIME types and file extensions.
 *
 * @function _fixType
 *
 * @param {string} type - The original export type.
 * @param {string} [outfile=null] - The file path or name. The default value
 * is `null`.
 *
 * @returns {string} The corrected export type, or 'png' if the input
 * is not recognized.
 */
function _fixType(type, outfile = null) {
  // MIME types
  const mimeTypes = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'application/pdf': 'pdf',
    'image/svg+xml': 'svg'
  };

  // Get formats
  const formats = Object.values(mimeTypes);

  // Check if type and outfile's extensions are the same
  if (outfile) {
    const outType = outfile.split('.').pop();

    // Support the JPG type
    if (outType === 'jpg') {
      type = 'jpeg';
    } else if (formats.includes(outType) && type !== outType) {
      type = outType;
    }
  }

  // Return a correct type
  return mimeTypes[type] || formats.find((t) => t === type) || 'png';
}

/**
 * Handle calculating the `height`, `width` and `scale` for chart exports based
 * on the provided export options.
 *
 * The function prioritizes values in the following order:
 *
 * 1. The `height`, `width`, `scale` from the `exportOptions`.
 * 2. Options from the chart configuration (from `exporting` and `chart`).
 * 3. Options from the global options (from `exporting` and `chart`).
 * 4. Options from the theme options (from `exporting` and `chart` sections).
 * 5. Fallback default values (`height = 400`, `width = 600`, `scale = 1`).
 *
 * @function _handleSize
 *
 * @param {Object} exportOptions - The configuration object containing `export`
 * options.
 */
function _handleSize(exportOptions) {
  // Check the `options` and `instr` for chart and exporting sections
  const { chart: optionsChart, exporting: optionsExporting } =
    isAllowedConfig(exportOptions.instr) || false;

  // Check the `globalOptions` for chart and exporting sections
  const { chart: globalOptionsChart, exporting: globalOptionsExporting } =
    isAllowedConfig(exportOptions.globalOptions) || false;

  // Check the `themeOptions` for chart and exporting sections
  const { chart: themeOptionsChart, exporting: themeOptionsExporting } =
    isAllowedConfig(exportOptions.themeOptions) || false;

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

  // Find the `scale` value:
  // - Cannot be lower than 0.1
  // - Cannot be higher than 5.0
  // - Must be rounded to 2 decimal places (e.g. 0.23234 -> 0.23)
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

  // Update `height`, `width`, and `scale` information in the `export` options
  exportOptions.height = height;
  exportOptions.width = width;
  exportOptions.scale = scale;

  // Get rid of potential `px` and `%`
  for (let param of ['height', 'width', 'scale']) {
    if (typeof exportOptions[param] === 'string') {
      exportOptions[param] = +exportOptions[param].replace(/px|%/gi, '');
    }
  }
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
 *
 * @throws {ExportError} Throws an `ExportError` if code execution
 * is not allowed but custom logic options are still provided.
 */
function _handleCustomLogic(customLogicOptions) {
  // In case of allowing code execution
  if (customLogicOptions.allowCodeExecution) {
    // Process the `resources` option
    try {
      // Try to handle resources
      customLogicOptions.resources = _handleResources(
        customLogicOptions.resources,
        customLogicOptions.allowFileResources,
        true
      );
    } catch (error) {
      log(2, '[chart] The `resources` cannot be loaded.');

      // In case of an error, set the option with null
      customLogicOptions.resources = null;
    }

    // Process the `customCode` option
    try {
      // Try to load custom code and wrap around it in a self invoking function
      customLogicOptions.customCode = _handleCustomCode(
        customLogicOptions.customCode,
        customLogicOptions.allowFileResources
      );
    } catch (error) {
      logWithStack(2, error, '[chart] The `customCode` cannot be loaded.');

      // In case of an error, set the option with null
      customLogicOptions.customCode = null;
    }

    // Process the `callback` option
    try {
      // Try to load callback function
      customLogicOptions.callback = _handleCustomCode(
        customLogicOptions.callback,
        customLogicOptions.allowFileResources,
        true
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
  let handledResources = resources;

  // If no resources found, try to load the default resources
  if (!handledResources) {
    resources = 'resources.json';
  }

  // List of allowed sections in the resources JSON
  const allowedProps = ['js', 'css', 'files'];

  // A flag that decides based to return resources or `null`
  let correctResources = false;

  // Try to load resources from a file
  if (
    allowFileResources &&
    typeof resources === 'string' &&
    resources.endsWith('.json')
  ) {
    handledResources = isAllowedConfig(
      readFileSync(getAbsolutePath(resources), 'utf8'),
      false,
      allowCodeExecution
    );
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

  // Return resources
  return handledResources;
}

/**
 * Handles custom code to execute it safely.
 *
 * @function _handleCustomCode
 *
 * @param {string} customCode - The custom code to be wrapped.
 * @param {boolean} allowFileResources - Flag to allow loading code from a file.
 * @param {boolean} [isCallback=false] - Flag that indicates the returned code
 * must be in a callback format.
 *
 * @returns {(string|null)} The wrapped custom code or null if wrapping fails.
 */
function _handleCustomCode(customCode, allowFileResources, isCallback = false) {
  if (customCode && typeof customCode === 'string') {
    customCode = customCode.trim();

    if (customCode.endsWith('.js')) {
      // Load a file if the file resources are allowed
      return allowFileResources
        ? _handleCustomCode(
            readFileSync(getAbsolutePath(customCode), 'utf8'),
            allowFileResources,
            isCallback
          )
        : null;
    } else if (
      !isCallback &&
      (customCode.startsWith('function()') ||
        customCode.startsWith('function ()') ||
        customCode.startsWith('()=>') ||
        customCode.startsWith('() =>'))
    ) {
      // Treat a function as a self-invoking expression
      return `(${customCode})()`;
    }

    // Or return as a stringified code
    return customCode.replace(/;$/, '');
  }
}

/**
 * Handles the loading and validation of the `globalOptions` and `themeOptions`
 * in the export options. If the option is a string and references a JSON file
 * (when the `allowFileResources` is `true`), it reads and parses the file.
 * Otherwise, it attempts to parse the string or object as JSON. If any errors
 * occur during this process, the option is set to `null`. If there is an error
 * loading or parsing the `globalOptions` or `themeOptions`, the error is logged
 * and the option is set to `null`.
 *
 * @function _handleGlobalAndTheme
 *
 * @param {Object} exportOptions - The configuration object containing `export`
 * options.
 * @param {Object} customLogicOptions - The configuration object containing
 * `customLogic` options.
 */
function _handleGlobalAndTheme(exportOptions, customLogicOptions) {
  // Get the `allowFileResources` and `allowCodeExecution` flags
  const { allowFileResources, allowCodeExecution } = customLogicOptions;

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

/**
 * Validates the size of the data for the export process against a fixed limit
 * of 100MB.
 *
 * @function _checkDataSize
 *
 * @param {Object} imageOptions - The data object, which includes options from
 * the `export` and `customLogic` sections and will be sent to a Puppeteer page.
 *
 * @throws {ExportError} Throws an `ExportError` if the size of the data for
 * the export process object exceeds the 100MB limit.
 */
function _checkDataSize(imageOptions) {
  // Set the fixed data limit (100MB) for the dev-tools protocol
  const dataLimit = 100 * 1024 * 1024;

  // Get the size of the data
  const totalSize = Buffer.byteLength(JSON.stringify(imageOptions), 'utf-8');

  // Log the size in MB
  log(
    3,
    `[chart] The current total size of the data for the export process is around ${(
      totalSize /
      (1024 * 1024)
    ).toFixed(2)}MB.`
  );

  // Check the size of data before passing to a page
  if (totalSize >= dataLimit) {
    throw new ExportError(
      `[chart] The data for the export process exceeds 100MB limit.`
    );
  }
}

export default {
  singleExport,
  batchExport,
  startExport,
  getAllowCodeExecution,
  setAllowCodeExecution
};
