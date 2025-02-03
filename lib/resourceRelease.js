/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Handles graceful shutdown of the Highcharts Export Server, ensuring
 * proper cleanup of resources such as browser, pages, servers, and timers.
 */

import { killPool } from './pool.js';
import { clearAllTimers } from './timer.js';

import { closeServers } from './server/server.js';
import { terminateClients } from './server/webSocket.js';

/**
 * Performs cleanup operations to ensure a graceful shutdown of the process.
 * This includes clearing all registered timeouts/intervals, closing active
 * servers, terminating resources (pages) of the pool, pool itself, and closing
 * the browser.
 *
 * @function shutdownCleanUp
 *
 * @param {number} [exitCode=0] - The exit code to use with `process.exit()`.
 * The default value is `0`.
 */
export async function shutdownCleanUp(exitCode = 0) {
  // Await freeing all resources
  await Promise.allSettled([
    // Clear all ongoing intervals
    clearAllTimers(),

    // Terminate all connected WebSocket clients
    terminateClients(),

    // Get available server instances (HTTP/HTTPS) and close them
    closeServers(),

    // Close an active pool along with its workers and the browser instance
    killPool()
  ]);

  // Exit process with a correct code
  process.exit(exitCode);
}

export default {
  shutdownCleanUp
};
