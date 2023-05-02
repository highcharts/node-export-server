/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { v4 as uuid } from 'uuid';
import { createPool } from 'generic-pool';
import { get, close, newPage as browserNewPage } from './browser.js';
import { log } from './logger.js';
import { expBackoff } from './utils.js';

import puppeteerExport from './export.js';

////////////////////////////////////////////////////////////////////////////////

let performedExports = 0;
let timeSpent = 0;
let spentAvarage = 0;
let poolConfig = {};

// The pool instance
let pool = false;

// Custom puppeteer arguments
let puppeteerArgs;

////////////////////////////////////////////////////////////////////////////////

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
    let page = false;

    log(3, `[pool] Creating pool entry ${id}.`);
    try {
      // Try to get a browser instance
      browserInstance = await expBackoff(get, 0, id, puppeteerArgs);
      page = await browserNewPage();


      if (browserInstance) {
        log(3, `[pool] Successfully created a browser instance ${id}.`);
      } else {
        log(0, '[pool] unable to create browser');
      }
    } catch (error) {
      browserInstance = false;
      log(
        1,
        `[pool] Error getting browser instance in pool entry creation! ${error}`
      );
    }

    return {
      id,
      page,
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
    return close(browserInstance.id);
  }
};

/**
 * Inits the pool of resources.
 *
 * @param {object} config - Pool configuration along with custom puppeteer
 * arguments for the puppeteer.launch function.
 */
export const init = async (config) => {
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
    pool = createPool(factory, {
      min: poolConfig.initialWorkers,
      max: poolConfig.maxWorkers,
      maxWaitingClients: poolConfig.queueSize,
      idleTimeoutMillis: poolConfig.timeoutThreshold,
      // This one is causing some issues - the initial idea was to avoid
      // hanging processes. But it's causing a lot of overhead by constantly
      // killing and restarting things. The server seems to be more stable with
      // it disabled. 
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
export function attachProcessExitListeners() {
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
}

/**
 * Kills the pool and flush all the browser instances.
 */
export async function killAll() {
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
}

/**
 * Posts work to the pool.
 *
 * @param {object} chart - Chart's options.
 * @param {object} options - All options object.
 */
export const postWork = async (chart, options) => {
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
  // TODO: When starting a worker the first time, distribute the initial workCount
  // value between all workers so that they don't all reset at aprox. the same
  // time under constant/steady load.
  if (poolConfig.workLimit && browserHandle.workCount >= poolConfig.workLimit) {
    log(4, `[pool] Worker ${browserHandle.id} reached limit, restarting.`);

    await browserHandle.page.close();
    // Completely destroy the resource
    await pool.destroy(browserHandle);
    // Wait for the pool to get ready again
    await pool.ready();

    // Recursively restart the export process so that we can aquire a new handle
    return postWork(chart, options);
  }

  try {
    // Save the start time
    let workStart = new Date().getTime();

    log(4, `[pool] Starting work on pool entry ${browserHandle.id}.`);

    // Perform an export on a puppeteer level
    const result = await puppeteerExport(browserHandle.page, chart, options);

    // Used for statistics in avarageTime and processedWorkCount, which
    // in turn is used by the /health route.
    const workEnd = new Date().getTime();
    timeSpent += workEnd - workStart;
    spentAvarage = timeSpent / ++performedExports;

    // Increase the work count for the browser
    browserHandle.workCount++;

    // Release the resource back to the pool
    pool.release(browserHandle);

    // Check if it's an error
    if (result instanceof Error) {
      throw result;
    }

    log(3, `[pool] Work completed in ${workEnd - workStart}ms.`);

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
export function getPool() {
  return pool;
}

/**
 * Gets the pool's information.
 */
export function getPoolInfo() {
  const {
    min,
    max,
    size,
    available,
    borrowed,
    pending,
    spareResourceCapacity
  } = pool;

  log(4, `[pool] The minimum number of resources allowed by pool: ${min}.`);
  log(4, `[pool] The maximum number of resources allowed by pool: ${max}.`);
  log(
    4,
    `[pool] The number of all resources in pool (free or in use): ${size}.`
  );
  log(
    4,
    `[pool] The number of resources that are currently available: ${available}.`
  );
  log(
    4,
    `[pool] The number of resources that are currently acquired: ${borrowed}.`
  );
  log(
    4,
    `[pool] The number of callers waiting to acquire a resource: ${pending}.`
  );
  log(
    4,
    `[pool] The number of how many more resources can the pool manage/create: ${spareResourceCapacity}.`
  );
}

export default {
  init,
  killAll,
  postWork,
  getPool,
  getPoolInfo,
  avarageTime: () => spentAvarage,
  processedWorkCount: () => performedExports
};
