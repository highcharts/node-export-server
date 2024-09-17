/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { killPool } from './pool.js';
import { clearAllTimers } from './timers.js';
import { closeServers } from './server/server.js';
import { terminateClients } from './server/webSocket.js';

/**
 * Clean up function to trigger before ending process for the graceful shutdown.
 *
 * @param {number} exitCode - An exit code for the process.exit() function.
 */
export async function shutdownCleanUp(exitCode) {
  // Await freeing all resources
  await Promise.allSettled([
    // Clear all ongoing timers
    clearAllTimers(),

    // Terminate all connected WebSocket clients
    terminateClients(),

    // Get available server instances (HTTP/HTTPS) and close them
    closeServers(),

    // Close pool along with its workers and the browser instance, if exists
    killPool()
  ]);

  // Exit process with a correct code
  process.exit(exitCode);
}

export default {
  shutdownCleanUp
};
