/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// Add the main directory in the global object
import 'colors';

import server, { start } from './server/server.js';
import chart from './chart.js';
import { log, setLogLevel, enableFileLogging } from './logger.js';
import { killAll, init, setPoolOptions } from './pool.js';
import { checkCache } from './cache.js';

export default {
  log,
  server,
  startExport: chart.startExport,
  startServer: start,
  killPool: killAll,
  initPool: async (options = {}) => {
    // Set the allowCodeExecution per export module scope
    chart.setAllowCodeExecution(
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
        initialWorkers: 1,
        maxWorkers: 1
      },
      puppeteerArgs: options.puppeteer?.args || []
    });

    setPoolOptions(options);

    // Return updated options
    return options;
  }
};
