/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { existsSync, readFileSync, promises as fsPromises } from 'fs';

import prompts from 'prompts';

import {
  absoluteProps,
  defaultConfig,
  nestedArgs,
  promptsConfig
} from './schemas/config.js';
import { envs } from './envs.js';
import { log, logWithStack } from './logger.js';
import { deepCopy, isObject, printUsage, toBoolean } from './utils.js';

let generalOptions = {};

/**
 * Retrieves and returns the general options for the export process.
 *
 * @returns {Object} The general options object.
 */
export const getOptions = () => generalOptions;

/**
 * Initializes and sets the general options for the server instace, keeping
 * the principle of the options load priority. It accepts optional userOptions
 * and args from the CLI.
 *
 * @param {Object} userOptions - User-provided options for customization.
 * @param {Array} args - Command-line arguments for additional configuration
 * (CLI usage).
 *
 * @returns {Object} The updated general options object.
 */
export const setOptions = (userOptions, args) => {
  // Only for the CLI usage
  if (args?.length) {
    // Get the additional options from the custom JSON file
    generalOptions = loadConfigFile(args);
  }

  // Update the default config with a correct option values
  updateDefaultConfig(defaultConfig, generalOptions);

  // Set values for server's options and returns them
  generalOptions = initOptions(defaultConfig);

  // Apply user options if there are any
  if (userOptions) {
    // Merge user options
    generalOptions = mergeConfigOptions(
      generalOptions,
      userOptions,
      absoluteProps
    );
  }

  // Only for the CLI usage
  if (args?.length) {
    // Pair provided arguments
    generalOptions = pairArgumentValue(generalOptions, args, defaultConfig);
  }

  // Return final general options
  return generalOptions;
};

/**
 * Allows manual configuration based on specified prompts and saves
 * the configuration to a file.
 *
 * @param {string} configFileName - The name of the configuration file.
 *
 * @returns {Promise<boolean>} A Promise that resolves to true once the manual
 * configuration is completed and saved.
 */
export const manualConfig = async (configFileName) => {
  // Prepare a config object
  let configFile = {};

  // Check if provided config file exists
  if (existsSync(configFileName)) {
    configFile = JSON.parse(readFileSync(configFileName, 'utf8'));
  }

  // Question about a configuration category
  const onSubmit = async (p, categories) => {
    let questionsCounter = 0;
    let allQuestions = [];

    // Create a corresponding property in the manualConfig object
    for (const section of categories) {
      // Mark each option with a section
      promptsConfig[section] = promptsConfig[section].map((option) => ({
        ...option,
        section
      }));

      // Collect the questions
      allQuestions = [...allQuestions, ...promptsConfig[section]];
    }

    await prompts(allQuestions, {
      onSubmit: async (prompt, answer) => {
        // Get the default module scripts
        if (prompt.name === 'moduleScripts') {
          answer = answer.length
            ? answer.map((module) => prompt.choices[module])
            : prompt.choices;

          configFile[prompt.section][prompt.name] = answer;
        } else {
          configFile[prompt.section] = recursiveProps(
            Object.assign({}, configFile[prompt.section] || {}),
            prompt.name.split('.'),
            prompt.choices ? prompt.choices[answer] : answer
          );
        }

        if (++questionsCounter === allQuestions.length) {
          try {
            await fsPromises.writeFile(
              configFileName,
              JSON.stringify(configFile, null, 2),
              'utf8'
            );
          } catch (error) {
            logWithStack(
              1,
              error,
              `[config] An error occurred while creating the ${configFileName} file.`
            );
          }
          return true;
        }
      }
    });

    return true;
  };

  // Find the categories
  const choices = Object.keys(promptsConfig).map((choice) => ({
    title: `${choice} options`,
    value: choice
  }));

  // Category prompt
  return prompts(
    {
      type: 'multiselect',
      name: 'category',
      message: 'Which category do you want to configure?',
      hint: 'Space: Select specific, A: Select all, Enter: Confirm.',
      instructions: '',
      choices
    },
    { onSubmit }
  );
};

/**
 * Maps old-structured (PhantomJS) options to a new configuration format
 * (Puppeteer).
 *
 * @param {Object} oldOptions - Old-structured options to be mapped.
 *
 * @returns {Object} New options structured based on the defined nestedArgs
 * mapping.
 */
export const mapToNewConfig = (oldOptions) => {
  const newOptions = {};
  // Cycle through old-structured options
  for (const [key, value] of Object.entries(oldOptions)) {
    const propertiesChain = nestedArgs[key] ? nestedArgs[key].split('.') : [];

    // Populate object in correct properties levels
    propertiesChain.reduce(
      (obj, prop, index) =>
        (obj[prop] =
          propertiesChain.length - 1 === index ? value : obj[prop] || {}),
      newOptions
    );
  }
  return newOptions;
};

/**
 * Merges two sets of configuration options, considering absolute properties.
 *
 * @param {Object} options - Original configuration options.
 * @param {Object} newOptions - New configuration options to be merged.
 * @param {Array} absoluteProps - List of properties that should
 * not be recursively merged.
 *
 * @returns {Object} Merged configuration options.
 */
export const mergeConfigOptions = (options, newOptions, absoluteProps = []) => {
  const mergedOptions = deepCopy(options);

  for (const [key, value] of Object.entries(newOptions)) {
    mergedOptions[key] =
      isObject(value) &&
      !absoluteProps.includes(key) &&
      mergedOptions[key] !== undefined
        ? mergeConfigOptions(mergedOptions[key], value, absoluteProps)
        : value !== undefined
          ? value
          : mergedOptions[key];
  }

  return mergedOptions;
};

/**
 * Initializes export settings based on provided exportOptions
 * and generalOptions.
 *
 * @param {Object} exportOptions - Options specific to the export process.
 * @param {Object} generalOptions - General configuration options.
 *
 * @returns {Object} Initialized export settings.
 */
export const initExportSettings = (exportOptions, generalOptions = {}) => {
  let options = {};

  if (exportOptions.svg) {
    options = deepCopy(generalOptions);
    options.export.type = exportOptions.type || exportOptions.export.type;
    options.export.scale = exportOptions.scale || exportOptions.export.scale;
    options.export.outfile =
      exportOptions.outfile || exportOptions.export.outfile;
    options.payload = {
      svg: exportOptions.svg
    };
  } else {
    options = mergeConfigOptions(
      generalOptions,
      exportOptions,
      // Omit going down recursively with the belows
      absoluteProps
    );
  }

  options.export.outfile =
    options.export?.outfile || `chart.${options.export?.type || 'png'}`;
  return options;
};

/**
 * Loads additional configuration from a specified file using
 * the --loadConfig option.
 *
 * @param {Array} args - Command-line arguments to check for
 * the --loadConfig option.
 *
 * @returns {Object} Additional configuration loaded from the specified file,
 * or an empty object if not found or invalid.
 */
function loadConfigFile(args) {
  // Check if the --loadConfig option was used
  const configIndex = args.findIndex(
    (arg) => arg.replace(/-/g, '') === 'loadConfig'
  );

  // Check if the --loadConfig has a value
  if (configIndex > -1 && args[configIndex + 1]) {
    const fileName = args[configIndex + 1];
    try {
      // Check if an additional config file is a correct JSON file
      if (fileName && fileName.endsWith('.json')) {
        // Load an optional custom JSON config file
        return JSON.parse(readFileSync(fileName));
      }
    } catch (error) {
      logWithStack(
        2,
        error,
        `[config] Unable to load the configuration from the ${fileName} file.`
      );
    }
  }

  // No additional options to return
  return {};
}

/**
 * Updates the default configuration object with values from a custom object
 * and environment variables.
 *
 * @param {Object} configObj - The default configuration object.
 * @param {Object} customObj - Custom configuration object to override defaults.
 * @param {string} propChain - Property chain for tracking nested properties
 * during recursion.
 */
function updateDefaultConfig(configObj, customObj = {}, propChain = '') {
  Object.keys(configObj).forEach((key) => {
    const entry = configObj[key];
    const customValue = customObj && customObj[key];

    if (typeof entry.value === 'undefined') {
      updateDefaultConfig(entry, customValue, `${propChain}.${key}`);
    } else {
      // If a value from a custom JSON exists, it take precedence
      if (customValue !== undefined) {
        entry.value = customValue;
      }

      // If a value from an env variable exists, it take precedence
      if (entry.envLink in envs && envs[entry.envLink] !== undefined) {
        entry.value = envs[entry.envLink];
      }
    }
  });
}

/**
 * Initializes options object based on provided items, setting values from
 * nested properties recursively.
 *
 * @param {Object} items - Configuration items to be used for initializing
 * options.
 *
 * @returns {Object} Initialized options object.
 */
function initOptions(items) {
  let options = {};
  for (const [name, item] of Object.entries(items)) {
    options[name] = Object.prototype.hasOwnProperty.call(item, 'value')
      ? item.value
      : initOptions(item);
  }
  return options;
}

/**
 * Pairs argument values with corresponding options in the configuration,
 * updating the options object.
 *
 * @param {Object} options - Configuration options object to be updated.
 * @param {Array} args - Command-line arguments containing values for specific
 * options.
 * @param {Object} defaultConfig - Default configuration object for reference.
 *
 * @returns {Object} Updated options object.
 */
function pairArgumentValue(options, args, defaultConfig) {
  let showUsage = false;
  for (let i = 0; i < args.length; i++) {
    const option = args[i].replace(/-/g, '');

    // Find the right place for property's value
    const propertiesChain = nestedArgs[option]
      ? nestedArgs[option].split('.')
      : [];

    // Get the correct type for CLI args which are passed as strings
    let argumentType;
    propertiesChain.reduce((obj, prop, index) => {
      if (propertiesChain.length - 1 === index) {
        argumentType = obj[prop].type;
      }
      return obj[prop];
    }, defaultConfig);

    propertiesChain.reduce((obj, prop, index) => {
      if (propertiesChain.length - 1 === index) {
        // Finds an option and set a corresponding value
        if (typeof obj[prop] !== 'undefined') {
          if (args[++i]) {
            if (argumentType === 'boolean') {
              obj[prop] = toBoolean(args[i]);
            } else if (argumentType === 'number') {
              obj[prop] = +args[i];
            } else if (argumentType.indexOf(']') >= 0) {
              obj[prop] = args[i].split(',');
            } else {
              obj[prop] = args[i];
            }
          } else {
            log(
              2,
              `[config] Missing value for the '${option}' argument. Using the default value.`
            );
            showUsage = true;
          }
        }
      }
      return obj[prop];
    }, options);
  }

  // Display the usage for the reference if needed
  if (showUsage) {
    printUsage(defaultConfig);
  }

  return options;
}

/**
 * Recursively updates properties in an object based on nested names and assigns
 * the final value.
 *
 * @param {Object} objectToUpdate - The object to be updated.
 * @param {Array} nestedNames - Array of nested property names.
 * @param {any} value - The final value to be assigned.
 *
 * @returns {Object} Updated object with assigned values.
 */
function recursiveProps(objectToUpdate, nestedNames, value) {
  while (nestedNames.length > 1) {
    const propName = nestedNames.shift();

    // Create a property in object if it doesn't exist
    if (!Object.prototype.hasOwnProperty.call(objectToUpdate, propName)) {
      objectToUpdate[propName] = {};
    }

    // Call function again if there still names to go
    objectToUpdate[propName] = recursiveProps(
      Object.assign({}, objectToUpdate[propName]),
      nestedNames,
      value
    );

    return objectToUpdate;
  }

  // Assign the final value
  objectToUpdate[nestedNames[0]] = value;
  return objectToUpdate;
}

export default {
  getOptions,
  setOptions,
  manualConfig,
  mapToNewConfig,
  mergeConfigOptions,
  initExportSettings
};
