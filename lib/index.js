/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// Add the main directory in the global object
import 'colors';

import server, { startServer } from './server/server.js';
import {
  setAllowCodeExecution,
  batchExport,
  singleExport,
  startExport
} from './chart.js';
import { mapToNewConfig, setOptions } from './config.js';
import { log, setLogLevel, enableFileLogging } from './logger.js';
import { killPool, init } from './pool.js';
import { checkCache } from './cache.js';

export default {
  log,
  mapToNewConfig,
  setOptions,
  singleExport,
  startExport,
  batchExport,
  server,
  startServer,
  killPool,
  initPool: async (options = {}) => {
    // Set the allowCodeExecution per export module scope
    setAllowCodeExecution(
      options.customCode && options.customCode.allowCodeExecution
    );

    // Set the log level
    setLogLevel(options.logging && parseInt(options.logging.level));

    // Set the log file path and name
    if (options.logging && options.logging.dest) {
      enableFileLogging(
        options.logging.dest,
        options.logging.file || 'highcharts-export-server.log'
      );
    }

    // Check if cache needs to be updated
    await checkCache(options.highcharts || { version: 'latest' });

    // Init the pool
    await init({
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
