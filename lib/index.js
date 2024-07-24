/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import 'colors';

import { checkAndUpdateCache } from './cache.js';
import {
  batchExport,
  setAllowCodeExecution,
  singleExport,
  startExport
} from './chart.js';
import { mapToNewConfig, manualConfig, setOptions } from './config.js';
import {
  initLogging,
  log,
  logWithStack,
  setLogLevel,
  enableFileLogging
} from './logger.js';
import { initPool, killPool } from './pool.js';
import { shutdownCleanUp } from './resource_release.js';
import server, { startServer } from './server/server.js';
import { printLogo, printUsage } from './utils.js';

/**
 * Attaches exit listeners to the process, ensuring proper cleanup of resources
 * and termination on exit signals. Handles 'exit', 'SIGINT', 'SIGTERM', and
 * 'uncaughtException' events.
 */
const attachProcessExitListeners = () => {
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
};

/**
 * Initializes the export process. Tasks such as configuring logging, checking
 * cache and sources, and initializing the pool of resources happen during
 * this stage. Function that is required to be called before trying to export charts or setting a server. The `options` is an object that contains all options.
 *
 * @param {Object} options - All export options.
 *
 * @returns {Promise<Object>} Promise resolving to the updated export options.
 */
const initExport = async (options) => {
  // Set the allowCodeExecution per export module scope
  setAllowCodeExecution(
    options.customLogic && options.customLogic.allowCodeExecution
  );

  // Init the logging
  initLogging(options.logging);

  // Attach process' exit listeners
  if (options.other.listenToProcessExits) {
    attachProcessExitListeners();
  }

  // Check if cache needs to be updated
  await checkAndUpdateCache(options);

  // Init the pool
  await initPool({
    pool: options.pool || {
      minWorkers: 1,
      maxWorkers: 1
    },
    puppeteerArgs: options.puppeteer.args || []
  });

  // Return updated options
  return options;
};

export default {
  // Server
  server,
  startServer,

  // Exporting
  initExport,
  singleExport,
  batchExport,
  startExport,

  // Pool
  initPool,
  killPool,

  // Other
  setOptions,
  shutdownCleanUp,

  // Logs
  log,
  logWithStack,
  setLogLevel,
  enableFileLogging,

  // Utils
  mapToNewConfig,
  manualConfig,
  printLogo,
  printUsage
};
