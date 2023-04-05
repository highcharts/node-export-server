/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const { v4: uuid } = require('uuid');
const genericPool = require('generic-pool');

const { log } = require('./logger');
const { expBackoff } = require('./utils');
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
 * Factory for the generic pool.
 */
const factory = {
  /**
   * Creates a new browser.
   *
   * @return {object} - An object with the id of a resource, the work count and
   * a reference to the browser instance.
   */
  create: async () => {
    const id = uuid();
    let browserInstance = false;

    log(3, `[pool] Creating pool entry ${id}.`);
    try {
      // Try to get a browser instance
      browserInstance = await expBackoff(browser.get, 0, id, puppeteerArgs);
      log(3, `[pool] Successfully created a browser instance ${id}.`);
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

  /**
   * Destroys a browser.
   *
   * @param {object} browserInstance - A broswer's instance.
   */
  destroy: async (browserInstance) => {
    log(4, `[pool] Destroying pool entry ${browserInstance.id}.`);
    getPoolInfo();
    return browser.close(browserInstance.id);
  }
};

/**
 * Inits the pool of resources.
 *
 * @param {object} config - Pool configuration along with custom puppeteer
 * arguments for the puppeteer.launch function.
 */
const init = async (config) => {
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

  // Attach process' exit listeners
  if (poolConfig.listenToProcessExits) {
    attachProcessExitListeners();
  }

  try {
    // Create a pool along with a minimal number of resources
    pool = genericPool.createPool(factory, {
      min: poolConfig.initialWorkers,
      max: poolConfig.maxWorkers,
      maxWaitingClients: poolConfig.queueSize,
      idleTimeoutMillis: poolConfig.timeoutThreshold,
      evictionRunIntervalMillis: poolConfig.reaper ? 120000 : 0
    });

    // Await for the resources
    await pool.ready();
    log(
      3,
      `[pool] The pool is ready with ${poolConfig.initialWorkers} initial resources waiting.`
    );
  } catch (error) {
    log(1, `[pool] Couldn't create a pool ${error}`);
    throw error;
  }
};

/**
 * Attaches process' exit listeners.
 */
const attachProcessExitListeners = () => {
  log(4, '[pool] Attaching exit listeners to the process.');

  // Kill all pool resources on exit
  process.on('exit', async () => {
    await killAll();
  });

  // Handler for the SIGINT
  process.on('SIGINT', (name, code) => {
    log(4, `The ${name} event with code: ${code}.`);
    process.exit(1);
  });

  // Handler for the SIGTERM
  process.on('SIGTERM', (name, code) => {
    log(4, `The ${name} event with code: ${code}.`);
    process.exit(1);
  });

  // Handler for the uncaughtException
  process.on('uncaughtException', async (error, name) => {
    log(4, `The ${name} error, message: ${error.message}.`);
  });
};

/**
 * Kills the pool and flush all the browser instances.
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
 * Posts work to the pool.
 *
 * @param {object} chart - Chart's options.
 * @param {object} options - All options object.
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
    if (poolConfig.benchmarking) {
      getPoolInfo();
    }
    browserHandle = await pool.acquire();
  } catch (error) {
    log(1, `[pool] Error when acquiring available entry: ${error}`);
    throw 'Error acquiring available worker in pool!';
  }

  log(4, '[pool] Acquired browser handle to use for export.');

  if (!browserHandle.browser) {
    return log(1, '[pool] Resolved browser is invalid: pool setup has failed.');
  }

  // Check if the work limit has been exceeded for the worker
  if (poolConfig.workLimit && browserHandle.workCount >= poolConfig.workLimit) {
    log(4, `[pool] Worker ${browserHandle.id} reached limit, restarting.`);

    // Destroy the worn out resource
    pool.release(browserHandle);
    pool.destroy(browserHandle);
    await pool.ready();

    // Recursively restart the export process
    return postWork(chart, options);
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

    // Increase the work count for the browser
    browserHandle.workCount++;

    // Release the resource
    pool.release(browserHandle);

    // Check if it's an error
    if (result instanceof Error) {
      throw result;
    }

    // Otherwise return the result
    return {
      data: result,
      options
    };
  } catch (error) {
    log(1, `[pool] Error trying to perform puppeteer expor: ${error}.`);
  }
};

/**
 * Gets the pool.
 */
const getPool = () => pool;

/**
 * Gets the pool's information.
 */
const getPoolInfo = () => {
  const {
    min,
    max,
    size,
    available,
    borrowed,
    pending,
    spareResourceCapacity
  } = pool;

  log(3, `[pool] The minimum number of resources allowed by pool: ${min}.`);
  log(3, `[pool] The maximum number of resources allowed by pool: ${max}.`);
  log(
    3,
    `[pool] The number of all resources in pool (free or in use): ${size}.`
  );
  log(
    3,
    `[pool] The number of resources that are currently available: ${available}.`
  );
  log(
    3,
    `[pool] The number of resources that are currently acquired: ${borrowed}.`
  );
  log(
    3,
    `[pool] The number of callers waiting to acquire a resource: ${pending}.`
  );
  log(
    3,
    `[pool] The number of how many more resources can the pool manage/create: ${spareResourceCapacity}.`
  );
};

module.exports = {
  getPool,
  getPoolInfo,
  init,
  killAll,
  postWork,
  avarageTime: () => spentAvarage,
  processedWorkCount: () => performedExports
};
