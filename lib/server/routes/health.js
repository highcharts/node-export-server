/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const { join } = require('path');
const pool = require(join(__basedir, 'lib', 'pool.js'));
const cache = require(join(__basedir, 'lib', 'cache.js'));
const packageJson = require(join(__basedir, 'package.json'));

const serverStartTime = new Date();

/**
 * Adds the /health route which outputs basic stats for the server.
 */
module.exports = (app) =>
  !app
    ? false
    : app.get('/health', (req, res) => {
        res.send({
          status: 'OK',
          version: packageJson.version,
          highchartsVersion: cache.version(),
          bootTime: serverStartTime,
          avarageProcessingTime: pool.avarageTime(),
          performedExports: pool.processedWorkCount()
        });
      });
