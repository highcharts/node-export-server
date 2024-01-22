/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import cache from '../../cache.js';
import pool from '../../pool.js';

import { readFileSync } from 'fs';
import { __dirname } from './../../utils.js';
import { join as pather } from 'path';

const pkgFile = JSON.parse(
    readFileSync(pather(__dirname, 'package.json'))
  );

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
          uptime:
            Math.floor(
              (new Date().getTime() - serverStartTime.getTime()) / 1000 / 60
            ) + ' minutes',
          version: pkgFile.version,
          highchartsVersion: cache.version(),
          averageProcessingTime: pool.averageTime(),
          performedExports: pool.processedWorkCount(),
          failedExports: pool.droppedWork(),
          exportAttempts: pool.workAttempts(),
          sucessRatio: (pool.processedWorkCount() / pool.workAttempts()) * 100,
          // eslint-disable-next-line import/no-named-as-default-member
          pool: pool.getPoolInfoJSON()
        });
      });
