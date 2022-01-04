/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const uuid = require('uuid/v4');
const genericPool = require('generic-pool');

const { log } = require('./logger');
const browser = require('./browser');
const puppeteerExport = require('./export');

let performedExports = 0;
let timeSpent = 0;
let spentAvarage = 0;
let poolConfig = {};

// The pool instance
let pool = false;

// Custom puppeteer arguments
let puppeteerArgs;

/**
 * Factory for the generic pool
 */
const factory = {
  // Create a new browser
  create: async () => {
    const id = uuid();

    return {
      id,
      browser: await browser.get(id, puppeteerArgs),
      workCount: 0
    };
  },

  // Destroy a browser
  destroy: async (browserInstance) => {
    return browser.close(browserInstance.id);
  }
};

/**
 * Init the pool of resources
 * @export pool
 * @param config {object} Pool configuration along with custom puppeteer
 * arguments for the puppeteer.launch function
 */
const init = (config) => {
  log(3, '[pool] - Initializing pool.');

  if (pool) {
    return log(
      4,
      '[pool] - Already initialized, please kill it before creating a new one.'
    );
  }

  // For the module scope usage
  poolConfig = { ...config.pool };

  // The newest puppeteer arguments for the browser creation
  puppeteerArgs = config.puppeteerArgs;

  // Create a pool
  pool = genericPool.createPool(factory, {
    min: poolConfig.initialWorkers,
    max: poolConfig.maxWorkers,
    evictionRunIntervalMillis: poolConfig.reaper ? 10000 : 0,
    idleTimeoutMillis: poolConfig.timeoutThreshold,
    maxWaitingClients: poolConfig.queueSize
  });
};

/**
 * Kill the pool and flush all the browser instances
 */
const killAll = async () => {
  log(3, '[pool] - Killing all workers.');

  // Return true when pool is already dead
  if (!pool) {
    return true;
  }

  // Start drainging pool and eventually clear it
  return pool.drain().then(() => {
    pool.clear();
  });
};

/**
 * Post work to the pool
 */
const postWork = async (chart, options) => {
  log(3, '[pool] - Work received, starting to process.');

  if (!pool) {
    log(1, '[pool] - Work received, but pool has not been started.');
    throw 'Pool is not initied, but work was posted to it!';
  }

  // Acquire the browser along with the id of resource and work count
  const browserHandle = await pool.acquire();

  // Check if the work limit has been exceeded for the worker
  if (browserHandle.workCount > poolConfig.workLimit) {
    log(4, `[pool] - Worker ${browserHandle.id} reached limit, restarting.`);

    pool.release(browserHandle);
    pool.destroy(browserHandle);
    return postWork(options);
  }

  try {
    // Save the start time
    let workStart = new Date().getTime();

    // Perform an export on a puppeteer level
    const result = await puppeteerExport(browserHandle.browser, chart, options);

    // Save the end time
    let workEnd = new Date().getTime();

    log(4, `[pool] - Work completed in ${workEnd - workStart}ms.`);

    // Addtional info about times when benchmarking is enabled
    if (poolConfig.benchmarking) {
      timeSpent += workEnd - workStart;
      spentAvarage = timeSpent / ++performedExports;
    }

    pool.release(browserHandle);
    return {
      result,
      options
    };
  } catch (error) {
    pool.release(browserHandle);
    throw error;
  }
};

module.exports = {
  init,
  killAll,
  postWork,
  avarageTime: () => spentAvarage,
  processedWorkCount: () => performedExports
};
