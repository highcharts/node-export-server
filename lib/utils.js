/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join as pather } from 'path';

import { defaultConfig } from '../lib/schemas/config.js';
import { log } from './logger.js';

const MAX_BACKOFF_ATTEMPTS = 6;

export const __dirname = fileURLToPath(new URL('../.', import.meta.url));

/**
 * Clears text from whitespaces with a regex rule.
 *
 * @param {string} rule - The rule for clearing a string, default to /\s\s+/g.
 * @return {string} - Cleared text.
 */
export const clearText = (text, rule = /\s\s+/g, replacer = ' ') =>
  text.replaceAll(rule, replacer).trim();

/**
 * Delays calling the function by time calculated based on the backoff
 * algorithm.
 *
 * @param {function} fn - A function to try to call with the backoff algorithm
 * on.
 * @param {number} attempt - The number of an attempt, where the first one is 0.
 */
export const expBackoff = async (fn, attempt = 0, ...args) => {
  try {
    // Try to call the function
    return await fn(...args);
  } catch (error) {
    // Calculate delay in ms
    const delayInMs = 2 ** attempt * 1000;

    // If the attempt exceeds the maximum attempts of reapeat, throw an error
    if (++attempt >= MAX_BACKOFF_ATTEMPTS) {
      throw error;
    }

    // Wait given amount of time
    await new Promise((response) => setTimeout(response, delayInMs));
    log(
      3,
      `[pool] Waited ${delayInMs}ms until next call for the resource id: ${args[0]}.`
    );

    // Try again
    return expBackoff(fn, attempt, ...args);
  }
};

/**
 * Fixes to supported type format if MIME.
 *
 * @param {string} type - Type to be corrected.
 * @param {string} outfile - Name of the outfile.
 */
export const fixType = (type, outfile) => {
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

/**
 * Handles the provided resources.
 *
 * @param {string} resources - The stringified resources.
 * @param {string} allowFileResources - Decide if resources from file are
 * allowed.
 */
export const handleResources = (resources = false, allowFileResources) => {
  const allowedProps = ['js', 'css', 'files'];

  let handledResources = resources;
  let correctResources = false;

  // Try to load resources from a file
  if (allowFileResources && resources.endsWith('.json')) {
    try {
      if (!resources) {
        handledResources = isCorrectJSON(
          readFileSync('resources.json', 'utf8')
        );
      } else if (resources && resources.endsWith('.json')) {
        handledResources = isCorrectJSON(readFileSync(resources, 'utf8'));
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

    // Get rid of the files section
    if (!allowFileResources) {
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
    return log(3, `[cli] No resources found.`);
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
};

/**
 * Checks if provided data is or can be a correct JSON.
 *
 * @param {any} data - Data to be checked.
 * @param {boolean} toString - If true, return stringified representation.
 */
export function isCorrectJSON(data, toString) {
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
}

/**
 * Checks if item is an object.
 *
 * @param {any} item - Item to be checked.
 */
export const isObject = (item) =>
  typeof item === 'object' && !Array.isArray(item) && item !== null;

/**
 * Checks if string contains private range urls.
 *
 * @export utils
 * @param item {string} item to be checked
 */
export const isPrivateRangeUrlFound = (item) => {
  return [
    'localhost',
    '(10).(.*).(.*).(.*)',
    '(127).(.*).(.*).(.*)',
    '(172).(1[6-9]|2[0-9]|3[0-1]).(.*).(.*)',
    '(192).(168).(.*).(.*)'
  ].some((ipRegEx) =>
    item.match(`xlink:href="(?:(http://|https://))?${ipRegEx}`)
  );
};

/**
 * Creates and returns a deep copy of the given object.
 *
 * @param {object} object - Object to copy.
 * @return {object} - Deep copy of the object.
 */
export const deepCopy = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const copy = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }

  return copy;
};

/**
 * Stringifies object with options. Possible to preserve functions with
 * allowFunctions flag.
 *
 * @param {object} options - Options to stringify.
 * @param {boolean} allowFunctions - Flag for keeping functions.
 */
export const optionsStringify = (options, allowFunctions) => {
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

/**
 * Prints the export server logo.
 *
 * @param {boolean} noLogo - Whether to display logo or text.
 */
export const printLogo = (noLogo) => {
  // Get package version either from env or from package.json
  const packageVersion = JSON.parse(
    readFileSync(pather(__dirname, 'package.json'))
  ).version;

  // Print text only
  if (noLogo) {
    console.log(`Starting highcharts export server v${packageVersion}...`);
    return;
  }

  // Print the logo
  console.log(
    readFileSync(__dirname + '/msg/startup.msg').toString().bold.yellow,
    `v${packageVersion}`
  );
};

/**
 * Prints the CLI usage. If required, it can list properties recursively
 */
export function printUsage() {
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
      if (!Object.prototype.hasOwnProperty.call(option, 'value')) {
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
}

/**
 * Rounds number to passed precision.
 *
 * @param {number} value - Number to round.
 * @param {number} precision - A precision of rounding.
 */
export const roundNumber = (value, precision = 1) => {
  const multiplier = Math.pow(10, precision || 0);
  return Math.round(+value * multiplier) / multiplier;
};

/**
 * Casts the item to boolean.
 *
 * @param {any} item - Item to be cast.
 */
export const toBoolean = (item) =>
  ['false', 'undefined', 'null', 'NaN', '0', ''].includes(item)
    ? false
    : !!item;

/**
 * If necessary, places a custom code inside a function.
 *
 * @param {any} customCode - The customCode.
 */
export const wrapAround = (customCode, allowFileResources) => {
  if (customCode && typeof customCode === 'string') {
    customCode = customCode.trim();

    if (customCode.endsWith('.js')) {
      return allowFileResources
        ? wrapAround(readFileSync(customCode, 'utf8'))
        : false;
    } else if (
      customCode.startsWith('function()') ||
      customCode.startsWith('function ()') ||
      customCode.startsWith('()=>') ||
      customCode.startsWith('() =>')
    ) {
      return `(${customCode})()`;
    }
    return customCode.replace(/;$/, '');
  }
};

/**
 * Utility to measure time.
 */
export const measureTime = () => {
  const start = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - start) / 1000000;
};

export default {
  __dirname,
  clearText,
  expBackoff,
  fixType,
  handleResources,
  isCorrectJSON,
  isObject,
  isPrivateRangeUrlFound,
  optionsStringify,
  printLogo,
  printUsage,
  roundNumber,
  toBoolean,
  wrapAround,
  measureTime
};
