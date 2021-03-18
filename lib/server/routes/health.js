/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const serverStartTime = new Date();
const pool = require('./../../pool');
const cache = require('./../../cache');

/**
 * Adds the /health route which outputs basic stats for the server.
 */
module.exports = (app) =>
  !app
    ? false
    : app.get('/health', (req, res) => {
        res.send({
          status: 'OK',
          version: pkg.version,
          highchartsVersion: cache.version(),
          bootTime: serverStartTime,
          avarageProcessingTime: pool.avarageTime(),
          performedExports: pool.processedWorkCount()
        });
      });
