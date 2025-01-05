/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Manages configuration for the Highcharts Export Server by loading
 * and merging options from multiple sources, such as default settings,
 * environment variables, user-provided options, and command-line arguments.
 * Ensures the global options are up-to-date with the highest priority values.
 * Provides functions for accessing and updating configuration.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { log, logWithStack, logZodIssues } from './logger.js';
import { __dirname, isObject, deepCopy, getAbsolutePath } from './utils.js';
import { envs, looseValidate, strictValidate } from './validation.js';
import { defaultConfig, nestedProps, absoluteProps } from './schemas/config.js';

// Sets the global options with initial values from the default config
const globalOptions = _initGlobalOptions(defaultConfig);

/**
 * Gets the reference to the global options of the server instance object
 * or its copy.
 *
 * @function getOptions
 *
 * @param {boolean} [getReference=true] - Optional parameter to decide whether
 * to return the reference to the global options of the server instance object
 * or return a copy of it. The default value is true.
 *
 * @returns {Object} The reference to the global options of the server instance
 * object or its copy.
 */
export function getOptions(getReference = true) {
  return getReference ? globalOptions : deepCopy(globalOptions);
}

/**
 * Sets the global options of the export server instance, keeping the principle
 * of the options load priority from all available sources. It accepts optional
 * `customOptions` object and `cliArgs` array with arguments from the CLI. These
 * options will be validated and applied if provided.
 *
 * The priority order of setting values is:
 *
 * 1. Options from the `lib/schemas/config.js` file (default values).
 * 2. Options from a custom JSON file (loaded by the `loadConfig` option).
 * 3. Options from the environment variables (the `.env` file).
 * 4. Options from the first parameter (by default an empty object).
 * 5. Options from the CLI.
 *
 * @function setOptions
 *
 * @param {Object} [customOptions={}] - Optional custom options for additional
 * configuration. The default value is an empty object.
 * @param {Array.<string>} [cliArgs=[]] - Optional command line arguments
 * for additional configuration. The default value is an empty array.
 * @param {boolean} [modifyGlobal=false] - Optional parameter to decide
 * whether to update and return the reference to the global options
 * of the server instance object or return a copy of it. The default value
 * is false.
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
      cliOptions = looseValidate(_pairArgumentValue(nestedProps, cliArgs));
    } catch (error) {
      logZodIssues(1, error.issues, '[config] CLI options validation error');
    }
  }

  // Get the reference to the global options object or a copy of the object
  const generalOptions = getOptions(modifyGlobal);

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
 * Merges two sets of configuration options, considering absolute properties.
 *
 * @function mergeOptions
 *
 * @param {Object} originalOptions - Original configuration options.
 * @param {Object} newOptions - New configuration options to be merged.
 *
 * @returns {Object} Merged configuration options.
 */
export function mergeOptions(originalOptions, newOptions) {
  // Check if the `newOptions` is a correct object
  if (isObject(newOptions)) {
    for (const [key, value] of Object.entries(newOptions)) {
      originalOptions[key] =
        isObject(value) &&
        !absoluteProps.includes(key) &&
        originalOptions[key] !== undefined
          ? mergeOptions(originalOptions[key], value)
          : value !== undefined
            ? value
            : originalOptions[key];
    }
  }

  // Return the result options
  return originalOptions;
}

/**
 * Maps old-structured configuration options (PhantomJS) to a new format
 * (Puppeteer). This function converts flat, old-structured options into
 * a new, nested configuration format based on a predefined mapping
 * (`nestedProps`). The new format is used for Puppeteer, while the old format
 * was used for PhantomJS.
 *
 * @function mapToNewOptions
 *
 * @param {Object} oldOptions - The old, flat configuration options
 * to be converted.
 *
 * @returns {Object} A new object containing options structured according
 * to the mapping defined in `nestedProps` or an empty object if the provided
 * `oldOptions` is not a correct object.
 */
export function mapToNewOptions(oldOptions) {
  // An object for the new structured options
  const newOptions = {};

  // Check if provided value is a correct object
  if (Object.prototype.toString.call(oldOptions) === '[object Object]') {
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
  }

  // Return the new, structured options object
  return newOptions;
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
 * of the parsed config. The default value is false.
 * @param {boolean} [allowFunctions=false] - Whether to allow functions
 * in the parsed config. If true, functions are preserved. Otherwise, when
 * a function is found, null is returned. The default value is false.
 *
 * @returns {(Object|string|null)} Returns a parsed set of options object,
 * a stringified set of options object if the `toString` is true, and null
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
      // Return null if any other type
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
    // Return null if parsing fails
    return null;
  }
}

/**
 * Prints the Highcharts Export Server logo, version, and license information.
 *
 * @function printLicense
 */
export function printLicense() {
  // Print the logo and version information
  printVersion();

  // Print the license information
  console.log(
    'This software requires a valid Highcharts license for commercial use.\n'
      .yellow,
    '\nFor a full list of CLI options, type:',
    '\nhighcharts-export-server --help\n'.green,
    '\nIf you do not have a license, one can be obtained here:',
    '\nhttps://shop.highsoft.com/\n'.green,
    '\nTo customize your installation, please refer to the README file at:',
    '\nhttps://github.com/highcharts/node-export-server#readme\n'.green
  );
}

/**
 * Prints usage information for CLI arguments, displaying available options
 * and their descriptions. It can list properties recursively if categories
 * contain nested options.
 *
 * @function printUsage
 */
export function printUsage() {
  // Display README and general usage information
  console.log(
    '\nUsage of CLI arguments:'.bold,
    '\n-----------------------',
    `\nFor more detailed information, visit the README file at: ${'https://github.com/highcharts/node-export-server#readme'.green}.\n`
  );

  // Iterate through each category in the `defaultConfig` and display usage info
  Object.keys(defaultConfig).forEach((category) => {
    console.log(`${category.toUpperCase()}`.bold.red);
    _cycleCategories(defaultConfig[category]);
    console.log('');
  });
}

/**
 * Prints the Highcharts Export Server logo or text with the version
 * information.
 *
 * @function printVersion
 *
 * @param {boolean} [noLogo=false] - If true, only prints text with the version
 * information, without the logo. The default value is false.
 */
export function printVersion(noLogo = false) {
  // Get package version either from `.env` or from `package.json`
  const packageVersion = JSON.parse(
    readFileSync(join(__dirname, 'package.json'))
  ).version;

  // Print text only
  if (noLogo) {
    console.log(`Highcharts Export Server v${packageVersion}`);
  } else {
    // Print the logo
    console.log(
      readFileSync(join(__dirname, 'msg', 'startup.msg')).toString().bold
        .yellow,
      `v${packageVersion}\n`.bold
    );
  }
}

/**
 * Initializes and returns global options object based on provided
 * configuration, setting values from nested properties recursively.
 *
 * @function _initGlobalOptions
 *
 * @param {Object} config - The configuration object to be used for initializing
 * options.
 *
 * @returns {Object} Initialized options object.
 */
function _initGlobalOptions(config) {
  const options = {};

  // Start initializing the `options` object recursively
  for (const [name, item] of Object.entries(config)) {
    options[name] = Object.prototype.hasOwnProperty.call(item, 'value')
      ? item.value
      : _initGlobalOptions(item);
  }

  // Return the created `options` object
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
 * @param {Object} configOpt - The configuration options object, loaded with
 * the `loadConfig` option, which may provide values to override defaults.
 * @param {Object} customOpt - The custom options object, typically containing
 * additional and user-defined values, which may override configuration options.
 * @param {Object} cliOpt - The CLI options object, which may include values
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
 * Converts the provided options object to a JSON-formatted string
 * with the option to preserve functions. In order for a function
 * to be preserved, it needs to follow the format `function (...) {...}`.
 * Such a function can also be stringified.
 *
 * @function _optionsStringify
 *
 * @param {Object} options - The options object to be converted to a string.
 * @param {boolean} allowFunctions - If set to true, functions are preserved
 * in the output. Otherwise an error is thrown.
 * @param {boolean} stringifyFunctions - If set to true, functions are saved
 * as strings. The `allowFunctions` must be set to true as well for this to take
 * an effect.
 *
 * @returns {string} The JSON-formatted string representing the options.
 *
 * @throws {Error} Throws an `Error` when functions are not allowed but are
 * found in provided options object.
 */
export function _optionsStringify(options, allowFunctions, stringifyFunctions) {
  const replacerCallback = (_, value) => {
    // Trim string values
    if (typeof value === 'string') {
      value = value.trim();
    }

    // If value is a function or stringified function
    if (
      typeof value === 'function' ||
      (typeof value === 'string' &&
        value.startsWith('function') &&
        value.endsWith('}'))
    ) {
      // If allowFunctions is set to true, preserve functions
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
 * the `loadConfig` option in the command-line arguments.
 *
 * @function _loadConfigFile
 *
 * @param {Array.<string>} cliArgs - Command-line arguments to search
 * for the `loadConfig` option and the corresponding file path.
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
      return JSON.parse(readFileSync(getAbsolutePath(configFileName)));
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
 * @param {Array.<string>} nestedProps - An array of nesting level for all
 * options.
 * @param {Array.<string>} cliArgs - An array of command-line arguments
 * containing options and their associated values.
 *
 * @returns {Object} An updated options object where each option from
 * the command-line is paired with its value, structured into nested objects
 * as defined.
 */
function _pairArgumentValue(nestedProps, cliArgs) {
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
 * Recursively traverses the options object to print the usage information
 * for each option category and individual option.
 *
 * @function _cycleCategories
 *
 * @param {Object} options - The options object containing CLI options.
 * It may include nested categories and individual options.
 */
function _cycleCategories(options) {
  for (const [name, option] of Object.entries(options)) {
    // If the current entry is a category and not a leaf option, recurse into it
    if (!Object.prototype.hasOwnProperty.call(option, 'value')) {
      _cycleCategories(option);
    } else {
      // Prepare description
      const descName = ` --${option.cliName || name}`;

      // Get the value
      let optionValue = option.value;

      // Prepare value for option that is not null and is array of strings
      if (optionValue !== null && option.types.includes('string[]')) {
        optionValue =
          '[' + optionValue.map((item) => `'${item}'`).join(', ') + ']';
      }

      // Prepare value for option that is not null and is a string
      if (optionValue !== null && option.types.includes('string')) {
        optionValue = `'${optionValue}'`;
      }

      // Display correctly aligned messages
      console.log(
        descName.green,
        `${('<' + option.types.join('|') + '>').yellow}`,
        `${String(optionValue).bold}`.blue,
        `- ${option.description}.`
      );
    }
  }
}

export default {
  getOptions,
  setOptions,
  mergeOptions,
  mapToNewOptions,
  isAllowedConfig,
  printLicense,
  printUsage,
  printVersion
};
