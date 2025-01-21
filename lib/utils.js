/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

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
import { isAbsolute, join } from 'path';
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
 * multiple consecutive whitespace characters. The default value
 * is the '/\s\s+/g' RegExp.
 * @param {string} [replacer=' '] - The string used to replace multiple
 * consecutive whitespace characters. The default value is the ' ' string.
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
 * @param {(Object|Array)} objArr - The object or array to be deeply copied.
 *
 * @returns {(Object|Array)} The deep copy of the provided object or array.
 */
export function deepCopy(objArr) {
  // If the `objArr` is null or not of the `object` type, return it
  if (objArr === null || typeof objArr !== 'object') {
    return objArr;
  }

  // Prepare either a new array or a new object
  const objArrCopy = Array.isArray(objArr) ? [] : {};

  // Recursively copy each property
  for (const key in objArr) {
    if (Object.prototype.hasOwnProperty.call(objArr, key)) {
      objArrCopy[key] = deepCopy(objArr[key]);
    }
  }

  // Return the copied object
  return objArrCopy;
}

/**
 * Implements an exponential backoff strategy for retrying a function until
 * a certain number of attempts are reached.
 *
 * @async
 * @function expBackoff
 *
 * @param {Function} fn - The function to be retried.
 * @param {number} [attempt=0] - The current attempt number. The default value
 * is `0`.
 * @param {...unknown} args - Arguments to be passed to the function.
 *
 * @returns {Promise<unknown>} A Promise that resolves to the result
 * of the function if successful.
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

    // If the attempt exceeds the maximum attempts of repeat, throw an error
    if (++attempt >= MAX_BACKOFF_ATTEMPTS) {
      throw error;
    }

    // Wait given amount of time
    await new Promise((response) => setTimeout(response, delayInMs));

    /// TO DO: Correct
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
 * Fixes the outfile based on provided type.
 *
 * @function fixOutfile
 *
 * @param {string} type - The original export type.
 * @param {string} outfile - The file path or name.
 *
 * @returns {string} The corrected outfile.
 */
export function fixOutfile(type, outfile) {
  // Get the file name from the `outfile` option
  const fileName = getAbsolutePath(outfile || 'chart')
    .split('.')
    .shift();

  // Return a correct outfile
  return `${fileName}.${type}`;
}

/**
 * Fixes the export type based on MIME types and file extensions.
 *
 * @function fixType
 *
 * @param {string} type - The original export type.
 * @param {string} [outfile=null] - The file path or name. The default value
 * is `null`.
 *
 * @returns {string} The corrected export type.
 */
export function fixType(type, outfile = null) {
  // MIME types
  const mimeTypes = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'application/pdf': 'pdf',
    'image/svg+xml': 'svg'
  };

  // Get formats
  const formats = Object.values(mimeTypes);

  // Check if type and outfile's extensions are the same
  if (outfile) {
    const outType = outfile.split('.').pop();

    // Support the JPG type
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
 * Checks if the given path is relative or absolute and returns the corrected,
 * absolute path.
 *
 * @function isAbsolutePath
 *
 * @param {string} path - The path to be checked on.
 *
 * @returns {string} The absolute path.
 */
export function getAbsolutePath(path) {
  return isAbsolute(path) ? path : join(__dirname, path);
}

/**
 * Converts input data to a Base64 string based on the export type.
 *
 * @function getBase64
 *
 * @param {string} input - The input to be transformed to Base64 format.
 * @param {string} type - The original export type.
 *
 * @returns {string} The Base64 string representation of the input.
 */
export function getBase64(input, type) {
  // For pdf and svg types the input must be transformed to Base64 from a buffer
  if (type === 'pdf' || type == 'svg') {
    return Buffer.from(input, 'utf8').toString('base64');
  }

  // For png and jpeg input is already a Base64 string
  return input;
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
 * @param {boolean} [isCallback=false] - Flag that indicates the returned code
 * must be in a callback format.
 *
 * @returns {(string|null)} The wrapped custom code or null if wrapping fails.
 */
export function wrapAround(customCode, allowFileResources, isCallback = false) {
  if (customCode && typeof customCode === 'string') {
    customCode = customCode.trim();

    if (customCode.endsWith('.js')) {
      // Load a file if the file resources are allowed
      return allowFileResources
        ? wrapAround(
            readFileSync(getAbsolutePath(customCode), 'utf8'),
            allowFileResources,
            isCallback
          )
        : null;
    } else if (
      !isCallback &&
      (customCode.startsWith('function()') ||
        customCode.startsWith('function ()') ||
        customCode.startsWith('()=>') ||
        customCode.startsWith('() =>'))
    ) {
      // Treat a function as a self-invoking expression
      return `(${customCode})()`;
    }

    // Or return as a stringified code
    return customCode.replace(/;$/, '');
  }
}

export default {
  __dirname,
  clearText,
  deepCopy,
  expBackoff,
  fixConstr,
  fixOutfile,
  fixType,
  getAbsolutePath,
  getBase64,
  getNewDate,
  getNewDateTime,
  isObject,
  isObjectEmpty,
  isPrivateRangeUrlFound,
  measureTime,
  roundNumber,
  toBoolean,
  wrapAround
};
