/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

// Add the main directory in the global object
global.__basedir = require('path').join(__dirname, '..');

require('colors');

const logger = require('./logger.js');
const chart = require('./chart.js');
const server = require('./server/server.js');
const pool = require('./pool.js');
const config = require('./config.js');
const { checkCache } = require('./cache.js');

module.exports = {
  server,
  log: logger.log,
  findChartSize: chart.findChartSize,
  startExport: chart.startExport,
  startServer: server.start,
  killPool: pool.killAll,
  initPool: async (options = {}) => {
    // Load an optional config file
    options = await config.loadConfigFile(options);

    // Set the allowCodeExecution per export module scope
    chart.setAllowCodeExecution(
      options.customCode && options.customCode.allowCodeExecution
    );

    // Set the log level
    logger.setLogLevel(options.logging && parseInt(options.logging.level));

    // Set the log file path and name
    if (options.logging && options.logging.dest) {
      logger.enableFileLogging(
        options.logging.dest,
        options.logging.file || 'highcharts-export-server.log'
      );
    }

    // Check if cache needs to be updated
    await checkCache(options.highcharts || { version: 'latest' });

    // Init the pool
    pool.init({
      pool: options.pool || {
        initialWorkers: 1,
        maxWorkers: 1
      },
      puppeteerArgs: (options.puppeteer && options.puppeteer.args) || []
    });

    // Return updated options
    return options;
  }
};
