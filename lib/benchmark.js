/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { log } from './logger.js';
const timers = {};

// TODO: Read from config
let enabled = false;

export default (id) => {
  if (!enabled) {
    return () => {};
  }

  timers[id] = new Date();
  return () => {
    log(
      3,
      `[benchmark] - ${id}: ${new Date().getTime() - timers[id].getTime()}ms`
    );
  };
};
