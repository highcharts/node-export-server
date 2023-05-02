/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import cache from '../../cache.js';
import pool from '../../pool.js';

const packageVersion = process.env.npm_package_version;
const serverStartTime = new Date();

/**
 * Adds the /health route which outputs basic stats for the server
 */
export default (app) =>
  !app
    ? false
    : app.get('/health', (request, response) => {
        response.send({
          status: 'OK',
          bootTime: serverStartTime,
          uptime: Math.floor((new Date().getTime() - serverStartTime.getTime()) / 1000 / 60) + ' minutes',
          version: packageVersion,
          highchartsVersion: cache.version(),
          avarageProcessingTime: pool.avarageTime(),
          performedExports: pool.processedWorkCount()
        });
      });
