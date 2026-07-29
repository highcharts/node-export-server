/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { getOptions } from './config.js';
import { clearAllIntervals } from './intervals.js';
import { killPool } from './pool.js';
import { closeServers } from './server/server.js';

/**
 * Returns how long to let in-flight requests finish during a shutdown.
 *
 * @returns {number} The drain timeout in milliseconds.
 */
const getDrainTimeout = () => {
  const configured = parseInt(getOptions()?.other?.shutdownDrainTimeout);
  return isNaN(configured) || configured < 0 ? 30000 : configured;
};

/**
 * Clean up function to trigger before ending process for the graceful shutdown.
 *
 * @param {number} exitCode - An exit code for the process.exit() function.
 */
export const shutdownCleanUp = async (exitCode) => {
  // Stop the background intervals; nothing depends on their timing from here
  clearAllIntervals();

  // NOTE: These have to happen in order, not together. Previously all three were
  //       started at once and closeServers() was not even awaitable - it is not
  //       async and returned undefined, so Promise.allSettled treated it as
  //       already done. The process therefore exited as soon as the pool had been
  //       destroyed, cutting off every export still being served. That happens on
  //       each restart, deploy and scale-in, so the dropped requests were not rare.
  //
  //       Closing the servers first stops new work arriving and resolves once the
  //       requests in flight have been answered, which is the drain. It is raced
  //       against a timeout so that one request which never completes cannot hold
  //       the shutdown open indefinitely.
  const drainTimeout = getDrainTimeout();

  await Promise.race([
    closeServers(),
    new Promise((resolve) => setTimeout(resolve, drainTimeout))
  ]);

  // Only once nothing is being served is it safe to take the workers away
  await killPool();

  // Exit process with a correct code
  process.exit(exitCode);
};

export default {
  shutdownCleanUp
};
