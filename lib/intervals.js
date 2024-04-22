/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { log } from './logger.js';

// Array that contains ids of all ongoing intervals
const intervalIds = [];

/**
 * Adds id of a setInterval to the intervalIds array.
 *
 * @param {NodeJS.Timeout} id - Id of an interval.
 */
export const addInterval = (id) => {
  intervalIds.push(id);
};

/**
 * Clears all of ongoing intervals by ids gathered in the intervalIds array.
 */
export const clearAllIntervals = () => {
  log(4, `[server] Clearing all registered intervals.`);
  for (const id of intervalIds) {
    clearInterval(id);
  }
};

export default {
  addInterval,
  clearAllIntervals
};
