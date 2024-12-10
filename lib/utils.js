/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview The Highcharts Export Server utility module provides
 * a comprehensive set of helper functions and constants designed to streamline
 * and enhance various operations required for Highcharts export tasks.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const MAX_BACKOFF_ATTEMPTS = 6;

// The directory path
export const __dirname = fileURLToPath(new URL('../.', import.meta.url));

/**
 * Clears and standardizes text by replacing multiple consecutive whitespace
 * characters with a single space and trimming any leading or trailing
 * whitespace.
 *
 * @function clearText
 *
 * @param {string} text - The input text to be cleared.
 * @param {RegExp} [rule=/\s\s+/g] - The regular expression rule to match
 * multiple consecutive whitespace characters.
 * @param {string} [replacer=' '] - The string used to replace multiple
 * consecutive whitespace characters.
 *
 * @returns {string} The cleared and standardized text.
 */
export function clearText(text, rule = /\s\s+/g, replacer = ' ') {
  return text.replaceAll(rule, replacer).trim();
}

/**
 * Creates a deep copy of the given object or array.
 *
 * @function deepCopy
 *
 * @param {(Object|Array)} obj - The object or array to be deeply copied.
 *
 * @returns {(Object|Array)} The deep copy of the provided object or array.
 */
export function deepCopy(obj) {
  // If the `obj` is null or not of the `object` type, return it
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Prepare either a new array or a new object
  const copy = Array.isArray(obj) ? [] : {};

  // Recursively copy each property
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }

  // Return the copied object
  return copy;
}

/**
 * Implements an exponential backoff strategy for retrying a function until
 * a certain number of attempts are reached.
 *
 * @async
 * @function expBackoff
 *
 * @param {Function} fn - The function to be retried.
 * @param {number} [attempt=0] - The current attempt number.
 * @param {...unknown} args - Arguments to be passed to the function.
 *
 * @returns {Promise} A promise that resolves to the result of the function
 * if successful.
 *
 * @throws {Error} Throws an `Error` if the maximum number of attempts
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

    //// TO DO: Correct
    // // Information about the resource timeout
    // log(
    //   3,
    //   `[utils] Waited ${delayInMs}ms until next call for the resource of ID: ${args[0]}.`
    // );

    // Try again
    return expBackoff(fn, attempt, ...args);
  }
}

/**
 * Adjusts the constructor name by transforming and normalizing it based
 * on common chart types.
 *
 * @function fixConstr
 *
 * @param {string} constr - The original constructor name to be fixed.
 *
 * @returns {string} The corrected constructor name, or 'chart' if the input
 * is not recognized.
 */
export function fixConstr(constr) {
  try {
    // Fix the constructor by lowering casing
    const fixedConstr = `${constr.toLowerCase().replace('chart', '')}Chart`;

    // Handle the case where the result is just 'Chart'
    if (fixedConstr === 'Chart') {
      fixedConstr.toLowerCase();
    }

    // Return the corrected constructor, otherwise default to 'chart'
    return ['chart', 'stockChart', 'mapChart', 'ganttChart'].includes(
      fixedConstr
    )
      ? fixedConstr
      : 'chart';
  } catch {
    // Default to 'chart' in case of any error
    return 'chart';
  }
}

/**
 * Fixes the export type based on MIME types and file extensions.
 *
 * @function fixType
 *
 * @param {string} type - The original export type.
 * @param {string} outfile - The file path or name.
 *
 * @returns {string} The corrected export type.
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
 *
 * @function getNewDate
 */
export function getNewDate() {
  // Get rid of the GMT text information
  return new Date().toString().split('(')[0].trim();
}

/**
 * Returns the stored time value in milliseconds.
 *
 * @function getNewDateTime
 */
export function getNewDateTime() {
  return new Date().getTime();
}

/**
 * Validates, parses, and checks if the provided data is valid JSON.
 *
 * @function isCorrectJSON
 *
 * @param {unknown} data - The data to be validated and parsed as JSON.
 * Must be either an object or a string.
 * @param {boolean} [toString=false] - Whether to return a stringified JSON
 * version of the parsed data.
 * @param {boolean} [allowFunctions=false] - Whether to allow functions
 * in the parsed JSON. If true, functions are preserved.
 *
 * @returns {(Object|string|null)} Returns the parsed JSON object,
 * a stringified JSON object if `toString` is true, or null if the data
 * is not valid JSON or parsing fails.
 */
export function isCorrectJSON(data, toString = false, allowFunctions = false) {
  try {
    // Accept only objects and strings
    if (!isObject(data) && typeof data !== 'string') {
      // Return null if any other type
      return null;
    }

    // Get the JSON representation of original data
    const jsonData = typeof data === 'string' ? JSON.parse(data) : data;

    // Preserve or remove potential functions based on the allowFunctions flag
    const stringifiedOptions = optionsStringify(
      jsonData,
      allowFunctions,
      false
    );

    // Parse the data to check if it is valid JSON
    const parsedOptions = allowFunctions
      ? JSON.parse(
          optionsStringify(jsonData, allowFunctions, true),
          (_, value) =>
            typeof value === 'string' && value.startsWith('function')
              ? eval(`(${value})`)
              : value
        )
      : JSON.parse(stringifiedOptions);

    // Return stringified or parsed JSON object based on the toString flag
    return toString ? stringifiedOptions : parsedOptions;
  } catch (error) {
    // Return null if parse fails
    return null;
  }
}

/**
 * Checks if the given item is an object.
 *
 * @function isObject
 *
 * @param {unknown} item - The item to be checked.
 *
 * @returns {boolean} True if the item is an object, false otherwise.
 */
export function isObject(item) {
  return Object.prototype.toString.call(item) === '[object Object]';
}

/**
 * Checks if the given object is empty.
 *
 * @function isObjectEmpty
 *
 * @param {Object} item - The object to be checked.
 *
 * @returns {boolean} True if the object is empty, false otherwise.
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
 * @function isPrivateRangeUrlFound
 *
 * @param {string} item - The string to be checked for a private IP range URL.
 *
 * @returns {boolean} True if a private IP range URL is found, false otherwise.
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
 * Utility to measure elapsed time using the Node.js `process.hrtime()` method.
 *
 * @function measureTime
 *
 * @returns {Function} A function to calculate the elapsed time in milliseconds.
 */
export function measureTime() {
  const start = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - start) / 1000000;
}

/**
 * Merges two sets of configuration options, considering absolute properties.
 *
 * @function mergeConfigOptions
 *
 * @param {Object} options - Original configuration options.
 * @param {Object} newOptions - New configuration options to be merged.
 * @param {Array.<string>} [absoluteProps=[]] - List of properties that should
 * not be recursively merged.
 *
 * @returns {Object} Merged configuration options.
 */
export function mergeConfigOptions(options, newOptions, absoluteProps = []) {
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
}

/**
 * Converts the provided options object to a JSON-formatted string
 * with the option to preserve functions. In order for a function
 * to be preserved, it needs to follow the format `function (...) {...}`.
 * It can also be stringified.
 *
 * @function optionsStringify
 *
 * @param {Object} options - The options object to be converted to a string.
 * @param {boolean} allowFunctions - If set to true, functions are preserved
 * in the output.
 * @param {boolean} stringifyFunctions - If set to true, functions are saved
 * as strings.
 *
 * @returns {string} The JSON-formatted string representing the options.
 */
export function optionsStringify(options, allowFunctions, stringifyFunctions) {
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
        // Based on the stringifyFunctions options, set function values
        return stringifyFunctions
          ? // As stringified functions
            `"EXP_FUN${(value + '').replaceAll(/\n|\t|\r|\s+/g, ' ')}EXP_FUN"`
          : // As functions
            `EXP_FUN${(value + '').replaceAll(/\n|\t|\r|\s+/g, ' ')}EXP_FUN`;
      } else {
        // Get rid of the function values otherwise
        return undefined;
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
 * Prints the Highcharts Export Server logo or text with the version
 * information.
 *
 * @function printVersion
 *
 * @param {boolean} noLogo - If true, only prints text with the version
 * information, without the logo.
 */
export function printVersion(noLogo) {
  // Get package version either from `.env` or from `package.json`
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
    readFileSync(join(__dirname, 'msg', 'startup.msg')).toString().bold.yellow,
    `v${packageVersion}\n`.bold
  );
}

/**
 * Rounds a number to the specified precision.
 *
 * @function roundNumber
 *
 * @param {number} value - The number to be rounded.
 * @param {number} precision - The number of decimal places to round to.
 *
 * @returns {number} The rounded number.
 */
export function roundNumber(value, precision = 1) {
  const multiplier = Math.pow(10, precision || 0);
  return Math.round(+value * multiplier) / multiplier;
}

/**
 * Converts a value to a boolean.
 *
 * @function toBoolean
 *
 * @param {unknown} item - The value to be converted to a boolean.
 *
 * @returns {boolean} The boolean representation of the input value.
 */
export function toBoolean(item) {
  return ['false', 'undefined', 'null', 'NaN', '0', ''].includes(item)
    ? false
    : !!item;
}

/**
 * Wraps custom code to execute it safely.
 *
 * @function wrapAround
 *
 * @param {string} customCode - The custom code to be wrapped.
 * @param {boolean} allowFileResources - Flag to allow loading code from a file.
 *
 * @returns {(string|boolean)} The wrapped custom code or false if wrapping
 * fails.
 */
export function wrapAround(customCode, allowFileResources) {
  if (customCode && typeof customCode === 'string') {
    customCode = customCode.trim();

    if (customCode.endsWith('.js')) {
      return allowFileResources
        ? wrapAround(readFileSync(customCode, 'utf8'))
        : null;
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
  fixConstr,
  fixType,
  getNewDate,
  getNewDateTime,
  isCorrectJSON,
  isObject,
  isObjectEmpty,
  isPrivateRangeUrlFound,
  measureTime,
  mergeConfigOptions,
  optionsStringify,
  printLicense,
  printVersion,
  roundNumber,
  toBoolean,
  wrapAround
};
