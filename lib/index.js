/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import 'colors';

import { checkCache } from './cache.js';
import {
  batchExport,
  setAllowCodeExecution,
  singleExport,
  startExport
} from './chart.js';
import { mapToNewConfig, manualConfig, setOptions } from './config.js';
import { initLogging, log, logWithStack } from './logger.js';
import { initPool, killPool } from './pool.js';
import server, { startServer } from './server/server.js';
import { printLogo, printUsage } from './utils.js';

export default {
  batchExport,
  singleExport,
  startExport,
  mapToNewConfig,
  manualConfig,
  setOptions,
  log,
  logWithStack,
  killPool,
  server,
  startServer,
  printLogo,
  printUsage,

  /**
   * Initializes the export process. Tasks such as configuring logging, checking
   * cache and sources, and initializing the pool of resources happen during
   * this stage.
   *
   * @param {Object} options - The export options.
   *
   * @returns {Promise<Object>} Promise resolving to the updated export options.
   */
  initExport: async (options) => {
    // Set the allowCodeExecution per export module scope
    setAllowCodeExecution(
      options.customCode && options.customCode.allowCodeExecution
    );

    // Init the logging
    initLogging(options.logging);

    // Check if cache needs to be updated
    await checkCache(options.highcharts || { version: 'latest' });

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
  }
};
