/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Manages configuration for the Highcharts Export Server by loading
 * and merging options from multiple sources, such as default settings,
 * environment variables, user-provided options, and command-line arguments.
 * Ensures the export server's global options are up-to-date with the highest
 * priority values. Provides functions for accessing and updating configuration.
 */

import { readFileSync } from 'fs';

import { log, logWithStack, logZodIssues } from './logger.js';
import { deepCopy } from './utils.js';
import { envs, looseValidate, strictValidate } from './validation.js';
import { defaultConfig, nestedArgs } from './schemas/config.js';

// Sets the global options with initial values from the default config
const globalOptions = _initGlobalOptions(defaultConfig);

/**
 * Gets the global options of the export server instance.
 *
 * @function getOptions
 *
 * @param {boolean} [getGlobal = false] - Optional parameter to decide whether
 * to return the reference to the global options of the server instance object
 * or return a copy of it.
 *
 * @returns {Object} The global options object of the server instance.
 */
export function getOptions(getGlobal = false) {
  return getGlobal ? globalOptions : deepCopy(globalOptions);
}

/**
 * Sets the general options of the export server instance, keeping the principle
 * of the options load priority from all available sources. It accepts optional
 * `customOptions` object and `cliArgs` array with arguments from the CLI. These
 * options will be validated and applied if provided.
 *
 * @function setOptions
 *
 * @param {Object} [customOptions={}] - Optional custom options for additional
 * configuration.
 * @param {Array.<string>} [cliArgs=[]] - Optional command line arguments
 * for additional configuration.
 * @param {boolean} [modifyGlobal = false] - Optional parameter to decide
 * whether to update and return the reference to the global options
 * of the server instance object or return a copy of it.
 *
 * @returns {Object} The updated general options object, reflecting the merged
 * configuration from all available sources.
 */
export function setOptions(
  customOptions = {},
  cliArgs = [],
  modifyGlobal = false
) {
  // Object for options loaded via the `loadConfig` option
  let configOptions = {};

  // Object for options from the CLI
  let cliOptions = {};

  // Only for the CLI usage
  if (cliArgs.length) {
    try {
      // Validate options from the custom JSON loaded via the `loadConfig`
      configOptions = strictValidate(_loadConfigFile(cliArgs));
    } catch (error) {
      logZodIssues(
        1,
        error.issues,
        '[config] Custom JSON options validation error'
      );
    }
  }

  // Apply custom options if there are any
  if (customOptions && Object.keys(customOptions).length !== 0) {
    try {
      // Validate custom options provided by the user
      customOptions = strictValidate(customOptions);
    } catch (error) {
      logZodIssues(1, error.issues, '[config] Custom options validation error');
    }
  }

  // Only for the CLI usage
  if (cliArgs.length) {
    try {
      // Validate options from the CLI
      cliOptions = looseValidate(_pairArgumentValue(nestedArgs, cliArgs));
    } catch (error) {
      logZodIssues(1, error.issues, '[config] CLI options validation error');
    }
  }

  // Get the reference to the global options object or a copy of the object
  const generalOptions = modifyGlobal ? globalOptions : deepCopy(globalOptions);

  // Update values of the general options with values from each source possible
  _updateOptions(
    defaultConfig,
    generalOptions,
    configOptions,
    customOptions,
    cliOptions
  );

  // Return options
  return generalOptions;
}

/**
 * Initializes and returns global options object based on provided
 * configuration, setting values from nested properties recursively.
 *
 * @function _initGlobalOptions
 *
 * @param {Object} config - Configuration to be used for initializing options.
 *
 * @returns {Object} Initialized options object.
 */
function _initGlobalOptions(config) {
  const options = {};
  for (const [name, item] of Object.entries(config)) {
    options[name] = Object.prototype.hasOwnProperty.call(item, 'value')
      ? item.value
      : _initGlobalOptions(item);
  }
  return options;
}

/**
 * Updates options object with values from various sources, following a specific
 * prioritization order. The function checks for values in the following order
 * of precedence: the `loadConfig` configuration options, environment variables,
 * custom options, and CLI options.
 *
 * @function _updateOptions
 *
 * @param {Object} config - The configuration object, which includes the initial
 * settings and metadata for each option. This object is used to determine
 * the structure and default values for the options.
 * @param {Object} options - The options object that will be updated with values
 * from other sources.
 * @param {Object} configOpt - The configuration options object, which may
 * provide values to override defaults.
 * @param {Object} customOpt - The custom options object, typically containing
 * user-defined values that may override configuration options.
 * @param {Object} cliOpt - The CLI options object, which includes values
 * provided through command-line arguments and has the highest precedence among
 * options.
 */
function _updateOptions(config, options, configOpt, customOpt, cliOpt) {
  Object.keys(config).forEach((key) => {
    // Get the config entry of a specific option
    const entry = config[key];

    // Gather values for the options from every possible source, if exists
    const configVal = configOpt && configOpt[key];
    const customVal = customOpt && customOpt[key];
    const cliVal = cliOpt && cliOpt[key];

    // If the value not found, need to go deeper
    if (typeof entry.value === 'undefined') {
      _updateOptions(entry, options[key], configVal, customVal, cliVal);
    } else {
      // If a value from custom JSON options exists, it take precedence
      if (configVal !== undefined && configVal !== null) {
        options[key] = configVal;
      }

      // If a value from environment variables exists, it take precedence
      const envVal = envs[entry.envLink];
      if (entry.envLink in envs && envVal !== undefined && envVal !== null) {
        options[key] = envVal;
      }

      // If a value from user options exists, it take precedence
      if (customVal !== undefined && customVal !== null) {
        options[key] = customVal;
      }

      // If a value from CLI options exists, it take precedence
      if (cliVal !== undefined && cliVal !== null) {
        options[key] = cliVal;
      }
    }
  });
}

/**
 * Loads additional configuration from a specified file provided via
 * the `--loadConfig` option in the command-line arguments.
 *
 * @function _loadConfigFile
 *
 * @param {Array.<string>} cliArgs - Command-line arguments to search
 * for the `--loadConfig` option and the corresponding file path.
 *
 * @returns {Object} The additional configuration loaded from the specified
 * file, or an empty object if the file is not found, invalid, or an error
 * occurs.
 */
function _loadConfigFile(cliArgs) {
  // Check if the `loadConfig` option was used
  const configIndex = cliArgs.findIndex(
    (arg) => arg.replace(/-/g, '') === 'loadConfig'
  );

  // Get the `loadConfig` option value
  const configFileName = configIndex > -1 && cliArgs[configIndex + 1];

  // Check if the `loadConfig` is present and has a correct value
  if (configFileName) {
    try {
      // Load an optional custom JSON config file
      return JSON.parse(readFileSync(configFileName));
    } catch (error) {
      logWithStack(
        2,
        error,
        `[config] Unable to load the configuration from the ${configFileName} file.`
      );
    }
  }
  // No additional options to return
  return {};
}

/**
 * Parses command-line arguments and pairs each argument with its corresponding
 * option in the configuration. The values are structured into a nested options
 * object, based on predefined mappings.
 *
 * @function _pairArgumentValue
 *
 * @param {Array.<string>} nestedArgs - An array of nesting level for all
 * general options.
 * @param {Array.<string>} cliArgs - An array of command-line arguments
 * containing options and their associated values.
 *
 * @returns {Object} An updated options object where each option from
 * the command-line is paired with its value, structured into nested objects
 * as defined.
 */
function _pairArgumentValue(nestedArgs, cliArgs) {
  // An empty object to collect and structurize data from the args
  const cliOptions = {};

  // Cycle through all CLI args and filter them
  for (let i = 0; i < cliArgs.length; i++) {
    const option = cliArgs[i].replace(/-/g, '');

    // Find the right place for property's value
    const propertiesChain = nestedArgs[option]
      ? nestedArgs[option].split('.')
      : [];

    // Create options object with values from CLI for later parsing and merging
    propertiesChain.reduce((obj, prop, index) => {
      if (propertiesChain.length - 1 === index) {
        const value = cliArgs[++i];
        if (!value) {
          log(
            2,
            `[config] Missing value for the '${option}' argument. Using the default value.`
          );
        }
        obj[prop] = value || null;
      } else if (obj[prop] === undefined) {
        obj[prop] = {};
      }
      return obj[prop];
    }, cliOptions);
  }

  // Return parsed CLI options
  return cliOptions;
}

export default {
  getOptions,
  setOptions
};
