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

import { deepCopy, mergeConfigOptions } from './utils.js';
import { defaultConfig, promptsConfig } from './schemas/config.js';

/**
 * Loads the configuration from JSON file.
 *
 * @param {object} options - All options object.
 * @return {object} - Updated options object.
 */
export const loadConfigFile = async (options) => {
  const configFile = options.customCode && options.customCode.loadConfig;
  try {
    // An additional config file
    if (configFile) {
      // Return options updated with the properties from the loaded JSON file
      options = mergeConfigOptions(
        options,
        JSON.parse(readFileSync(configFile))
      );
    }

    // Return updated options
    return options;
  } catch (error) {
    log(1, `[config] Unable to load config from the ${configFile}: ${error}`);
  }
};

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
const recursiveProps = (objectToUpdate, nestedNames, value) => {
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
};

/**
 * Displays a prompt for the manual configuration.
 *
 * @param {string} configFileName - The name of a configuration file.
 */
export const manualConfiguration = async (configFileName) => {
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
 * Merges user export settings with default export settings.
 * Automatically merges 'options', 'globalOptions', 'themeOptions', 'resources'
 * without going down recursively.
 *
 * @param {*} exportOptions - User settings for export.
 * @return {object} - User settings merged with default export settings.
 */
export const getDefaultOptions = (exportOptions, poolOptions) => {
  return mergeConfigOptions(
    poolOptions,
    exportOptions,
    // Omit going down recursively with the belows
    ['options', 'globalOptions', 'themeOptions', 'resources']
  );
}

/**
 * Inits default options recursively.
 *
 * @param {any} items - Items to update options from.
 * @return {object} - Updated options object.
 */
export const initDefaultOptions = (items) => {
  let options = {};
  for (const [name, item] of Object.entries(items)) {
    options[name] = Object.prototype.hasOwnProperty.call(item, 'value')
      ? item.value
      : initDefaultOptions(item);
  }
  return options;
};

/**
 * Initializes options for the `startExport` method by merging user options
 * with the default options and pool options.
 *
 * @param {any} exportOptions - User options for exporting.
 * @param {any} poolOptions - Options of the pool which is used for export.
 * @return {object} - User options merged with default options.
 */
export const initExportSettings = (exportOptions, poolOptions = {}) => {
  let options = {};

  if (exportOptions.svg) {
    options = poolOptions; // default poolOptions
    options.export.type = exportOptions.type || exportOptions.export.type;
    options.export.scale = exportOptions.scale || exportOptions.export.scale;
    options.payload = {
      svg: exportOptions.svg
    };
  } else {
    options = mergeConfigOptions(
      poolOptions,
      exportOptions,
      // Omit going down recursively with the belows
      ['options', 'globalOptions', 'themeOptions', 'resources']
    );
  }

  options.export.outfile = options.export?.outfile || `chart.${options.export?.type || '.png'}`;
  return options;
}

export default {
  loadConfigFile,
  manualConfiguration,
  initDefaultOptions,
  initExportSettings
};
