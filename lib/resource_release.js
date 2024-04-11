/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { clearAllIntervals } from './intervals.js';
import { log } from './logger.js';
import { killPool } from './pool.js';
import { getServers } from './server/server.js';

/**
 * Clean up function to trigger before ending process for the graceful shutdown.
 *
 * @param {number} exitCode - An exit code for the process.exit() function.
 */
export const shutdownCleanUp = async (exitCode) => {
  // Clear all ongoing intervals
  clearAllIntervals();

  // Close pool along with its resources and the browser instance
  await killPool();

  // Get server available server instances (HTTP/HTTPS) and close them
  for (const server of getServers()) {
    server.close(() => {
      log(4, `[server] Closed server on port: ${server.address().port}.`);
    });
  }

  // Exit process with a correct code
  process.exit(exitCode);
};

export default {
  shutdownCleanUp
};
