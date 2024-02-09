/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { appendFile, existsSync, mkdirSync } from 'fs';

import { defaultConfig } from './schemas/config.js';

// The available colors
const colors = ['red', 'yellow', 'blue', 'gray'];

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
    }
  ],
  // Log listeners
  listeners: []
};

// Gather init logging options
for (const [key, option] of Object.entries(defaultConfig.logging)) {
  logging[key] = option.value;
}

const logToFile = (texts, prefix) => {
  if (logging.toFile) {
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
  }
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
  const { level, levelsDesc } = logging;

  // Check if log level is within a correct range
  if (newLevel === 0 || newLevel > level || level > levelsDesc.length) {
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

  // Log to file
  logToFile(texts, prefix);

  // Log to console
  if (logging.toConsole) {
    console.log.apply(
      undefined,
      [prefix.toString()[logging.levelsDesc[newLevel - 1].color]].concat(texts)
    );
  }
};

export const logWithStack = (level, error, customMessage) => {
  // Log either custom or error's message
  log(level, (customMessage || error.message)[colors[level - 1]]);

  // If the customMessage exists, we want to display the whole stack message
  const stackMessage =
    error.message !== error.stackMessage || error.stackMessage === undefined
      ? error.stack
      : error.stack.split('\n').slice(1).join('\n');

  // Log to console
  if (logging.toConsole) {
    console.log(stackMessage);
  }

  // Log to file
  logToFile([stackMessage]);
};

/**
 * Sets the current log level. Log levels are:
 * - 0 = no logging
 * - 1 = error
 * - 2 = warning
 * - 3 = notice
 * - 4 = verbose
 *
 * @param {number} newLevel - The new log level (0 - 4).
 */
export const setLogLevel = (newLevel) => {
  if (newLevel >= 0 && newLevel <= logging.levelsDesc.length) {
    logging.level = newLevel;
  }
};

/**
 * Sets the file logging configuration.
 *
 * @param {string} logDest - A path to log to.
 * @param {string} logFile - The name of the log file.
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
    return log(1, '[logger] File logging init: no path supplied.');
  }

  if (!logging.dest.endsWith('/')) {
    logging.dest += '/';
  }
};

/**
 * Inits the logging mechanism.
 *
 * @param {object} logging -The logging options.
 */
export const initLogging = (logging) => {
  // Set the log level
  setLogLevel(logging && parseInt(logging.level));

  // Set the log file path and name
  if (logging && logging.dest) {
    enableFileLogging(
      logging.dest,
      logging.file || 'highcharts-export-server.log'
    );
  }
};

/**
 * Adds a log listener.
 *
 * @param {function} fn - The function to call when getting a log event.
 */
export const listen = (fn) => {
  logging.listeners.push(fn);
};

/**
 * Enables or disables logging to the stdout.
 *
 * @param {boolean} enabled - Whether log to console or not.
 */
export const toggleSTDOut = (enabled) => {
  logging.toConsole = enabled;
};

export default {
  log,
  logWithStack,
  setLogLevel,
  enableFileLogging,
  initLogging,
  listen,
  toggleSTDOut
};
