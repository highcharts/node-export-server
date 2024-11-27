/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const MAX_BACKOFF_ATTEMPTS = 6;
const readme = 'https://github.com/highcharts/node-export-server#readme';

export const __dirname = fileURLToPath(new URL('../.', import.meta.url));

/**
 * Clears and standardizes text by replacing multiple consecutive whitespace
 * characters with a single space and trimming any leading or trailing
 * whitespace.
 *
 * @param {string} text - The input text to be cleared.
 * @param {RegExp} [rule=/\s\s+/g] - The regular expression rule to match
 * multiple consecutive whitespace characters.
 * @param {string} [replacer=' '] - The string used to replace multiple
 * consecutive whitespace characters.
 *
 * @returns {string} - The cleared and standardized text.
 */
export function clearText(text, rule = /\s\s+/g, replacer = ' ') {
  return text.replaceAll(rule, replacer).trim();
}

/**
 * Creates a deep copy of the given object or array.
 *
 * @param {Object|Array} obj - The object or array to be deeply copied.
 *
 * @returns {Object|Array} - The deep copy of the provided object or array.
 */
export function deepCopy(obj) {
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
}

/**
 * Implements an exponential backoff strategy for retrying a function until
 * a certain number of attempts are reached.
 *
 * @param {Function} fn - The function to be retried.
 * @param {number} [attempt=0] - The current attempt number.
 * @param {...any} args - Arguments to be passed to the function.
 *
 * @returns {Promise} - A promise that resolves to the result of the function
 * if successful.
 *
 * @throws {Error} - Throws an error if the maximum number of attempts
 * is reached.
 */
export async function expBackoff(fn, attempt = 0, ...args) {
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
      `[pool] Waited ${delayInMs}ms until next call for the resource of ID: ${args[0]}.`
    );

    // Try again
    return expBackoff(fn, attempt, ...args);
  }
}

/**
 * Fixes the export type based on MIME types and file extensions.
 *
 * @param {string} type - The original export type.
 * @param {string} outfile - The file path or name.
 *
 * @returns {string} - The corrected export type.
 */
export function fixType(type, outfile) {
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

    if (outType === 'jpg') {
      type = 'jpeg';
    } else if (formats.includes(outType) && type !== outType) {
      type = outType;
    }
  }

  // Return a correct type
  return mimeTypes[type] || formats.find((t) => t === type) || 'png';
}

/**
 * Returns stringified date without the GMT text information.
 */
export function getNewDate() {
  // Get rid of the GMT text information
  return new Date().toString().split('(')[0].trim();
}

/**
 * Returns the stored time value in milliseconds.
 */
export function getNewDateTime() {
  return new Date().getTime();
}

/**
 * Validates and parses JSON data. Checks if provided data is or can
 * be a correct JSON. If a primitive is provided, it is stringified and returned.
 *
 * @param {Object|string} data - The JSON data to be validated and parsed.
 * @param {boolean} toString - Whether to return a stringified representation
 * of the parsed JSON.
 *
 * @returns {Object|string|boolean} - The parsed JSON object, stringified JSON,
 * or false if validation fails.
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
  } catch {
    return false;
  }
}

/**
 * Checks if the given item is an object.
 *
 * @param {any} item - The item to be checked.
 *
 * @returns {boolean} - True if the item is an object, false otherwise.
 */
export function isObject(item) {
  return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

/**
 * Checks if the given object is empty.
 *
 * @param {Object} item - The object to be checked.
 *
 * @returns {boolean} - True if the object is empty, false otherwise.
 */
export function isObjectEmpty(item) {
  return (
    typeof item === 'object' &&
    !Array.isArray(item) &&
    item !== null &&
    Object.keys(item).length === 0
  );
}

/**
 * Checks if a private IP range URL is found in the given string.
 *
 * @param {string} item - The string to be checked for a private IP range URL.
 *
 * @returns {boolean} - True if a private IP range URL is found, false
 * otherwise.
 */
export function isPrivateRangeUrlFound(item) {
  const regexPatterns = [
    /xlink:href="(?:http:\/\/|https:\/\/)?localhost\b/,
    /xlink:href="(?:http:\/\/|https:\/\/)?10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    /xlink:href="(?:http:\/\/|https:\/\/)?127\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    /xlink:href="(?:http:\/\/|https:\/\/)?172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}\b/,
    /xlink:href="(?:http:\/\/|https:\/\/)?192\.168\.\d{1,3}\.\d{1,3}\b/
  ];

  return regexPatterns.some((pattern) => pattern.test(item));
}

/**
 * Utility to measure elapsed time using the Node.js process.hrtime() method.
 *
 * @returns {function(): number} - A function to calculate the elapsed time
 * in milliseconds.
 */
export function measureTime() {
  const start = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - start) / 1000000;
}

/**
 * Converts the provided options object to a JSON-formatted string with the
 * option to preserve functions.
 *
 * @param {Object} options - The options object to be converted to a string.
 * @param {boolean} allowFunctions - If set to true, functions are preserved
 * in the output.
 *
 * @returns {string} - The JSON-formatted string representing the options.
 */
export function optionsStringify(options, allowFunctions) {
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
}

/**
 * Prints the Highcharts Export Server logo and version information.
 *
 * @param {boolean} noLogo - If true, only prints version information without
 * the logo.
 */
export function printLogo(noLogo) {
  // Get package version either from env or from package.json
  const packageVersion = JSON.parse(
    readFileSync(join(__dirname, 'package.json'))
  ).version;

  // Print text only
  if (noLogo) {
    console.log(`Highcharts Export Server v${packageVersion}`);
    return;
  }

  // Print the logo
  console.log(
    readFileSync(__dirname + '/msg/startup.msg').toString().bold.yellow,
    `v${packageVersion}\n`.bold
  );
}

/**
 * Prints the usage information for CLI arguments. If required, it can list
 * properties recursively.
 *
 * @param {Object} defaultConfig - Default configuration object for reference.
 * @param {boolean} noLogo - If true, only prints version information without
 * the logo.
 */
export function printUsage(defaultConfig, noLogo) {
  const pad = 48;

  // Print the logo and version information
  printLogo(noLogo);

  // Display readme information
  console.log(
    '\nUsage of CLI arguments:'.bold,
    '\n-----',
    `\nFor more detailed information, visit the README file at: ${readme.green}`
  );

  const cycleCategories = (options) => {
    for (const [name, option] of Object.entries(options)) {
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
 * Prints the Highcharts Export Server logo, version and license information.
 */
export function printVersion() {
  // Print the logo and version information
  printLogo();

  // Print the license information
  console.log(
    'This software requires a valid Highcharts license for commercial use.\n'
      .yellow,
    '\nFor a full list of CLI options, type:',
    '\nhighcharts-export-server --help\n'.green,
    '\nIf you do not have a license, one can be obtained here:',
    '\nhttps://shop.highsoft.com/\n'.green,
    '\nTo customize your installation, please refer to the README file at:',
    `\n${readme}\n`.green
  );
}

/**
 * Rounds a number to the specified precision.
 *
 * @param {number} value - The number to be rounded.
 * @param {number} precision - The number of decimal places to round to.
 *
 * @returns {number} - The rounded number.
 */
export function roundNumber(value, precision = 1) {
  const multiplier = Math.pow(10, precision || 0);
  return Math.round(+value * multiplier) / multiplier;
}

/**
 * Converts a value to a boolean.
 *
 * @param {any} item - The value to be converted to a boolean.
 *
 * @returns {boolean} - The boolean representation of the input value.
 */
export function toBoolean(item) {
  return ['false', 'undefined', 'null', 'NaN', '0', ''].includes(item)
    ? false
    : !!item;
}

/**
 * Wraps custom code to execute it safely.
 *
 * @param {string} customCode - The custom code to be wrapped.
 * @param {boolean} allowFileResources - Flag to allow loading code from a file.
 *
 * @returns {string|boolean} - The wrapped custom code or false if wrapping
 * fails.
 */
export function wrapAround(customCode, allowFileResources) {
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
}

export default {
  __dirname,
  clearText,
  deepCopy,
  expBackoff,
  fixType,
  getNewDate,
  getNewDateTime,
  isCorrectJSON,
  isObject,
  isObjectEmpty,
  isPrivateRangeUrlFound,
  measureTime,
  optionsStringify,
  printLogo,
  printUsage,
  printVersion,
  roundNumber,
  toBoolean,
  wrapAround
};
