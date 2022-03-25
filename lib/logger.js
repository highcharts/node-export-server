/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const fs = require('fs');
const logLevels = [
  { title: 'error', color: 'red' },
  { title: 'warning', color: 'yellow' },
  { title: 'notice', color: 'blue' },
  { title: 'verbose', color: 'gray' }
];
var logLevel = 4,
  logPath = 'logs/',
  logName = 'highcharts-export-server',
  logToFile = false,
  logToConsole = true,
  logPathCreated = false,
  listeners = [];
/** Logger module
 *  @module logger
 */
module.exports = {
  /** Add a log listener
   * @export logger
   * @param fn {function} - the function to call when getting a log event
   */
  listen: function (fn) {
    listeners.push(fn);
  },

  /** Enable or disable logging to stdout
   *  @export logger
   *  @param enabled {boolean} - state
   */
  toggleSTDOut: function (enabled) {
    logToConsole = enabled;
  },

  /** Set the file logging configuration
   *  @export logger
   *  @param path {string} - path to log to
   *  @param name {string} - the name of the log file
   */
  enableFileLogging: function (path, name) {
    logPath = path || logPath;
    logName = name || logName;

    logToFile = true;
    logPathCreated = false;

    if (logPath.length === 0) {
      return module.exports.log(
        0,
        'logger - file logging init: no path supplied'
      );
    }

    if (logPath[logPath.length - 1] !== '/') {
      logPath += '/';
    }
  },

  /** Set the current log level
   *  Log levels are:
   *    - 0 = no logging
   *    - 1 = error
   *    - 2 = warning
   *    - 3 = notice
   *    - 4 = verbose
   *  @export logger
   *  @param newLevel {number} - the new log level (0..4)
   */
  setLogLevel: (newLevel) => {
    if (newLevel >= 0 && newLevel <= logLevels.length) {
      logLevel = parseInt(newLevel);
    }
  },

  /** Log a message
   *  Accepts a variable amount of arguments.
   *  Arguments after `level` will be passed directly to console.log,
   *  and/or will be joined and appended to the log file.
   *  @export logger
   *  @param level {number} - the log level
   */
  log: function (level) {
    var things = Array.prototype.slice.call(arguments),
      prefix;

    things.splice(0, 1);

    if (logLevel > logLevels.length) {
      return;
    }

    if (level === 0 || level > logLevel) {
      return;
    }

    level--;

    prefix = new Date() + ' [' + logLevels[level].title + ']';

    listeners.forEach(function (fn) {
      fn(prefix, things.join(' '));
    });

    function doFileLog() {
      fs.appendFile(
        logPath + logName,
        [prefix].concat(things).join(' ') + '\n',
        function (err) {
          if (err) {
            module.exports.log(1, 'logger - unable to write to log file:', err);
            logToFile = false;
          }
        }
      );
    }

    if (logToFile) {
      if (!logPathCreated) {
        if (!fs.existsSync(logPath)) {
          fs.mkdirSync(logPath);
        }

        // We now assume the path is available, e.g. it's the responsibility
        // of the user to create the path with the correct access rights.
        logPathCreated = true;
        doFileLog();
      } else {
        doFileLog();
      }
    }

    if (logToConsole) {
      console.log.apply(
        undefined,
        [prefix.toString()[logLevels[level].color]].concat(things)
      );
    }
  }
};
