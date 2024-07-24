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

import { defaultConfig } from '../lib/schemas/config.js';
import { log, logWithStack } from './logger.js';

const MAX_BACKOFF_ATTEMPTS = 6;

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
export const clearText = (text, rule = /\s\s+/g, replacer = ' ') =>
  text.replaceAll(rule, replacer).trim();

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
 * Fixes the export type based on MIME types and file extensions.
 *
 * @param {string} type - The original export type.
 * @param {string} outfile - The file path or name.
 *
 * @returns {string} - The corrected export type.
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

    if (outType === 'jpg') {
      type = 'jpeg';
    } else if (formats.includes(outType) && type !== outType) {
      type = outType;
    }
  }

  // Return a correct type
  return mimeTypes[type] || formats.find((t) => t === type) || 'png';
};

/**
 * Handles and validates resources for export.
 *
 * @param {Object|string} resources - The resources to be handled. Can be either
 * a JSON object, stringified JSON or a path to a JSON file.
 * @param {boolean} allowFileResources - Whether to allow loading resources from
 * files.
 *
 * @returns {Object|undefined} - The handled resources or undefined if no valid
 * resources are found.
 */
export const handleResources = (resources = false, allowFileResources) => {
  const allowedProps = ['js', 'css', 'files'];

  let handledResources = resources;
  let correctResources = false;

  // Try to load resources from a file
  if (allowFileResources && resources.endsWith('.json')) {
    try {
      handledResources = isCorrectJSON(readFileSync(resources, 'utf8'));
    } catch (error) {
      return logWithStack(2, error, `[cli] No resources found.`);
    }
  } else {
    // Try to get JSON
    handledResources = isCorrectJSON(resources);

    // Get rid of the files section
    if (handledResources && !allowFileResources) {
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
export const isObject = (item) =>
  typeof item === 'object' && !Array.isArray(item) && item !== null;

/**
 * Checks if the given object is empty.
 *
 * @param {Object} item - The object to be checked.
 *
 * @returns {boolean} - True if the object is empty, false otherwise.
 */
export const isObjectEmpty = (item) =>
  typeof item === 'object' &&
  !Array.isArray(item) &&
  item !== null &&
  Object.keys(item).length === 0;

/**
 * Checks if a private IP range URL is found in the given string.
 *
 * @param {string} item - The string to be checked for a private IP range URL.
 *
 * @returns {boolean} - True if a private IP range URL is found, false
 * otherwise.
 */
export const isPrivateRangeUrlFound = (item) => {
  const regexPatterns = [
    /xlink:href="(?:http:\/\/|https:\/\/)?localhost\b/,
    /xlink:href="(?:http:\/\/|https:\/\/)?10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    /xlink:href="(?:http:\/\/|https:\/\/)?127\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    /xlink:href="(?:http:\/\/|https:\/\/)?172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}\b/,
    /xlink:href="(?:http:\/\/|https:\/\/)?192\.168\.\d{1,3}\.\d{1,3}\b/
  ];

  return regexPatterns.some((pattern) => pattern.test(item));
};

/**
 * Creates a deep copy of the given object or array.
 *
 * @param {Object|Array} obj - The object or array to be deeply copied.
 *
 * @returns {Object|Array} - The deep copy of the provided object or array.
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
 * Converts the provided options object to a JSON-formatted string with the
 * option to preserve functions.
 *
 * @param {Object} options - The options object to be converted to a string.
 * @param {boolean} allowFunctions - If set to true, functions are preserved
 * in the output.
 *
 * @returns {string} - The JSON-formatted string representing the options.
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
 * Prints the Highcharts Export Server logo and version information.
 *
 * @param {boolean} noLogo - If true, only prints version information without
 * the logo.
 */
export const printLogo = (noLogo) => {
  // Get package version either from env or from package.json
  const packageVersion = JSON.parse(
    readFileSync(join(__dirname, 'package.json'))
  ).version;

  // Print text only
  if (noLogo) {
    console.log(`Starting Highcharts Export Server v${packageVersion}...`);
    return;
  }

  // Print the logo
  console.log(
    readFileSync(__dirname + '/msg/startup.msg').toString().bold.yellow,
    `v${packageVersion}\n`.bold
  );
};

/**
 * Prints the usage information for CLI arguments. If required, it can list
 * properties recursively
 */
export function printUsage() {
  const pad = 48;
  const readme = 'https://github.com/highcharts/node-export-server#readme';

  // Display readme information
  console.log(
    '\nUsage of CLI arguments:'.bold,
    '\n------',
    `\nFor more detailed information, visit the readme at: ${readme.bold.yellow}.`
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
 * Rounds a number to the specified precision.
 *
 * @param {number} value - The number to be rounded.
 * @param {number} precision - The number of decimal places to round to.
 *
 * @returns {number} - The rounded number.
 */
export const roundNumber = (value, precision = 1) => {
  const multiplier = Math.pow(10, precision || 0);
  return Math.round(+value * multiplier) / multiplier;
};

/**
 * Converts a value to a boolean.
 *
 * @param {any} item - The value to be converted to a boolean.
 *
 * @returns {boolean} - The boolean representation of the input value.
 */
export const toBoolean = (item) =>
  ['false', 'undefined', 'null', 'NaN', '0', ''].includes(item)
    ? false
    : !!item;

/**
 * Wraps custom code to execute it safely.
 *
 * @param {string} customCode - The custom code to be wrapped.
 * @param {boolean} allowFileResources - Flag to allow loading code from a file.
 *
 * @returns {string|boolean} - The wrapped custom code or false if wrapping
 * fails.
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
 * Utility to measure elapsed time using the Node.js process.hrtime() method.
 *
 * @returns {function(): number} - A function to calculate the elapsed time
 * in milliseconds.
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
  isObjectEmpty,
  isPrivateRangeUrlFound,
  optionsStringify,
  printLogo,
  printUsage,
  roundNumber,
  toBoolean,
  wrapAround,
  measureTime
};
