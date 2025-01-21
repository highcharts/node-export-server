/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview A module for managing logging functionality with customizable
 * log levels, console and file logging options, and error handling support.
 * The module also ensures that file-based logs are stored in a structured
 * directory, creating the necessary paths automatically if they do not exist.
 */

import { appendFile, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import { getAbsolutePath, getNewDate } from './utils.js';

// The available colors
const colors = ['red', 'yellow', 'blue', 'gray', 'green'];

// The default logging config
const logging = {
  // Flags for logging status
  toConsole: true,
  toFile: false,
  pathCreated: false,
  // Full path to the log file
  pathToLog: '',
  // Log levels
  levelsDesc: [
    {
      title: 'error',
      color: colors[0]
    },
    {
      title: 'warning',
      color: colors[1]
    },
    {
      title: 'notice',
      color: colors[2]
    },
    {
      title: 'verbose',
      color: colors[3]
    },
    {
      title: 'benchmark',
      color: colors[4]
    }
  ]
};

/**
 * Logs a message with a specified log level. Accepts a variable number
 * of arguments. The arguments after the `level` are passed to `console.log`
 * and/or used to construct and append messages to a log file.
 *
 * @function log
 *
 * @param {...unknown} args - An array of arguments where the first is the log
 * level and the remaining are strings used to build the log message.
 *
 * @returns {void} Exits the function execution if attempting to log at a level
 * higher than allowed.
 */
export function log(...args) {
  const [newLevel, ...texts] = args;

  // Current logging options
  const { levelsDesc, level } = logging;

  // Check if the log level is within a correct range or is it a benchmark log
  if (
    newLevel !== 5 &&
    (newLevel === 0 || newLevel > level || level > levelsDesc.length)
  ) {
    return;
  }

  // Create a message's prefix
  const prefix = `${getNewDate()} [${levelsDesc[newLevel - 1].title}] -`;

  // Log to file
  if (logging.toFile) {
    _logToFile(texts, prefix);
  }

  // Log to console
  if (logging.toConsole) {
    console.log.apply(
      undefined,
      [prefix.toString()[logging.levelsDesc[newLevel - 1].color]].concat(texts)
    );
  }
}

/**
 * Logs an error message along with its stack trace. Optionally, a custom message
 * can be provided.
 *
 * @function logWithStack
 *
 * @param {number} newLevel - The log level.
 * @param {Error} error - The error object containing the stack trace.
 * @param {string} customMessage - An optional custom message to be included
 * in the log alongside the error.
 *
 * @returns {void} Exits the function execution if attempting to log at a level
 * higher than allowed.
 */
export function logWithStack(newLevel, error, customMessage) {
  // Get the main message
  const mainMessage = customMessage || (error && error.message) || '';

  // Current logging options
  const { level, levelsDesc } = logging;

  // Check if the log level is within a correct range
  if (newLevel === 0 || newLevel > level || level > levelsDesc.length) {
    return;
  }

  // Create a message's prefix
  const prefix = `${getNewDate()} [${levelsDesc[newLevel - 1].title}] -`;

  // Add the whole stack message
  const stackMessage = error && error.stack;

  // Combine custom message or error message with error stack message, if exists
  const texts = [mainMessage];
  if (stackMessage) {
    texts.push('\n', stackMessage);
  }

  // Log to file
  if (logging.toFile) {
    _logToFile(texts, prefix);
  }

  // Log to console
  if (logging.toConsole) {
    console.log.apply(
      undefined,
      [prefix.toString()[logging.levelsDesc[newLevel - 1].color]].concat([
        texts.shift()[colors[newLevel - 1]],
        ...texts
      ])
    );
  }
}

/**
 * Initializes logging with the specified logging configuration.
 *
 * @function initLogging
 *
 * @param {Object} loggingOptions - The configuration object containing
 * `logging` options.
 */
export function initLogging(loggingOptions) {
  // Get options from the `loggingOptions` object
  const { level, dest, file, toConsole, toFile } = loggingOptions;

  // Reset flags to the default values
  logging.pathCreated = false;
  logging.pathToLog = '';

  // Set the logging level
  setLogLevel(level);

  // Set the console logging
  enableConsoleLogging(toConsole);

  // Set the file logging
  enableFileLogging(dest, file, toFile);
}

/**
 * Sets the log level to the specified value. Log levels are (`0` = no logging,
 * `1` = error, `2` = warning, `3` = notice, `4` = verbose, or `5` = benchmark).
 *
 * @function setLogLevel
 *
 * @param {number} level - The log level to be set.
 */
export function setLogLevel(level) {
  if (
    Number.isInteger(level) &&
    level >= 0 &&
    level <= logging.levelsDesc.length
  ) {
    // Update the module logging's `level` option
    logging.level = level;
  }
}

/**
 * Enables console logging.
 *
 * @function enableConsoleLogging
 *
 * @param {boolean} toConsole - The flag for setting the logging to the console.
 */
export function enableConsoleLogging(toConsole) {
  // Update the module logging's `toConsole` option
  logging.toConsole = !!toConsole;
}

/**
 * Enables file logging with the specified destination and log file name.
 *
 * @function enableFileLogging
 *
 * @param {string} dest - The destination path where the log file should
 * be saved.
 * @param {string} file - The name of the log file.
 * @param {boolean} toFile - A flag indicating whether logging should
 * be directed to a file.
 */
export function enableFileLogging(dest, file, toFile) {
  // Update the module logging's `toFile` option
  logging.toFile = !!toFile;

  // Set the `dest` and `file` options only if the file logging is enabled
  if (logging.toFile) {
    logging.dest = dest || '';
    logging.file = file || '';
  }
}

/**
 * Logs the provided texts to a file, if file logging is enabled. It creates
 * the necessary directory structure if not already created and appends
 * the content, including an optional prefix, to the specified log file.
 *
 * @function _logToFile
 *
 * @param {Array.<string>} texts - An array of texts to be logged.
 * @param {string} prefix - An optional prefix to be added to each log entry.
 */
function _logToFile(texts, prefix) {
  if (!logging.pathCreated) {
    // Create if does not exist
    !existsSync(getAbsolutePath(logging.dest)) &&
      mkdirSync(getAbsolutePath(logging.dest));

    // Create the full path
    logging.pathToLog = getAbsolutePath(join(logging.dest, logging.file));

    // We now assume the path is available, e.g. it's the responsibility
    // of the user to create the path with the correct access rights.
    logging.pathCreated = true;
  }

  // Add the content to a file
  appendFile(
    logging.pathToLog,
    [prefix].concat(texts).join(' ') + '\n',
    (error) => {
      if (error && logging.toFile && logging.pathCreated) {
        logging.toFile = false;
        logging.pathCreated = false;
        logWithStack(2, error, `[logger] Unable to write to log file.`);
      }
    }
  );
}

export default {
  log,
  logWithStack,
  initLogging,
  setLogLevel,
  enableConsoleLogging,
  enableFileLogging
};
