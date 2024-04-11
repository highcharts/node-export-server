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
import server, { startServer } from './server/server.js';
import { printLogo, printUsage } from './utils.js';

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

  // Check if cache needs to be updated
  await checkAndUpdateCache(options);

  // Init the pool
  await initPool({
    pool: options.pool || {
      minWorkers: 1,
      maxWorkers: 1
    },
    puppeteerArgs: options.puppeteer?.args || []
  });

  // Return updated options
  return options;
};

export default {
  // Server
  server,
  startServer,
  setOptions,

  // Exporting
  initExport,
  singleExport,
  batchExport,
  startExport,
  killPool,

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
