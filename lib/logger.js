/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { appendFile, existsSync, mkdirSync } from 'fs';

// Map of styles (colors, thickness) and their ANSI escape codes
// used instead of the 'colors' package;
export const style = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  underline: '\x1b[4m'
};

// The available colors
const colors = ['red', 'yellow', 'blue', 'gray', 'green'];

// The default logging config
let logging = {
  // Flags for logging status
  toConsole: true,
  toFile: false,
  pathCreated: false,
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
  ],
  // Log listeners
  listeners: []
};

/**
 * Logs the provided texts to a file, if file logging is enabled. It creates
 * the necessary directory structure if not already created and appends the
 * content, including an optional prefix, to the specified log file.
 *
 * @param {string[]} texts - An array of texts to be logged.
 * @param {string} prefix - An optional prefix to be added to each log entry.
 */
const logToFile = (texts, prefix) => {
  if (!logging.pathCreated) {
    // Create if does not exist
    !existsSync(logging.dest) && mkdirSync(logging.dest);

    // We now assume the path is available, e.g. it's the responsibility
    // of the user to create the path with the correct access rights.
    logging.pathCreated = true;
  }

  // Add the content to a file
  appendFile(
    `${logging.dest}${logging.file}`,
    [prefix].concat(texts).join(' ') + '\n',
    (error) => {
      if (error) {
        console.log(`[logger] Unable to write to log file: ${error}`);
        logging.toFile = false;
      }
    }
  );
};

/**
 * Logs a message. Accepts a variable amount of arguments. Arguments after
 * `level` will be passed directly to console.log, and/or will be joined
 * and appended to the log file.
 *
 * @param {any} args - An array of arguments where the first is the log level
 * and the rest are strings to build a message with.
 */
export const log = (...args) => {
  const [newLevel, ...texts] = args;

  // Current logging options
  const { levelsDesc, level } = logging;

  // Check if log level is within a correct range or is a benchmark log
  if (
    newLevel !== 5 &&
    (newLevel === 0 || newLevel > level || level > levelsDesc.length)
  ) {
    return;
  }

  // Get rid of the GMT text information
  const newDate = new Date().toString().split('(')[0].trim();

  // Create a message's prefix
  const prefix = `${newDate} [${levelsDesc[newLevel - 1].title}] -`;

  // Call available log listeners
  logging.listeners.forEach((fn) => {
    fn(prefix, texts.join(' '));
  });

  // Log to console
  if (logging.toConsole) {
    console.log.apply(
      undefined,
      [
        `${style[logging.levelsDesc[newLevel - 1].color]}`,
        prefix.toString(),
        `${style.reset}`
      ].concat(texts)
    );
  }

  // Log to file
  if (logging.toFile) {
    logToFile(texts, prefix);
  }
};

/**
 * Logs an error message with its stack trace. Optionally, a custom message
 * can be provided.
 *
 * @param {number} level - The log level.
 * @param {Error} error - The error object.
 * @param {string} customMessage - An optional custom message to be logged along
 * with the error.
 */
export const logWithStack = (newLevel, error, customMessage) => {
  // Get the main message
  const mainMessage = customMessage || error.message;

  // Current logging options
  const { level, levelsDesc } = logging;

  // Check if log level is within a correct range
  if (newLevel === 0 || newLevel > level || level > levelsDesc.length) {
    return;
  }

  // Get rid of the GMT text information
  const newDate = new Date().toString().split('(')[0].trim();

  // Create a message's prefix
  const prefix = `${newDate} [${levelsDesc[newLevel - 1].title}] -`;

  // If the customMessage exists, we want to display the whole stack message
  const stackMessage =
    error.message !== error.stackMessage || error.stackMessage === undefined
      ? error.stack
      : error.stack.split('\n').slice(1).join('\n');

  // Combine custom message or error message with error stack message
  const texts = [mainMessage, '\n', stackMessage];

  // Log to console
  if (logging.toConsole) {
    console.log.apply(
      undefined,
      [
        `${style[logging.levelsDesc[newLevel - 1].color]}`,
        prefix.toString(),
        `${style.reset}`
      ].concat([mainMessage[colors[newLevel - 1]], '\n', stackMessage])
    );
  }

  // Call available log listeners
  logging.listeners.forEach((fn) => {
    fn(prefix, texts.join(' '));
  });

  // Log to file
  if (logging.toFile) {
    logToFile(texts, prefix);
  }
};

/**
 * Sets the log level to the specified value. Log levels are (0 = no logging,
 * 1 = error, 2 = warning, 3 = notice, 4 = verbose or 5 = benchmark)
 *
 * @param {number} newLevel - The new log level to be set.
 */
export const setLogLevel = (newLevel) => {
  if (newLevel >= 0 && newLevel <= logging.levelsDesc.length) {
    logging.level = newLevel;
  }
};

/**
 * Enables file logging with the specified destination and log file.
 *
 * @param {string} logDest - The destination path for log files.
 * @param {string} logFile - The log file name.
 */
export const enableFileLogging = (logDest, logFile) => {
  // Update logging options
  logging = {
    ...logging,
    dest: logDest || logging.dest,
    file: logFile || logging.file,
    toFile: true
  };

  if (logging.dest.length === 0) {
    return log(1, '[logger] File logging initialization: no path supplied.');
  }

  if (!logging.dest.endsWith('/')) {
    logging.dest += '/';
  }
};

/**
 * Initializes logging with the specified logging configuration.
 *
 * @param {Object} loggingOptions - The logging configuration object.
 */
export const initLogging = (loggingOptions) => {
  // Set all the logging options on our logging module object
  for (const [key, value] of Object.entries(loggingOptions)) {
    logging[key] = value;
  }

  // Set the log level
  setLogLevel(loggingOptions && parseInt(loggingOptions.level));

  // Set the log file path and name
  if (loggingOptions && loggingOptions.dest && loggingOptions.toFile) {
    enableFileLogging(
      loggingOptions.dest,
      loggingOptions.file || 'highcharts-export-server.log'
    );
  }
};

/**
 * Adds a listener function to the logging system.
 *
 * @param {function} fn - The listener function to be added.
 */
export const listen = (fn) => {
  logging.listeners.push(fn);
};

export default {
  log,
  logWithStack,
  setLogLevel,
  enableFileLogging,
  initLogging,
  listen
};
