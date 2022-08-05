/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const { readFileSync } = require('fs');
const path = require('path');

const { log } = require('./logger.js');
const packageVersion = require('../package.json').version;

/** Clear text from whitespaces with a regex rule
 * @export utils
 * @param rule {string} The rule for clearing a string, default to /\s\s+/g
 */
const clearText = (text, rule = /\s\s+/g, replacer = ' ') =>
  text.replaceAll(rule, replacer).trim();

/** Fix to supported type format if MIME
 * @export utils
 * @param type {string} Type to be corrected
 * @param outfile {string} Name of the outfile
 */
const fixType = (type, outfile) => {
  // MIME types
  const mimeTypes = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'application/pdf': 'pdf',
    'image/svg+xml': 'svg'
  };

  // Formats
  const formats = ['png', 'jpeg', 'pdf', 'svg'];

  // Check if type and outfile's extensions are the same
  if (outfile) {
    const outType = outfile.split('.').pop();

    // Check if extension has a correct type
    if (formats.includes(outType) && type !== outType) {
      type = outType;
    }
  }

  // Return a correct type
  return mimeTypes[type] || formats.find((t) => t === type) || 'png';
};

/** Handles the provided resources
 * @export utils
 * @param resources {string} The stringified resources
 * @param allowFileResources {string} Decide if resources from file are allowed
 */
const handleResources = (resources = false, allowFileResources) => {
  const allowedProps = ['js', 'css', 'files'];

  let handledResources = resources;
  let correctResources = false;

  // Try to load resources from a file
  if (allowFileResources) {
    try {
      if (!resources) {
        handledResources = isCorrectJSON(
          readFileSync('resources.json', 'utf8')
        );
      } else if (resources && resources.endsWith('.json')) {
        handledResources = isCorrectJSON(
          readFileSync(path.join(__basedir, resources), 'utf8')
        );
      } else {
        handledResources = isCorrectJSON(resources);
        if (handledResources === true) {
          handledResources = isCorrectJSON(
            readFileSync('resources.json', 'utf8')
          );
        }
      }
    } catch (notice) {
      return log(3, `[cli] No resources found.`);
    }
  } else {
    // Try to get JSON
    handledResources = isCorrectJSON(resources);
    delete handledResources.files;
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
    return log(3, `[cli] No resources found.`);
  }

  // Handle files section
  if (handledResources.files) {
    handledResources.files = handledResources.files
      .split(',')
      .map((item) => item.trim());
    if (!handledResources.files || handledResources.files.length <= 0) {
      delete handledResources.files;
    }
  }

  // Return resources
  return handledResources;
};

/** Check if provided data is or can be a correct JSON
 * @export utils
 * @param data {any} Data to be checked
 * @param toString {boolean} If true, return stringified representation
 */
const isCorrectJSON = (data, toString) => {
  try {
    // Get the string representation if not already before parsing
    const parsedData = JSON.parse(
      typeof data !== 'string' ? JSON.stringify(data) : data
    );

    // Return a stringified representation of a JSON if required
    if (typeof parsedData !== 'string' && toString) {
      return JSON.stringify(parsedData);
    }

    // Return a JSON
    return parsedData;
  } catch (error) {
    return false;
  }
};

/** Check if item is an object
 * @export utils
 * @param item {any} Item to be checked
 */
const isObject = (item) =>
  typeof item === 'object' && !Array.isArray(item) && item !== null;

/** Maps the old options to the new config structure
 * @export utils
 * @param oldOptions {any} Options to be mapped
 */
const mapToNewConfig = (oldOptions) => {
  const newOptions = {};
  const nestedArgs = require('./schemas/config.js').nestedArgs;

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

/** Merge the new options to the options object. It omits undefined values
 * @export utils
 * @param options {any} Old options
 * @param newOptions {any} New options
 */
const mergeConfigOptions = (options, newOptions) => {
  for (const [key, value] of Object.entries(newOptions)) {
    options[key] = isObject(value)
      ? mergeConfigOptions(options[key], value)
      : value !== undefined
      ? value
      : options[key];
  }
  return options;
};

/** Stringifies object with options. Possible to preserve functions with
 * allowFunctions flag
 * @export utils
 * @param options {any} Options to stringify
 * @param allowFunctions {any} Flag for keeping functions
 */
const optionsStringify = (options, allowFunctions) => {
  const replacerCallback = (name, value) => {
    if (typeof value === 'string') {
      value = value.trim();

      // If allowFunctions is set to true, preserve functions
      if (
        (value.startsWith('function(') || value.startsWith('function (')) &&
        value.endsWith('}')
      ) {
        value = allowFunctions
          ? `EXP_FUN${(value + '').replaceAll(/\n|\t|\r/g, ' ')}EXP_FUN`
          : undefined;
      }
    }

    return typeof value === 'function'
      ? `EXP_FUN${(value + '').replaceAll(/\n|\t|\r/g, ' ')}EXP_FUN`
      : value;
  };

  // Stringify options and if required, replace special functions marks
  return JSON.stringify(options, replacerCallback).replaceAll(
    /"EXP_FUN|EXP_FUN"/g,
    ''
  );
};

/** Pairs argument with a corresponding value
 * @export utils
 * @param options {object} All server options
 * @param args {string[]} Array of arguments from a user
 */
const pairArgumentValue = (options, args, defaultConfig) => {
  const nestedArgs = require('./schemas/config.js').nestedArgs;
  for (let i = 0; i < args.length; i++) {
    let option = args[i].replace(/\-/g, '');

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
};

/** Prints the export server logo
 * @export utils
 * @param noLogo {boolean} Whether to display logo or text
 */
const printLogo = (noLogo) => {
  // Print text only
  if (noLogo) {
    console.log(`Starting highcharts export server v${packageVersion}...`);
    return;
  }

  // Print the logo
  console.log(
    readFileSync(__dirname + '/../msg/startup.msg').toString().bold.yellow,
    `v${packageVersion}`
  );
};

/** Prints the CLI usage. If required, it can list properties recursively
 * @export utils
 */
const printUsage = (defaultConfig) => {
  const pad = 48;
  const readme = 'https://github.com/highcharts/node-export-server#readme';

  // Display readme information
  console.log(
    'Usage of CLI arguments:'.bold,
    '\n------',
    `\nFor more detailed information visit readme at: ${readme.bold.yellow}.`
  );

  const cycleCategories = (categories) => {
    for (const [name, option] of Object.entries(categories)) {
      // If category has more levels, go further
      if (!option.hasOwnProperty('value')) {
        cycleCategories(option);
      } else {
        let descName = `  --${option.cliName || name} ${
          ('<' + option.type + '>').green
        } `;
        if (descName.length < pad) {
          for (let i = descName.length; i < pad; i++) {
            descName += '.';
          }
        }

        // Display correctly aligned messages
        console.log(
          descName,
          option.description,
          `[Default: ${option.value.toString().bold}]`.blue
        );
      }
    }
  };

  // Cycle through options of each categories and display the usage info
  Object.keys(defaultConfig).forEach((category) => {
    // Only puppeteer and highcharts categories cannot be configured through CLI
    if (!['puppeteer', 'highcharts'].includes(category)) {
      console.log(`\n${category.toUpperCase()}`.red);
      cycleCategories(defaultConfig[category]);
    }
  });
  console.log('\n');
};

/** Rounds number to passed precision
 * @export utils
 * @param value {number} Number to round
 * @param precision {number} A precision of rounding
 */
const roundNumber = (value, precision = 1) => {
  const multiplier = Math.pow(10, precision || 0);
  return Math.round(+value * multiplier) / multiplier;
};

/** Casts the item to boolean
 * @export utils
 * @param item {any} Item to be cast
 */
const toBoolean = (item) =>
  ['false', 'undefined', 'null', 'NaN', '0', ''].includes(item)
    ? false
    : !!item;

/** If necessary, places a custom code inside a function
 * @export utils
 * @param customCode {any} The customCode
 */
const wrapAround = (customCode, allowFileResources) => {
  if (customCode && typeof customCode === 'string') {
    customCode = customCode.trim();

    if (allowFileResources && customCode.endsWith('.js')) {
      return wrapAround(readFileSync(path.join(__basedir, customCode), 'utf8'));
    } else if (
      !(
        customCode.startsWith('function()') ||
        customCode.startsWith('function ()') ||
        customCode.startsWith('()=>') ||
        customCode.startsWith('() =>')
      )
    ) {
      return `() => { ${customCode} }`;
    }
    return customCode.replace(/;$/, '');
  }
};

module.exports = {
  clearText,
  fixType,
  handleResources,
  isObject,
  isCorrectJSON,
  mapToNewConfig,
  mergeConfigOptions,
  optionsStringify,
  pairArgumentValue,
  printLogo,
  printUsage,
  roundNumber,
  toBoolean,
  wrapAround
};
