/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const log = require('./logger').log;
const browser = require('./browser');
const doExport = require('./export');
const genericPool = require('generic-pool');
const uuid = require('uuid/v4');
const configHandler = require('./config');

let performedExports = 0;
let timeSpent = 0;
let spentAvarage = 0;
let activeConfig = {};
let getBrowser = false;

// Factory for our generic pool
const factory = {
  // Create a new browser
  create: async () => {
    const id = uuid();

    return {
      id,
      browser: await browser.get(id),
      workCount: 0
    };
  },

  // Destroy a browser
  destroy: async (binstance) => {
    return browser.close(binstance.id);
  }
};

// The pool instance
let pool = false;

// Public interface

function init(config) {
  log(3, 'pool - initializing');

  if (pool) {
    return log(
      4,
      'pool - allready initialized, please kill it before creating a new one!'
    );
  }

  activeConfig = Object.assign(Object.assign({}, config.pool), config || {});

  pool = genericPool.createPool(factory, {
    max: activeConfig.maxWorkers,
    min: activeConfig.initialWorkers,
    evictionRunIntervalMillis: activeConfig.reaper ? 10000 : 0,
    idleTimeoutMillis: activeConfig.timeoutThreshold,
    maxWaitingClients: activeConfig.queueSize
  });

  //// getBrowser = pool.acquire();
}

/**
 * Kill the pool.
 *
 * This will flush all the browser instances.
 *
 */
const killAll = async () => {
  log(3, 'pool - killing all workers');

  if (!pool) {
    return true;
  }

  return pool.drain().then(function () {
    pool.clear();
  });
};

/**
 * Post work to the pool.
 */
const postWork = async (chart) => {
  log(3, 'pool - work received, starting to process');

  if (!pool) {
    log(1, 'pool - work received, but pool has not been started');
    throw 'pool is not initied, but work was posted to it!';
  }

  let result = {};

  const resPromise = pool.acquire();
  const browserHandle = await resPromise;

  // log(2, browserHandle.browser);

  // // Check if the work limit has been exceeded for the worker
  // if (
  //   browserHandle.workCount > activeConfig.workLimit &&
  //   activeConfig.workLimit
  // ) {
  //   log(4, `pool - worker ${browserHandle.id} reached limit, restarting`);
  //   pool.release(browserHandle);
  //   pool.destroy(browserHandle);
  //   return postWork(chart);
  // }

  try {
    let workStart = new Date().getTime();

    ++performedExports;

    result = await doExport(browserHandle.browser, activeConfig, chart);

    let workEnd = new Date().getTime();
    log(4, `pool - work completed in ${workEnd - workStart}ms`);

    if (activeConfig.benchmarking) {
      timeSpent += workEnd - workStart;
      spentAvarage = timeSpent / performedExports;
    }
  } catch (e) {
    pool.release(browserHandle);
    throw e;
  }

  pool.release(browserHandle);

  return result;
};

module.exports = {
  init,
  killAll,
  postWork,
  avarageTime: () => spentAvarage,
  processedWorkCount: () => performedExports
};
