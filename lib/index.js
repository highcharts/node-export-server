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
import {
  getOptions,
  setOptions,
  mergeOptions,
  mapToNewOptions
} from './config.js';
import {
  log,
  logWithStack,
  logZodIssues,
  initLogging,
  setLogLevel,
  enableConsoleLogging,
  enableFileLogging
} from './logger.js';
import { initPool, killPool } from './pool.js';
import { shutdownCleanUp } from './resourceRelease.js';
import server, { startServer } from './server/server.js';

/**
 * Initializes the export process. Tasks such as configuring logging, checking
 * the cache and sources, and initializing the resource pool occur during this
 * stage. This function must be called before attempting to export charts or set
 * up a server.
 *
 * @async
 * @function initExport
 *
 * @param {Object} customOptions - The `customOptions` object, which may
 * be a partial or complete set of options. If the provided options are partial,
 * missing values will be merged with the default general options, retrieved
 * using the `getOptions` function.
 */
export async function initExport(customOptions) {
  // Get the global options object copy and extend it with the incoming options
  const options = mergeOptions(getOptions(false), customOptions);

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
    await shutdownCleanUp(0);
  });

  // Handler for the 'SIGTERM'
  process.on('SIGTERM', async (name, code) => {
    log(4, `[process] The ${name} event with code: ${code}.`);
    await shutdownCleanUp(0);
  });

  // Handler for the 'SIGHUP'
  process.on('SIGHUP', async (name, code) => {
    log(4, `[process] The ${name} event with code: ${code}.`);
    await shutdownCleanUp(0);
  });

  // Handler for the 'uncaughtException'
  process.on('uncaughtException', async (error, name) => {
    logWithStack(1, error, `[process] The ${name} error.`);
    await shutdownCleanUp(1);
  });
}

export default {
  // Server
  server,
  startServer,

  // Options
  getOptions,
  setOptions,
  mergeOptions,
  mapToNewOptions,

  // Exporting
  initExport,
  singleExport,
  batchExport,
  startExport,

  // Cache
  checkAndUpdateCache,

  // Pool
  initPool,
  killPool,

  // Logs
  log,
  logWithStack,
  logZodIssues,
  setLogLevel,
  enableConsoleLogging,
  enableFileLogging,

  // Utils
  shutdownCleanUp
};
