/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const { v4: uuid } = require('uuid');
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
    let browserInstance = false;

    log(4, `[pool] Creating pool entry ${id}.`);
    try {
      browserInstance = await browser.get(id, puppeteerArgs);
    } catch (error) {
      browserInstance = false;
      log(
        1,
        `[pool] Error getting browser instance in pool entry creation! ${error}`
      );
    }

    return {
      id,
      browser: browserInstance,
      workCount: 0
    };
  },

  // Destroy a browser
  destroy: async (browserInstance) => {
    log(4, `[pool] Destroying pool entry ${browserInstance.id}.`);
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
  // For the module scope usage
  poolConfig = config && config.pool ? { ...config.pool } : {};

  log(
    3,
    '[pool] Initializing pool:',
    `min ${poolConfig.initialWorkers}, max ${poolConfig.maxWorkers}.`
  );

  if (pool) {
    return log(
      4,
      '[pool] Already initialized, please kill it before creating a new one.'
    );
  }

  // The newest puppeteer arguments for the browser creation
  puppeteerArgs = config.puppeteerArgs;

  // Create a pool
  pool = genericPool.createPool(factory, {
    min: poolConfig.initialWorkers,
    max: poolConfig.maxWorkers,
    evictionRunIntervalMillis: poolConfig.reaper ? 120000 : 0,
    idleTimeoutMillis: poolConfig.timeoutThreshold,
    maxWaitingClients: poolConfig.queueSize
  });
};

/**
 * Kill the pool and flush all the browser instances
 */
const killAll = async () => {
  log(3, '[pool] Killing all workers.');

  // Return true when pool is already dead
  if (!pool) {
    return true;
  }

  // Start drainging pool and eventually clear it
  return pool.drain().then(() => {
    log(4, '[pool] Started draining process.');
    pool.clear();
  });
};

/**
 * Post work to the pool
 */
const postWork = async (chart, options) => {
  log(3, '[pool] Work received, starting to process.');

  if (!pool) {
    log(1, '[pool] Work received, but pool has not been started.');
    throw 'Pool is not initied, but work was posted to it!';
  }

  // Acquire the browser along with the id of resource and work count
  let browserHandle;

  try {
    browserHandle = await pool.acquire();
  } catch (error) {
    log(1, `[pool] Error when aquiring available entry: ${error}`);
    throw 'Error aquiring available worker in pool!';
  }

  log(4, '[pool] Aquired browser handle to use for export.');

  if (!browserHandle.browser) {
    return log(1, '[pool] Resolved browser is invalid: pool setup has failed.');
  }

  // Check if the work limit has been exceeded for the worker
  if (browserHandle.workCount > poolConfig.workLimit) {
    log(4, `[pool] Worker ${browserHandle.id} reached limit, restarting.`);

    pool.release(browserHandle);
    pool.destroy(browserHandle);
    return postWork(options);
  }

  try {
    // Save the start time
    let workStart = new Date().getTime();

    log(4, `[pool] Starting work on pool entry ${browserHandle.id}.`);

    // Perform an export on a puppeteer level
    const result = await puppeteerExport(browserHandle.browser, chart, options);

    // Save the end time
    let workEnd = new Date().getTime();

    log(4, `[pool] Work completed in ${workEnd - workStart}ms.`);

    // Addtional info about times when benchmarking is enabled
    if (poolConfig.benchmarking) {
      timeSpent += workEnd - workStart;
      spentAvarage = timeSpent / ++performedExports;
    }
    pool.release(browserHandle);

    // Check if it's an error
    if (result instanceof Error) {
      return {
        error: result
      };
    }

    // Otherwise return the result
    return {
      data: result,
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
