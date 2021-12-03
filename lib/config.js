/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

// Here we should fetch all the configuration options.
//
// We should support loading configurations either from a JSON file,
// or from environment variables.
//
// JSON files are necessary because listing modules in an env var
// is really tedious. Also, a lot of windows users have been having issues
// loading the env vars, and so they can serve as an alternative to those.
//
// The support should be stacked, that is, first load the env vars,
// then overwrite with JSON if it's provided.
//
// We need to consider if we're willing to break the CLI compatibility.
// If so, we should directly map the config to flags automatically.

const prompts = require('prompts');
const { existsSync, readFileSync, promises: fsPromises } = require('fs');

const cache = require('./cache.js');
const { log } = require('./logger.js');

const config = require('./schemas/config.js');
const configPrompts = require('./schemas/configPrompts.js');

// Map of flags
const flags = {};

/**
 * Load configuration from JSON file.
 *
 * Not really needed with dotenv, but some of the options doesn't make sense to
 * use the env variables for, such as anything dealing with direct exporting
 * (e.g. batch, infile, resources, and so on), and in those cases it makes sense
 * to have everything in one file, e.g.
 *
 * {
 *    highcharts: {
 *      version: 'latest'
 *    },
 *    logging: {
 *      level: 4
 *    },
 *    chart: {
 *      options: { title: {text: 'Hello World!'}},
 *      constr: 'Chart',
 *      type: 'png'
 *    }
 * }
 *
 * This is also combinable with environment vars and .dotenv files,
 * so that global configuration can be set through either of those,
 * and then the loaded config simply overrides where specified.
 *
 * The chart part of the loaded config would in any case not be loaded by
 * the config manager, but by the CLI system. Flags are also applied last,
 * which means it should be possible to set global config via .env,
 * override some parts of it in a config file, set exporting properties in a
 * json file, and then load the chart options using a CLI flag.
 *
 * This solves for a lot of use cases.
 *
 */
const loadConfigFile = async (configFile) => {
  if (!configFile) {
    return true;
  }

  // Load a config file, and override the loaded configuration.
  try {
    const configJson = JSON.parse(await fsPromises.readFile(configFile));

    // Override each nested object to avoid accidental overwriting of defaults.
    for (const category of Object.keys(config)) {
      Object.assign(config[category], configJson[category] || {});
    }
  } catch (error) {
    log(
      1,
      `[config.js] - Unable to load config from the ${configFile}: ${error}.`
    );
  }
};

/** Recursively sets a property in a correct indentation level based on the
 * array of nested properties names
 * @export utils
 * @param objectToUpdate {object} Object where a property must be set on a
 * correct level
 * @param nestedNames {string[]} Array of nasted names that indicates
 * indentation level
 * @param value {any} A value to assign to the property
 */
const recursiveProps = (objectToUpdate, nestedNames, value) => {
  while (nestedNames.length > 1) {
    const propName = nestedNames.shift();

    // Create a property in object if it doesn't exist
    if (!objectToUpdate.hasOwnProperty(propName)) {
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
 * Function for the CLI configuration
 */
const manualConfiguration = async (configFileName) => {
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
      configPrompts[section] = configPrompts[section].map((option) => ({
        ...option,
        section
      }));

      // Collect the questions
      allQuestions = [...allQuestions, ...configPrompts[section]];
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
          } catch (e) {
            log(1, `[config] - Error while creating config.json: ${e}.`);
          }
          return true;
        }
      }
    });

    return true;
  };

  // Find the categories
  const choices = Object.keys(configPrompts).map((choice) => ({
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
 * Init default options recursively.
 */
const initDefaultOptions = (items) => {
  let options = {};
  for (const [name, item] of Object.entries(items)) {
    options[name] = item.hasOwnProperty('value')
      ? item.value
      : initDefaultOptions(item);
  }
  return options;
};

/**
 * Flagify a configuration entry so that it can be controlled by CLI flags or
 * a flat hashmap.
 */
const flagify = (option, overriddenName, description) => {
  if (!description) {
    description = overridenName;
    overriddenName = false;
  }

  // The actual flag is the last entry in option.
  const nameArr = option.split('.');
  const name = overriddenName || nameArr[nameArr.length];

  flags[name] = {
    option,
    description
  };
};

/**
 * Apply an object containing flags to the config
 */
const applyFlagOptions = (flagsToLoad) => {
  Object.keys(flagsToLoad).forEach((flag) => {
    if (flags[flag]) {
      // Set the option

      let root = config;

      const oa = flags[flag].option.split('.');
      let i = 0;

      while (i < oa.length - 2) {
        root = root[oa[i]];
        ++i;
      }

      root[oa[oa.length - 1]] = flagsToLoad[flag];
    }
  });
};

/**
 * Load config.
 *
 * @param configFile - Optional path to a configuration.json file.
 */
const load = async (configFile) => {
  await loadConfigFile(configFile);
  await cache.checkCache(config.highcharts);
};

module.exports = {
  /**
   * Load config.
   *
   * @param configFile - Optional path to a configuration.json file.
   */
  load,
  /**
   * Display a prompt for manual configuration.
   */
  manualConfiguration: async (configFile) => {
    await manualConfiguration(configFile);
  },
  /**
   * Init server's options with default values.
   */
  initDefaultOptions,
  /** Flagify an option */
  flagify,
  /** Apply flag options */
  applyFlagOptions
};
