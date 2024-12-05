/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { readFileSync } from 'fs';
import { join as pather } from 'path';

import { getHighchartsVersion } from '../../cache.js';
import { log } from '../../logger.js';
import { getPoolStats, getPoolInfoJSON } from '../../pool.js';
import { addTimer } from '../../timers.js';
import { __dirname, getNewDateTime } from '../../utils.js';

const packageFile = JSON.parse(readFileSync(pather(__dirname, 'package.json')));
const serverStartTime = new Date();

const successRates = [];
const recordInterval = 60 * 1000; // record every minute
const windowSize = 30; // 30 minutes

/**
 * Calculates moving average indicator based on the data from the successRates
 * array.
 *
 * @returns {number} A moving average for success ratio of the server exports.
 */
function _calculateMovingAverage() {
  return successRates.reduce((a, b) => a + b, 0) / successRates.length;
}

/**
 * Starts the interval responsible for calculating current success rate ratio
 * and gathers
 *
 * @returns {NodeJS.Timeout} Id of an interval.
 */
function _startSuccessRate() {
  return setInterval(() => {
    const stats = getPoolStats();
    const successRatio =
      stats.exportAttempts === 0
        ? 1
        : (stats.performedExports / stats.exportAttempts) * 100;

    successRates.push(successRatio);
    if (successRates.length > windowSize) {
      successRates.shift();
    }
  }, recordInterval);
}

/**
 * Adds the /health and /success-moving-average routes
 * which output basic stats for the server.
 */
export default (app) => {
  if (!app) {
    return false;
  }

  // Start processing success rate ratio interval and save its id to the array
  // for the graceful clearing on shutdown with injected addInterval funtion
  addTimer(_startSuccessRate());

  app.get('/health', (request, response) => {
    const stats = getPoolStats();
    const period = successRates.length;
    const movingAverage = _calculateMovingAverage();

    log(4, '[health] Returning server health.');

    response.send({
      status: 'OK',
      bootTime: serverStartTime,
      uptime:
        Math.floor((getNewDateTime() - serverStartTime.getTime()) / 1000 / 60) +
        ' minutes',
      version: packageFile.version,
      highchartsVersion: getHighchartsVersion(),
      averageProcessingTime: stats.spentAverage,
      performedExports: stats.performedExports,
      failedExports: stats.droppedExports,
      exportAttempts: stats.exportAttempts,
      sucessRatio: (stats.performedExports / stats.exportAttempts) * 100,
      pool: getPoolInfoJSON(),

      // Moving average
      period,
      movingAverage,
      message:
        isNaN(movingAverage) || !successRates.length
          ? 'Too early to report. No exports made yet. Please check back soon.'
          : `Last ${period} minutes had a success rate of ${movingAverage.toFixed(2)}%.`,

      // SVG/JSON attempts
      svgExportAttempts: stats.exportFromSvgAttempts,
      jsonExportAttempts: stats.performedExports - stats.exportFromSvgAttempts
    });
  });
};
