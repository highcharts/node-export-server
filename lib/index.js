/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

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
  startExport,
  singleExport,
  batchExport,
  setAllowCodeExecution
} from './chart.js';
import { getOptions, setOptions } from './config.js';
import {
  log,
  logWithStack,
  initLogging,
  setLogLevel,
  enableFileLogging
} from './logger.js';
import { initPool, killPool } from './pool.js';
import { shutdownCleanUp } from './resourceRelease.js';
import { mapToNewConfig } from './schemas/config.js';
import server, { startServer } from './server/server.js';

/**
 * Initializes the export process. Tasks such as configuring logging, checking
 * the cache and sources and initializing the pool of resources happen during
 * this stage. This function must be called before attempting to export charts
 * or set up a server. The `options` parameter is an object that contains all
 * possible options. If the object is not provided, the default general options
 * will be retrieved using the `getOptions` function.
 *
 * @async
 * @function initExport
 *
 * @param {Object} [options=getOptions()] - The `options` object containing
 * configuration for a custom export. The default value is the global options
 * of the export server instance.
 */
export async function initExport(options = getOptions()) {
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
    log(4, `Process exited with code ${code}.`);
  });

  // Handler for the 'SIGINT'
  process.on('SIGINT', async (name, code) => {
    log(4, `The ${name} event with code: ${code}.`);
    await shutdownCleanUp(0);
  });

  // Handler for the 'SIGTERM'
  process.on('SIGTERM', async (name, code) => {
    log(4, `The ${name} event with code: ${code}.`);
    await shutdownCleanUp(0);
  });

  // Handler for the 'SIGHUP'
  process.on('SIGHUP', async (name, code) => {
    log(4, `The ${name} event with code: ${code}.`);
    await shutdownCleanUp(0);
  });

  // Handler for the 'uncaughtException'
  process.on('uncaughtException', async (error, name) => {
    logWithStack(1, error, `The ${name} error.`);
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

  // Exporting
  initExport,
  startExport,
  singleExport,
  batchExport,

  // Pool
  initPool,
  killPool,

  // Logs
  log,
  logWithStack,
  setLogLevel,
  enableFileLogging,

  // Utils
  shutdownCleanUp,
  mapToNewConfig
};
