/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module manages configuration for the Highcharts Export Server
 * by loading and merging options from multiple sources, such as the default
 * settings, environment variables, user-provided options, and command-line
 * arguments. Ensures the global options are up-to-date with the highest
 * priority values. Provides functions for accessing and updating configuration.
 */

import { readFileSync } from 'fs';

import { log, logWithStack, logZodIssues } from './logger.js';
import { deepCopy, getAbsolutePath, isObject } from './utils.js';
import {
  envs,
  looseValidate,
  strictValidate,
  validators
} from './validation.js';

import defaultConfig from './schemas/config.js';

import ExportError from './errors/ExportError.js';

// Sets the global options with initial values from the default config
const globalOptions = _initOptions(defaultConfig);

// Properties nesting level of all options
const nestedProps = _createNestedProps(defaultConfig);

// Properties names that should not be recursively merged
const absoluteProps = _createAbsoluteProps(defaultConfig);

/**
 * Retrieves a copy of the global options object or an original global options
 * object, based on the `getCopy` flag.
 *
 * @function getOptions
 *
 * @param {boolean} [getCopy=true] - Specifies whether to return a copied
 * object of the global options (`true`) or a reference to the global options
 * object (`false`). The default value is `true`.
 *
 * @returns {Object} A copy of the global options object, or a reference
 * to the global options object.
 */
export function getOptions(getCopy = true) {
  // Return a copy or an original global options object
  return getCopy ? deepCopy(globalOptions) : globalOptions;
}

/**
 * Updates and returns the global options object or a copy of the global options
 * object, based on the `getCopy` flag. The `newOptions` object can be
 * strictly validated depending on the `strictCheck` flag.
 *
 * @function updateOptions
 *
 * @param {Object} newOptions - An object containing the new options to be
 * merged into the global options.
 * @param {boolean} [getCopy=false] - Determines whether to merge the new
 * options into a copy of the global options object (`true`) or directly into
 * the global options object (`false`). The default value is `false`.
 * @param {boolean} [strictCheck=true] - Determines if stricter validation
 * should be applied. The default value is `true`.
 *
 * @returns {Object} The updated options object, either the modified global
 * options or a modified copy, based on the value of `getCopy`.
 */
export function updateOptions(newOptions, getCopy = false, strictCheck = true) {
  // Merge new options to the global options or its copy and return the result
  return _mergeOptions(
    // First, get the options
    getOptions(getCopy),
    // Next, validate the new options
    validateOptions(newOptions, strictCheck)
  );
}

/**
 * Updates and returns the global options object with values provided through
 * the CLI, keeping the principle of options load priority. The function accepts
 * a `cliArgs` array containing arguments from the CLI, which will be validated
 * and applied if provided.
 *
 * The function prioritizes values in the following order:
 *
 * 1. Values from the command line interface (CLI).
 * 2. Values from a custom JSON file (loaded by the `--loadConfig` option).
 *
 * @function setCliOptions
 *
 * @param {Array<string>} cliArgs - An array of command line arguments used
 * for additional configuration.
 *
 * @returns {Object} The updated global options object, reflecting the merged
 * configuration from sources provided through the CLI.
 */
export function setCliOptions(cliArgs) {
  // Only for the CLI usage
  if (cliArgs && Array.isArray(cliArgs) && cliArgs.length) {
    try {
      // Get options from the custom JSON loaded via the `--loadConfig`
      const configOptions = _loadConfigFile(cliArgs);

      // Update global options with validated values from the `configOptions`
      updateOptions(configOptions);
    } catch (error) {
      log(2, '[config] No options added from the `--loadConfig` option.');
    }

    try {
      // Get options from the CLI
      const cliOptions = _pairArgumentValue(cliArgs);

      // Update global options with validated values from the `cliOptions`
      updateOptions(cliOptions, false, false);
    } catch (error) {
      log(2, '[config] No options added from the CLI arguments.');
    }
  }

  // Return reference to the global options
  return getOptions(false);
}

/**
 * Maps old-structured configuration options (PhantomJS-based) to a new format
 * (Puppeteer-based). This function converts flat, old-structured options into
 * a new, nested configuration format based on a predefined mapping provided
 * in the `nestedProps` object. The new format is used for Puppeteer, while
 * the old format was used for PhantomJS.
 *
 * @function mapToNewOptions
 *
 * @param {Object} oldOptions - The old, flat configuration options
 * to be converted.
 *
 * @returns {Object} A new object containing options structured according
 * to the mapping defined in the `nestedProps` object or an empty object
 * if the provided `oldOptions` is not a correct object.
 */
export function mapToNewOptions(oldOptions) {
  // An object for the new structured options
  const newOptions = {};

  // Check if provided value is a correct object
  if (isObject(oldOptions)) {
    // Iterate over each key-value pair in the old-structured options
    for (const [key, value] of Object.entries(oldOptions)) {
      // If there is a nested mapping, split it into a properties chain
      const propertiesChain = nestedProps[key]
        ? nestedProps[key].split('.')
        : [];

      // If it is the last property in the chain, assign the value, otherwise,
      // create or reuse the nested object
      propertiesChain.reduce(
        (obj, prop, index) =>
          (obj[prop] =
            propertiesChain.length - 1 === index ? value : obj[prop] || {}),
        newOptions
      );
    }
  } else {
    log(
      2,
      '[config] No correct object with options was provided. Returning an empty object.'
    );
  }

  // Return the new, structured options object
  return newOptions;
}

/**
 * Validates a specified option using the corresponding validator from the
 * configuration object. Returns the original option if the validation
 * is disabled globally.
 *
 * @function validateOption
 *
 * @param {string} name - The name of the option to validate.
 * @param {any} configOption - The value of the option to validate.
 * @param {boolean} [strictCheck=true] - Determines if stricter validation
 * should be applied. The default value is `true`.
 *
 * @returns {any} The parsed and validated value of the option.
 */
export function validateOption(name, configOption, strictCheck = true) {
  // Return the original option if the validation is disabled
  if (!getOptions().other.validation) {
    return configOption;
  }

  try {
    // Return validated option
    return validators[name](strictCheck).parse(configOption);
  } catch (error) {
    // Log Zod issues
    logZodIssues(
      1,
      error.issues,
      `[validation] The ${name} option validation error`
    );

    // Throw validation error
    throw new ExportError(
      `[validation] The ${name} option validation error`,
      400
    );
  }
}

/**
 * Validates the provided configuration options for the exporting process.
 * Returns the original option if the validation is disabled globally.
 *
 * @function validateOptions
 *
 * @param {Object} configOptions - The configuration options to be validated.
 * @param {boolean} [strictCheck=true] - Determines if stricter validation
 * should be applied. The default value is `true`.
 *
 * @returns {Object} The parsed and validated configuration options object.
 */
export function validateOptions(configOptions, strictCheck = true) {
  // Return the original config if the validation is disabled
  if (!getOptions().other.validation) {
    return configOptions;
  }

  try {
    // Return validated options
    return strictCheck
      ? strictValidate(configOptions)
      : looseValidate(configOptions);
  } catch (error) {
    // Log Zod issues
    logZodIssues(1, error.issues, '[validation] Options validation error');

    // Throw validation error
    throw new ExportError('[validation] Options validation error', 400);
  }
}

/**
 * Validates, parses, and checks if the provided config is allowed set
 * of options.
 *
 * @function isAllowedConfig
 *
 * @param {unknown} config - The config to be validated and parsed as a set
 * of options. Must be either an object or a string.
 * @param {boolean} [toString=false] - Whether to return a stringified version
 * of the parsed config. The default value is `false`.
 * @param {boolean} [allowFunctions=false] - Whether to allow functions
 * in the parsed config. If `true`, functions are preserved. Otherwise, when
 * a function is found, `null` is returned. The default value is `false`.
 *
 * @returns {(Object|string|null)} Returns a parsed set of options object,
 * a stringified set of options object if the `toString` is `true`, and `null`
 * if the config is not a valid set of options or parsing fails.
 */
export function isAllowedConfig(
  config,
  toString = false,
  allowFunctions = false
) {
  try {
    // Accept only objects and strings
    if (!isObject(config) && typeof config !== 'string') {
      // Return `null` if any other type
      return null;
    }

    // Get the object representation of the original config
    const objectConfig =
      typeof config === 'string'
        ? allowFunctions
          ? eval(`(${config})`)
          : JSON.parse(config)
        : config;

    // Preserve or remove potential functions based on the `allowFunctions` flag
    const stringifiedOptions = _optionsStringify(
      objectConfig,
      allowFunctions,
      false
    );

    // Parse the config to check if it is valid set of options
    const parsedOptions = allowFunctions
      ? JSON.parse(
          _optionsStringify(objectConfig, allowFunctions, true),
          (_, value) =>
            typeof value === 'string' && value.startsWith('function')
              ? eval(`(${value})`)
              : value
        )
      : JSON.parse(stringifiedOptions);

    // Return stringified or object options based on the `toString` flag
    return toString ? stringifiedOptions : parsedOptions;
  } catch (error) {
    // Return `null` if parsing fails
    return null;
  }
}

/**
 * Initializes and returns the global options object based on the provided
 * configuration, setting values from nested properties recursively.
 *
 * The function prioritizes values in the following order:
 *
 * 1. Values from environment variables (specified in the `.env` file).
 * 2. Values from the `./lib/schemas/config.js` file (defaults).
 *
 * @function _initOptions
 *
 * @param {Object} config - The configuration object used for initializing
 * the global options. It should include nested properties with a `value`
 * and an `envLink` for linking to environment variables.
 *
 * @returns {Object} The initialized global options object, populated with
 * values based on the provided configuration and the established priority
 * order.
 */
function _initOptions(config) {
  // Init the object for options
  const options = {};

  // Start initializing the `options` object recursively
  for (const [name, item] of Object.entries(config)) {
    if (Object.prototype.hasOwnProperty.call(item, 'value')) {
      // Set the correct value based on the established priority order
      if (envs[item.envLink] !== undefined && envs[item.envLink] !== null) {
        // The environment variables value
        options[name] = envs[item.envLink];
      } else {
        // The value from the config file
        options[name] = item.value;
      }
    } else {
      // Create a category of options in the `options` object
      options[name] = _initOptions(item);
    }
  }

  // Return the created `options` object
  return options;
}

/**
 * Recursively merges two sets of configuration options, taking into account
 * properties specified in the `absoluteProps` array that require absolute
 * merging. The `originalOptions` object will be extended with options from
 * the `newOptions` object.
 *
 * @function _mergeOptions
 *
 * @param {Object} originalOptions - The original configuration options object
 * to be extended.
 * @param {Object} newOptions - The new configuration options object to merge.
 *
 * @returns {Object} The extended `originalOptions` object.
 */
function _mergeOptions(originalOptions, newOptions) {
  // Check if the `originalOptions` and `newOptions` are correct objects
  if (isObject(originalOptions) && isObject(newOptions)) {
    for (const [key, value] of Object.entries(newOptions)) {
      originalOptions[key] =
        isObject(value) &&
        !absoluteProps.includes(key) &&
        originalOptions[key] !== undefined
          ? _mergeOptions(originalOptions[key], value)
          : value !== undefined
            ? value
            : originalOptions[key] || null;
    }
  }

  // Return the original (modified or not) options
  return originalOptions;
}

/**
 * Converts the provided options object to a JSON string with the option
 * to preserve functions. In order for a function to be preserved, it needs
 * to follow the format `function (...) {...}`. Such a function can also
 * be stringified.
 *
 * @function _optionsStringify
 *
 * @param {Object} options - The options object to be converted to a string.
 * @param {boolean} allowFunctions - If set to `true`, functions are preserved
 * in the output. Otherwise an error is thrown.
 * @param {boolean} stringifyFunctions - If set to `true`, functions are saved
 * as strings. The `allowFunctions` must be set to `true` as well for this
 * to take an effect.
 *
 * @returns {string} The JSON-formatted string representing the options.
 *
 * @throws {Error} Throws an `Error` when functions are not allowed but are
 * found in provided options object.
 */
function _optionsStringify(options, allowFunctions, stringifyFunctions) {
  const replacerCallback = (_, value) => {
    // Trim string values
    if (typeof value === 'string') {
      value = value.trim();
    }

    // If `value` is a function or stringified function
    if (
      typeof value === 'function' ||
      (typeof value === 'string' &&
        value.startsWith('function') &&
        value.endsWith('}'))
    ) {
      // If the `allowFunctions` is set to `true`, preserve functions
      if (allowFunctions) {
        // Based on the `stringifyFunctions` options, set function values
        return stringifyFunctions
          ? // As stringified functions
            `"EXP_FUN${(value + '').replaceAll(/\s+/g, ' ')}EXP_FUN"`
          : // As functions
            `EXP_FUN${(value + '').replaceAll(/\s+/g, ' ')}EXP_FUN`;
      } else {
        // Throw an error otherwise
        throw new Error();
      }
    }

    // In all other cases, simply return the value
    return value;
  };

  // Stringify options and if required, replace special functions marks
  return JSON.stringify(options, replacerCallback).replaceAll(
    stringifyFunctions ? /\\"EXP_FUN|EXP_FUN\\"/g : /"EXP_FUN|EXP_FUN"/g,
    ''
  );
}

/**
 * Loads additional configuration from a specified file provided via
 * the `--loadConfig` option in the command-line arguments.
 *
 * @function _loadConfigFile
 *
 * @param {Array<string>} cliArgs - Command-line arguments to search
 * for the `--loadConfig` option and the corresponding file path.
 *
 * @returns {Object} The additional configuration loaded from the specified
 * file, or an empty object if the file is not found, invalid, or an error
 * occurs.
 */
function _loadConfigFile(cliArgs) {
  // Get the allow flags for the custom logic check
  const { allowCodeExecution, allowFileResources } = getOptions().customLogic;

  // Check if the `--loadConfig` option was used
  const configIndex = cliArgs.findIndex(
    (arg) => arg.replace(/-/g, '') === 'loadConfig'
  );

  // Get the `--loadConfig` option value
  const configFileName = configIndex > -1 && cliArgs[configIndex + 1];

  // Check if the `--loadConfig` is present and has a correct value
  if (configFileName && allowFileResources) {
    try {
      // Load an optional custom JSON config file
      return isAllowedConfig(
        readFileSync(getAbsolutePath(configFileName), 'utf8'),
        false,
        allowCodeExecution
      );
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
 * object, based on predefined mappings in the `nestedProps` object.
 *
 * @function _pairArgumentValue
 *
 * @param {Array<string>} cliArgs - An array of command-line arguments
 * containing options and their associated values.
 *
 * @returns {Object} An updated options object where each option from
 * the command-line is paired with its value, structured into nested objects
 * as defined.
 */
function _pairArgumentValue(cliArgs) {
  // An empty object to collect and structurize data from the args
  const cliOptions = {};

  // Cycle through all CLI args and filter them
  for (let i = 0; i < cliArgs.length; i++) {
    const option = cliArgs[i].replace(/-/g, '');

    // Find the right place for property's value
    const propertiesChain = nestedProps[option]
      ? nestedProps[option].split('.')
      : [];

    // Create options object with values from CLI for later parsing and merging
    propertiesChain.reduce((obj, prop, index) => {
      if (propertiesChain.length - 1 === index) {
        const value = cliArgs[++i];
        if (!value) {
          log(
            2,
            `[config] Missing value for the CLI '--${option}' argument. Using the default value.`
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

/**
 * Recursively generates a mapping of nested argument chains from a nested
 * config object. This function traverses a nested object and creates a mapping
 * where each key is an argument name (either from `cliName`, `legacyName`,
 * or the original key) and each value is a string representing the chain
 * of nested properties leading to that argument.
 *
 * @function _createNestedProps
 *
 * @param {Object} config - The configuration object.
 * @param {Object} [nestedProps={}] - The accumulator object for storing
 * the resulting arguments chains. The default value is an empty object.
 * @param {string} [propChain=''] - The current chain of nested properties,
 * used internally during recursion. The default value is an empty string.
 *
 * @returns {Object} An object mapping argument names to their corresponding
 * nested property chains.
 */
function _createNestedProps(config, nestedProps = {}, propChain = '') {
  Object.keys(config).forEach((key) => {
    // Get the specific section
    const entry = config[key];

    // Check if there is still more depth to traverse
    if (typeof entry.value === 'undefined') {
      // Recurse into deeper levels of nested arguments
      _createNestedProps(entry, nestedProps, `${propChain}.${key}`);
    } else {
      // Create the chain of nested arguments
      nestedProps[entry.cliName || key] = `${propChain}.${key}`.substring(1);

      // Support for the legacy, PhantomJS properties names
      if (entry.legacyName !== undefined) {
        nestedProps[entry.legacyName] = `${propChain}.${key}`.substring(1);
      }
    }
  });

  // Return the object with nested argument chains
  return nestedProps;
}

/**
 * Recursively gathers the names of properties from a configuration object that
 * should be treated as absolute properties. These properties have values that
 * are objects and do not contain further nested depth when merging an object
 * containing these options.
 *
 * @function _createAbsoluteProps
 *
 * @param {Object} config - The configuration object.
 * @param {Array<string>} [absoluteProps=[]] - An array to collect the names
 * of absolute properties. The default value is an empty array.
 *
 * @returns {Array<string>} An array containing the names of absolute
 * properties.
 */
function _createAbsoluteProps(config, absoluteProps = []) {
  Object.keys(config).forEach((key) => {
    // Get the specific section
    const entry = config[key];

    // Check if there is still more depth to traverse
    if (typeof entry.types === 'undefined') {
      // Recurse into deeper levels
      _createAbsoluteProps(entry, absoluteProps);
    } else {
      // If the option can be an object, save its type in the array
      if (entry.types.includes('Object')) {
        absoluteProps.push(key);
      }
    }
  });

  // Return the array with the names of absolute properties
  return absoluteProps;
}

export default {
  getOptions,
  updateOptions,
  setCliOptions,
  mapToNewOptions,
  validateOption,
  validateOptions,
  isAllowedConfig
};
