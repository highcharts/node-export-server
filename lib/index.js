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

module.exports = {
  server: server,
  logger: logger,

  log: logger.log,
  export: chart,
  startServer: server.start,
  killPool: pool.killAll,
  initPool: async (conf) => {
    await config.load(conf.configFile);
    pool.init(conf);
  },
  logLevel: logger.setLogLevel,
  enableFileLogging: logger.enableFileLogging,
  ///
  cliOptions: config.config,
  configDescriptions: config.configDescriptions
  ///
};
