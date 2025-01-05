/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module provides utility functions for managing intervals
 * and timeouts in a centralized manner. It maintains a registry of all active
 * timers and allows for their efficient cleanup when needed. This can be useful
 * in applications where proper resource management and clean shutdown of timers
 * are critical to avoid memory leaks or unintended behavior.
 */

import { log } from './logger.js';

// Array that contains ids of all ongoing intervals and timeouts
const timerIds = [];

/**
 * Adds id of the `setInterval` or `setTimeout` and to the `timerIds` array.
 *
 * @function addTimer
 *
 * @param {NodeJS.Timeout} id - Id of an interval or a timeout.
 */
export function addTimer(id) {
  timerIds.push(id);
}

/**
 * Clears all of ongoing intervals and timeouts by ids gathered
 * in the `timerIds` array.
 *
 * @function clearAllTimers
 */
export function clearAllTimers() {
  log(4, `[timer] Clearing all registered intervals and timeouts.`);
  for (const id of timerIds) {
    clearInterval(id);
    clearTimeout(id);
  }
}

export default {
  addTimer,
  clearAllTimers
};
