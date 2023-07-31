/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { v4 as uuid } from 'uuid';
import { createPool } from 'generic-pool';
import {
  close,
  newPage as browserNewPage,
  create as createBrowser
} from './browser.js';
import { log } from './logger.js';

import puppeteerExport from './export.js';

let performedExports = 0;
let exportAttempts = 0;
let timeSpent = 0;
let droppedExports = 0;
let spentAvarage = 0;
let poolConfig = {};

// The pool instance
let pool = false;

// Custom puppeteer arguments
let puppeteerArgs;

/**
 * Factory for the generic pool.
 */
const factory = (poolConfig) => ({
  /**
   * Creates a new worker.
   *
   * @return {object} - An object with the id of a resource, the work count and
   * a reference to the browser page.
   */
  create: async () => {
    const id = uuid();
    let page = false;

    const s = new Date().getTime();

    try {
      page = await browserNewPage();

      if (!page || page.isClosed()) {
        throw 'invalid page';
      }

      log(
        3,
        `[pool] Successfully created a worker ${id} - took ${
          new Date().getTime() - s
        } ms.`
      );
    } catch (error) {
      log(
        1,
        `[pool] Error creating a new page in pool entry creation! ${error}`
      );

      throw 'Error creating page';
    }

    return {
      id,
      page,
      // Try to distribute the initial work count
      workCount: Math.round(Math.random() * (poolConfig.workLimit / 2))
    };
  },

  /**
   * Destroys a worker.
   *
   * @param {object} workerHandle - A broswer's instance.
   */
  destroy: async (workerHandle) => {
    log(3, `[pool] Destroying pool entry ${workerHandle.id}.`);

    if (workerHandle.page) {
      // We don't really need to wait around for this.
      workerHandle.page.close();
    }
  },

  /**
   * Validate a worker.
   *
   * Checks that the work limit has not been exceeded.
   * If it has, fail the validation so the resource will be re-created.
   *
   * @param {object} workerHandle - Handle to the worker
   */
  validate: async (workerHandle) => {
    if (
      poolConfig.workLimit &&
      ++workerHandle.workCount > poolConfig.workLimit
    ) {
      log(
        3,
        `[pool] Worker failed validation:`,
        `exceeded work limit (limit is ${poolConfig.workLimit})`
      );
      return false;
    }
    return true;
  }
});

/**
 * Inits the pool of resources.
 *
 * @param {object} config - Pool configuration along with custom puppeteer
 * arguments for the puppeteer.launch function.
 */
export const init = async (config) => {
  // The newest puppeteer arguments for the browser creation
  puppeteerArgs = config.puppeteerArgs;

  // Wait until we've sucessfully created a browser instance.
  try {
    await createBrowser(puppeteerArgs);
  } catch (e) {
    log(0, '[pool|browser]', e);
  }

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

  // Attach process' exit listeners
  if (poolConfig.listenToProcessExits) {
    attachProcessExitListeners();
  }

  try {
    // Create a pool along with a minimal number of resources
    pool = createPool(factory(poolConfig), {
      autostart: true,
      testOnBorrow: true,
      min: poolConfig.initialWorkers,
      max: poolConfig.maxWorkers,
      maxWaitingClients: poolConfig.queueSize,
      idleTimeoutMillis: poolConfig.timeoutThreshold,
      acquireTimeoutMillis: poolConfig.acquireTimeout,
      // This one is causing some issues - the initial idea was to avoid
      // hanging processes. But it's causing a lot of overhead by constantly
      // killing and restarting things. The server seems to be more stable with
      // it disabled.
      evictionRunIntervalMillis: poolConfig.reaper ? 120000 : 0
    });

    // Await for the resources
    await pool.ready();

    pool.on('factoryCreateError', function (err) {
      log(1, '[pool] error when creating worker:', err);
    });

    pool.on('factoryDestroyError', function (err) {
      log(1, '[pool] error when destroying worker:', err);
    });

    log(
      3,
      `[pool] The pool is ready with ${poolConfig.initialWorkers} initial resources waiting.`
    );
  } catch (error) {
    log(1, `[pool] Couldn't create the worker pool ${error}`);
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
 * Kills the pool and flush the browser instance.
 */
export async function killAll() {
  log(3, '[pool] Killing all workers.');

  // Close browser instance
  try {
    await close();
  } catch {
    // if the browser has already been closed,
    // skip the rest of this function
    log(4, "[pool] Worker has already been killed.");
    return;
  }

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
  let workerHandle;

  // Handle fail conditions
  const fail = (msg) => {
    ++droppedExports;

    if (workerHandle) {
      pool.release(workerHandle);
    }

    throw 'In pool.postWork: ' + msg;
  };

  log(4, '[pool] Work received, starting to process.');

  if (poolConfig.benchmarking) {
    getPoolInfo();
  }

  ++exportAttempts;

  if (!pool) {
    log(1, '[pool] Work received, but pool has not been started.');
    return fail('Pool is not inited but work was posted to it!');
  }

  // Acquire the worker along with the id of resource and work count
  try {
    log(4, '[pool] Aquiring worker');
    workerHandle = await pool.acquire();
  } catch (error) {
    return fail(`[pool] Error when acquiring available entry: ${error}`);
  }

  log(4, '[pool] Acquired worker handle');

  if (!workerHandle.page) {
    return fail('Resolved worker page is invalid: pool setup is wonky');
  }

  try {
    // Save the start time
    let workStart = new Date().getTime();

    log(4, `[pool] Starting work on pool entry ${workerHandle.id}.`);

    // Perform an export on a puppeteer level
    const result = await puppeteerExport(workerHandle.page, chart, options);

    // Check if it's an error
    if (result instanceof Error) {
      // TODO: If the export failed because puppeteer timed out, we need to force kill the worker so we get a new page. That needs to be handled better than this hack.
      if (result === 'Rasterization timeout') {
        workerHandle.page.close();
        workerHandle.page = await browserNewPage();
      }

      return fail(result);
    }

    // Release the resource back to the pool
    pool.release(workerHandle);

    // Used for statistics in avarageTime and processedWorkCount, which
    // in turn is used by the /health route.
    const workEnd = new Date().getTime();
    const exportTime = workEnd - workStart;
    timeSpent += exportTime;
    spentAvarage = timeSpent / ++performedExports;

    log(4, `[pool] Work completed in ${exportTime} ms.`);

    // Otherwise return the result
    return {
      data: result,
      options
    };
  } catch (error) {
    fail(`Error trying to perform puppeteer export: ${error}.`);
  }
};

/**
 * Gets the pool.
 */
export function getPool() {
  return pool;
}

export const getPoolInfoJSON = () => ({
  min: pool.min,
  max: pool.max,
  size: pool.size,
  available: pool.available,
  borrowed: pool.borrowed,
  pending: pool.pending,
  spareResourceCapacity: pool.spareResourceCapacity
});

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
  getPoolInfoJSON,
  workAttempts: () => exportAttempts,
  droppedWork: () => droppedExports,
  avarageTime: () => spentAvarage,
  processedWorkCount: () => performedExports
};
