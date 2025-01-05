/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Defines an Express route for server health monitoring, including
 * uptime, success rates, and other server statistics.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { getHighchartsVersion } from '../../cache.js';
import { log } from '../../logger.js';
import { getPoolStats, getPoolInfoJSON } from '../../pool.js';
import { addTimer } from '../../timer.js';
import { __dirname, getNewDateTime } from '../../utils.js';

// Set the start date of the server
const serverStartTime = new Date();

// Get the `package.json` content
const packageFile = JSON.parse(readFileSync(join(__dirname, 'package.json')));

// An array for success rate ratios
const successRates = [];

// Record every minute
const recordInterval = 60 * 1000;

// 30 minutes
const windowSize = 30;

/**
 * Calculates moving average indicator based on the data from the `successRates`
 * array.
 *
 * @function _calculateMovingAverage
 *
 * @returns {number} A moving average for success ratio of the server exports.
 */
function _calculateMovingAverage() {
  return successRates.reduce((a, b) => a + b, 0) / successRates.length;
}

/**
 * Starts the interval responsible for calculating current success rate ratio
 * and collects records to the `successRates` array.
 *
 * @function _startSuccessRate
 *
 * @returns {NodeJS.Timeout} Id of an interval.
 */
function _startSuccessRate() {
  return setInterval(() => {
    const stats = getPoolStats();
    const successRatio =
      stats.exportsAttempted === 0
        ? 1
        : (stats.exportsPerformed / stats.exportsAttempted) * 100;

    successRates.push(successRatio);
    if (successRates.length > windowSize) {
      successRates.shift();
    }
  }, recordInterval);
}

/**
 * Adds the `health` routes.
 *
 * @function healthRoutes
 *
 * @param {Express} app - The Express app instance.
 */
export default function healthRoutes(app) {
  // Start processing success rate ratio interval and save its id to the array
  // for the graceful clearing on shutdown with injected `addTimer` funtion
  addTimer(_startSuccessRate());

  /**
   * Adds the GET '/health' - A route for getting the basic stats of the server.
   */
  app.get('/health', (request, response, next) => {
    try {
      log(4, '[health] Returning server health.');

      const stats = getPoolStats();
      const period = successRates.length;
      const movingAverage = _calculateMovingAverage();

      // Send the server's statistics
      response.send({
        // Status and times
        status: 'OK',
        bootTime: serverStartTime,
        uptime: `${Math.floor((getNewDateTime() - serverStartTime.getTime()) / 1000 / 60)} minutes`,

        // Versions
        serverVersion: packageFile.version,
        highchartsVersion: getHighchartsVersion(),

        // Exports
        averageExportTime: stats.timeSpentAverage,
        attemptedExports: stats.exportsAttempted,
        performedExports: stats.exportsPerformed,
        failedExports: stats.exportsDropped,
        sucessRatio: (stats.exportsPerformed / stats.exportsAttempted) * 100,

        // Pool
        pool: getPoolInfoJSON(),

        // Moving average
        period,
        movingAverage,
        message:
          isNaN(movingAverage) || !successRates.length
            ? 'Too early to report. No exports made yet. Please check back soon.'
            : `Last ${period} minutes had a success rate of ${movingAverage.toFixed(2)}%.`,

        // SVG and JSON exports
        svgExports: stats.exportsFromSvg,
        jsonExports: stats.exportsFromOptions,
        svgExportsAttempts: stats.exportsFromSvgAttempts,
        jsonExportsAttempts: stats.exportsFromOptionsAttempts
      });
    } catch (error) {
      return next(error);
    }
  });
}
