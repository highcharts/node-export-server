/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

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
  logger,
  log: logger.log,
  export: chart,
  startServer: server.start,
  killPool: pool.killAll,
  initPool: async (options) => {
    // Load an optional config file
    options = await config.loadConfigFile(options);

    // Set the log level
    logger.setLogLevel(options.logging.level);

    // Set the log file path and name
    if (options.logging.dest) {
      logger.enableFileLogging(
        options.logging.dest,
        options.logging.file || 'highcharts-export-server.log'
      );
    }

    // Check if cache need to be updated
    await checkCache(options.highcharts);

    // Init the pool
    pool.init({
      pool: options.pool,
      puppeteerArgs: options.puppeteer.args
    });

    // Return updated options
    return options;
  }
};
