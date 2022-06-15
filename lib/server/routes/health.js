/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const pool = require('../../pool.js');
const cache = require('../../cache.js');
const packageJson = require('../../../package.json');

const serverStartTime = new Date();

/**
 * Adds the /health route which outputs basic stats for the server.
 */
module.exports = (app) =>
  !app
    ? false
    : app.get('/health', (request, response) => {
        response.send({
          status: 'OK',
          bootTime: serverStartTime,
          version: packageJson.version,
          highchartsVersion: cache.version(),
          averageProcessingTime: pool.averageTime(),
          performedExports: pool.processedWorkCount()
        });
      });
