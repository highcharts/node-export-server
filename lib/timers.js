/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { log } from './logger.js';

// Array that contains ids of all ongoing intervals and timeouts
const timerIds = [];

/**
 * Adds id of setInterval or setTimeout and to the intervalIds array.
 *
 * @param {NodeJS.Timeout} id - Id of an interval/timeout.
 */
export const addTimer = (id) => {
  timerIds.push(id);
};

/**
 * Clears all of ongoing intervals and timeouts by ids gathered in the timerIds
 * array.
 */
export const clearAllTimers = () => {
  log(4, `[server] Clearing all registered intervals and timeouts.`);
  for (const id of timerIds) {
    clearInterval(id);
    clearTimeout(id);
  }
};

export default {
  addTimer,
  clearAllTimers
};
