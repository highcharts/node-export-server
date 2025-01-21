/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module provides a streamlined manual configuration feature
 * that prompts users to customize and save their desired settings into
 * a configuration file.
 */

import { existsSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';

import prompts from 'prompts';

import { isAllowedConfig } from './config.js';
import { log, logWithStack } from './logger.js';
import { getAbsolutePath } from './utils.js';

import { defaultConfig } from './schemas/config.js';

/**
 * Initiates a manual configuration process, prompting the user to configure
 * settings based on the specified configuration file and saving the results
 * to the file.
 *
 * @async
 * @function manualConfig
 *
 * @param {string} configFileName - The name of the configuration file to save
 * to.
 * @param {boolean} allowCodeExecution - A flag indicating whether code
 * execution is allowed.
 *
 * @returns {Promise<boolean>} A Promise that resolves to true once the manual
 * configuration process is completed and the updated configuration is saved.
 */
export async function manualConfig(configFileName, allowCodeExecution) {
  // Initialize an empty object to hold the config data
  let configFile = {};

  // Check if the specified configuration file already exists
  if (existsSync(getAbsolutePath(configFileName))) {
    try {
      // If the file exists, read and parse its contents
      configFile = isAllowedConfig(
        readFileSync(getAbsolutePath(configFileName), 'utf8'),
        false,
        allowCodeExecution
      );
    } catch (error) {
      log(
        2,
        '[prompt] The existing file for the `createConfig` option is not valid JSON. Using an empty object for the config instead.'
      );
    }
  }

  /**
   * Handles submitting of answers during the prompt process for each
   * configuration category.
   *
   * @async
   * @function onSubmit
   *
   * @param {unknown} _ - Unused, automatically passed argument.
   * @param {Array.<string>} categories - The selected categories to configure.
   *
   * @returns {Promise<boolean>} A Promise that resolves to true once
   * the configuration process is completed and saved.
   */
  const onSubmit = async (_, categories) => {
    // Track how many questions have been answered
    let questionsCounter = 0;

    // Collect all prompt questions for selected categories
    const allQuestions = [];

    // Object to store the prompt responses for configuration
    const promptsConfig = {};

    // Iterate through each selected category
    for (const section of categories) {
      Object.entries(defaultConfig[section]).forEach(([category, options]) => {
        // Init an array to store prompts for this section if not already done
        if (!promptsConfig[section]) {
          promptsConfig[section] = [];
        }

        // Add prompts for any option with prompt configuration
        if (options.promptOptions) {
          promptsConfig[section].push(
            _preparePrompt([category, options], section)
          );
        }

        // Handle subsections such as `proxy`, `rateLimiting` and `ssl`
        if (['proxy', 'rateLimiting', 'ssl'].includes(category)) {
          Object.entries(defaultConfig[section][category]).forEach(
            (element) => {
              // Add prompts for any option with prompt configuration
              if (element[1].promptOptions) {
                promptsConfig[section].push(
                  _preparePrompt(
                    [`${category}.${element[0]}`, element[1]],
                    section
                  )
                );
              }
            }
          );
        }
      });

      // Append all prompts for the section to the full list of questions
      allQuestions.push(...promptsConfig[section]);
    }

    // Prompt the user with the collected questions
    await prompts(allQuestions, {
      /**
       * Handles submission of individual prompt answers.
       *
       * @async
       * @function onSubmit
       *
       * @param {Object} prompt - The current prompt being answered.
       * @param {unknown} answer - The user's response to the prompt.
       *
       * @returns {Promise<void>} A Promise that resolves once the answer
       * is processed.
       */
      onSubmit: async (prompt, answer) => {
        // Handle specific script configurations
        if (
          ['coreScripts', 'moduleScripts', 'indicatorScripts'].includes(
            prompt.name
          )
        ) {
          // If the answer is provided, use the selected values or the defaults
          answer = answer.length
            ? answer.map((module) => prompt.choices[module])
            : prompt.choices;

          // Store the answer in the config file under the appropriate section
          configFile[prompt.section][prompt.name] = answer;
        } else {
          // Update the config file with an answer, handling nested properties
          configFile[prompt.section] = _recursiveProps(
            Object.assign({}, configFile[prompt.section] || {}),
            prompt.name.split('.'),
            prompt.choices ? prompt.choices[answer] : answer
          );
        }

        // If all questions have been answered, save the updated config
        if (++questionsCounter === allQuestions.length) {
          try {
            // Save the prompt result
            await writeFile(
              getAbsolutePath(configFileName),
              isAllowedConfig(configFile, true, allowCodeExecution),
              'utf8'
            );
          } catch (error) {
            logWithStack(
              1,
              error,
              `[prompt] An error occurred while creating the ${configFileName} file.`
            );
          }
          return true;
        }
      }
    });
    return true;
  };

  // Generate a list of categories available for configuration
  const choices = Object.keys(defaultConfig).map((choice) => ({
    title: `${choice} options`,
    value: choice
  }));

  // Prompt the user to select one or more categories to configure
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
}

/**
 * Prepares a prompt configuration object based on the provided entry
 * and section. The prompt configuration includes the prompt type, initial
 * value, format, and additional options for rendering and validation
 * in interactive prompts.
 *
 * @function _preparePrompt
 *
 * @param {Array.[string, Object]} entry - An array where the first element
 * is the name of the option, and the second element is an object containing
 * the option details.
 * @param {string} section - The section name for the prompt, used to categorize
 * the prompt message.
 *
 * @returns {Object} The prepared prompt object containing configuration
 * for the interactive prompt, including the type, initial value,
 * and any formatting or choices required.
 */
function _preparePrompt(entry, section) {
  // Retrieve the option name
  const name = entry[0];

  // Retrieve the option configuration
  const option = entry[1];

  // Collect common data for the prompt
  const prompt = {
    name,
    message: `${section}.${name}`.blue + ` - ${option.description}`,
    section,
    ...option.promptOptions
  };

  // Update the prompt configuration with type-specific data
  switch (prompt.type) {
    case 'text':
      prompt.initial = option.value;
      prompt.format = (value) => (typeof value === 'string' ? value : null);
      break;
    case 'number':
      prompt.initial = option.value;
      prompt.format = (value) => (typeof value === 'number' ? value : null);
      break;
    case 'toggle':
      prompt.initial = option.value;
      prompt.format = (value) => (typeof value === 'boolean' ? value : null);
      break;
    case 'list':
      prompt.initial = option.value.join(';');
      break;
    case 'select':
      prompt.initial = 0;
      break;
    case 'multiselect':
      prompt.choices = option.value;
      break;
  }

  // Return the prompt configuration
  return prompt;
}

/**
 * Recursively updates or creates nested properties within an object and assigns
 * the final value to the deepest property.
 *
 * @function _recursiveProps
 *
 * @param {Object} objectToUpdate - The object in which nested properties
 * will be updated or created.
 * @param {Array.<string>} nestedNames - An array of property names representing
 * the nesting hierarchy.
 * @param {unknown} value - The final value to be assigned to the deepest nested
 * property.
 *
 * @returns {Object} The updated object with the specified value assigned
 * to the nested property.
 */
function _recursiveProps(objectToUpdate, nestedNames, value) {
  while (nestedNames.length > 1) {
    // Retrieve and remove the next property name from the nested hierarchy
    const propName = nestedNames.shift();

    // Create an empty object if the property doesn't exist
    if (!Object.prototype.hasOwnProperty.call(objectToUpdate, propName)) {
      objectToUpdate[propName] = {};
    }

    // Recur to the next level, cloning the current property object
    objectToUpdate[propName] = _recursiveProps(
      Object.assign({}, objectToUpdate[propName]),
      nestedNames,
      value
    );

    // Return after each recursive call
    return objectToUpdate;
  }

  // Assign the final value to the last property in the chain
  objectToUpdate[nestedNames[0]] = value;

  // Return the fully updated object
  return objectToUpdate;
}

export default {
  manualConfig
};
