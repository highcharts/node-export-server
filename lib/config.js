/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { existsSync, readFileSync, promises as fsPromises } from 'fs';

import prompts from 'prompts';

import { log } from './logger.js';
import { deepCopy, isObject, printUsage, toBoolean } from './utils.js';
import {
  absoluteProps,
  defaultConfig,
  nestedArgs,
  promptsConfig
} from './schemas/config.js';

let generalOptions = {};

/**
 * Getter for the general options.
 *
 * @return {object} - General options object.
 */
export const getOptions = () => generalOptions;

/**
 * Initializes and sets the general options for the server instace.
 *
 * @param {object} userOptions - Additional user options (e.g. from the node
 * module usage).
 * @param {string[]} args - CLI arguments.
 * @return {object} - General options object.
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
 * Displays a prompt for the manual configuration.
 *
 * @param {string} configFileName - The name of a configuration file.
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
        // Get the default modules
        if (prompt.name === 'modules') {
          answer = answer.length
            ? answer.map((module) => prompt.choices[module])
            : prompt.choices;

          configFile[prompt.section][prompt.name] = answer;
        } else {
          configFile[prompt.section] = recursiveProps(
            Object.assign({}, configFile[prompt.section] || {}),
            prompt.name.split('.'),
            answer
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
            log(1, `[config] Error while creating config.json: ${error}`);
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
 * Maps the old options to the new config structure.
 *
 * @param {object} oldOptions - Options to be mapped.
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
 * Merges the new options to the options object. It omits undefined values.
 *
 * @param {object} options - Old options.
 * @param {object} newOptions - New options.
 * @param {string[]} absoluteProps - Array of object names that should be force
 * merged.
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
 * Initializes options for the `startExport` method by merging user options
 * with the general options.
 *
 * @param {any} exportOptions - User options for exporting.
 * @param {any} generalOptions - General options are used for the export server.
 * @return {object} - User options merged with default options.
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
 * Loads the configuration from a custom JSON file.
 *
 * @param {string[]} args - CLI arguments.
 * @return {object} - Options object from the JSON file.
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
      log(1, `[config] Unable to load config from the ${fileName}: ${error}`);
    }
  }

  // No additional options to return
  return {};
}

/**
 * Setting correct values of the options from the default config.
 *
 * @param {object} configObj - The config object based on which the initial
 * configuration be made.
 * @param {object} customObj - The custom object which can contain additional
 * option values to set.
 * @param {string} propChain - Required for creating a string chain of
 * properties for nested arguments.
 */
function updateDefaultConfig(configObj, customObj = {}, propChain = '') {
  Object.keys(configObj).forEach((key) => {
    const entry = configObj[key];
    const customValue = customObj && customObj[key];
    let numEnvVal;

    if (typeof entry.value === 'undefined') {
      updateDefaultConfig(entry, customValue, `${propChain}.${key}`);
    } else {
      // If a value from a custom JSON exists, it take precedence
      if (customValue !== undefined) {
        entry.value = customValue;
      }

      // If a value from an env variable exists, it take precedence
      if (entry.envLink) {
        // Load the env var
        if (entry.type === 'boolean') {
          entry.value = toBoolean(
            [process.env[entry.envLink], entry.value].find(
              (el) => el || el === 'false'
            )
          );
        } else if (entry.type === 'number') {
          numEnvVal = +process.env[entry.envLink];
          entry.value = numEnvVal >= 0 ? numEnvVal : entry.value;
        } else if (entry.type.indexOf(']') >= 0 && process.env[entry.envLink]) {
          entry.value = process.env[entry.envLink].split(',');
        } else {
          entry.value = process.env[entry.envLink] || entry.value;
        }
      }
    }
  });
}

/**
 * Inits options recursively.
 *
 * @param {any} items - Items to update options from.
 * @return {object} - Updated options object.
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
 * Pairs argument with a corresponding value.
 *
 * @param {object} options - All server options.
 * @param {string[]} args - Array of arguments from a user.
 * @param {object} defaultConfig - The default config object.
 */
function pairArgumentValue(options, args, defaultConfig) {
  for (let i = 0; i < args.length; i++) {
    let option = args[i].replace(/-/g, '');

    // Find the right place for property's value
    const propertiesChain = nestedArgs[option]
      ? nestedArgs[option].split('.')
      : [];

    propertiesChain.reduce((obj, prop, index) => {
      if (propertiesChain.length - 1 === index) {
        // Finds an option and set a corresponding value
        if (typeof obj[prop] !== 'undefined') {
          if (args[++i]) {
            obj[prop] = args[i] || obj[prop];
          } else {
            console.log(`Missing argument value for ${option}!`.red, '\n');
            options = printUsage(defaultConfig);
          }
        }
      }
      return obj[prop];
    }, options);
  }

  return options;
}

/**
 * Recursively sets a property in a correct indentation level based on the
 * array of nested properties names.
 *
 * @param {object} objectToUpdate - Object where a property must be set on a
 * correct level.
 * @param  {string[]}nestedNames - Array of nasted names that indicates
 * indentation level.
 * @param {any} value - A value to assign to the property.
 * @return {object} - Updated options object.
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
