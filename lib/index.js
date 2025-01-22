/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Core module for initializing and managing the Highcharts Export
 * Server. Provides functionalities for configuring exports, setting up server
 * operations, logging, scripts caching, resource pooling, and graceful process
 * cleanup.
 */

import 'colors';

import { checkAndUpdateCache } from './cache.js';
import {
  singleExport,
  batchExport,
  startExport,
  setAllowCodeExecution
} from './chart.js';
import { getOptions, updateOptions, mapToNewOptions } from './config.js';
import {
  log,
  logWithStack,
  initLogging,
  enableConsoleLogging,
  enableFileLogging,
  setLogLevel
} from './logger.js';
import { initPool, killPool } from './pool.js';
import { shutdownCleanUp } from './resourceRelease.js';

import server from './server/server.js';

/**
 * Initializes the export process. Tasks such as configuring logging, checking
 * the cache and sources, and initializing the resource pool occur during this
 * stage.
 *
 * This function must be called before attempting to export charts or set
 * up a server.
 *
 * @async
 * @function initExport
 *
 * @param {Object} initOptions - The `initOptions` object, which may
 * be a partial or complete set of options. If the options are partial, missing
 * values will default to the current global configuration.
 */
export async function initExport(initOptions) {
  // Init and update the instance options object
  const options = updateOptions(initOptions);

  // Set the `allowCodeExecution` per export module scope
  setAllowCodeExecution(options.customLogic.allowCodeExecution);

  // Init the logging
  initLogging(options.logging);

  // Attach process' exit listeners
  if (options.other.listenToProcessExits) {
    _attachProcessExitListeners();
  }

  // Check if cache needs to be updated
  await checkAndUpdateCache(options.highcharts, options.server.proxy);

  // Init the pool
  await initPool(options.pool, options.puppeteer.args);
}

/**
 * Attaches exit listeners to the process, ensuring proper cleanup of resources
 * and termination on exit signals. Handles 'exit', 'SIGINT', 'SIGTERM'
 * and 'uncaughtException' events.
 *
 * @function _attachProcessExitListeners
 */
function _attachProcessExitListeners() {
  log(3, '[process] Attaching exit listeners to the process.');

  // Handler for the 'exit'
  process.on('exit', (code) => {
    log(4, `[process] Process exited with code ${code}.`);
  });

  // Handler for the 'SIGINT'
  process.on('SIGINT', async (name, code) => {
    log(4, `[process] The ${name} event with code: ${code}.`);
    await shutdownCleanUp();
  });

  // Handler for the 'SIGTERM'
  process.on('SIGTERM', async (name, code) => {
    log(4, `[process] The ${name} event with code: ${code}.`);
    await shutdownCleanUp();
  });

  // Handler for the 'SIGHUP'
  process.on('SIGHUP', async (name, code) => {
    log(4, `[process] The ${name} event with code: ${code}.`);
    await shutdownCleanUp();
  });

  // Handler for the 'uncaughtException'
  process.on('uncaughtException', async (error, name) => {
    logWithStack(1, error, `[process] The ${name} error.`);
    await shutdownCleanUp(1);
  });
}

export default {
  // Server
  ...server,

  // Options
  getOptions,
  updateOptions,
  mapToNewOptions,

  // Exporting
  initExport,
  singleExport,
  batchExport,
  startExport,

  // Release
  killPool,
  shutdownCleanUp,

  // Logs
  log,
  logWithStack,
  setLogLevel: function (level) {
    // Update the instance options object
    const options = updateOptions({
      logging: {
        level
      }
    });

    // Call the function
    setLogLevel(options.logging.level);
  },
  enableConsoleLogging: function (toConsole) {
    // Update the instance options object
    const options = updateOptions({
      logging: {
        toConsole
      }
    });

    // Call the function
    enableConsoleLogging(options.logging.toConsole);
  },
  enableFileLogging: function (dest, file, toFile) {
    // Update the instance options object
    const options = updateOptions({
      logging: {
        dest,
        file,
        toFile
      }
    });

    // Call the function
    enableFileLogging(
      options.logging.dest,
      options.logging.file,
      options.logging.toFile
    );
  }
};
