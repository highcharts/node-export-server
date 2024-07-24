/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { Pool } from 'tarn';
import { v4 as uuid } from 'uuid';

import {
  create as createBrowser,
  close as closeBrowser,
  newPage,
  clearPage
} from './browser.js';
import puppeteerExport from './export.js';
import { log, logWithStack } from './logger.js';
import { measureTime } from './utils.js';

import ExportError from './errors/ExportError.js';

// The pool instance
let pool = false;

// Pool statistics
export const stats = {
  performedExports: 0,
  exportAttempts: 0,
  exportFromSvgAttempts: 0,
  timeSpent: 0,
  droppedExports: 0,
  spentAverage: 0
};

let poolConfig = {};

const factory = {
  /**
   * Creates a new worker page for the export pool.
   *
   * @returns {Object} - An object containing the worker ID, a reference to the
   * browser page, and initial work count.
   *
   * @throws {ExportError} - If there's an error during the creation of the new
   * page.
   */
  create: async () => {
    let page = false;

    const id = uuid();
    const startDate = new Date().getTime();

    try {
      page = await newPage();

      if (!page || page.isClosed()) {
        throw new ExportError('The page is invalid or closed.');
      }

      log(
        3,
        `[pool] Successfully created a worker ${id} - took ${
          new Date().getTime() - startDate
        } ms.`
      );
    } catch (error) {
      throw new ExportError(
        'Error encountered when creating a new page.'
      ).setError(error);
    }

    return {
      id,
      page,
      // Try to distribute the initial work count
      workCount: Math.round(Math.random() * (poolConfig.workLimit / 2))
    };
  },

  /**
   * Validates a worker page in the export pool, checking if it has exceeded
   * the work limit.
   *
   * @param {Object} workerHandle - The handle to the worker, containing the
   * worker's ID, a reference to the browser page, and work count.
   *
   * @returns {boolean} - Returns true if the worker is valid and within
   * the work limit; otherwise, returns false.
   */
  validate: async (workerHandle) => {
    if (
      poolConfig.workLimit &&
      ++workerHandle.workCount > poolConfig.workLimit
    ) {
      log(
        3,
        `[pool] Worker failed validation: exceeded work limit (limit is ${poolConfig.workLimit}).`
      );
      return false;
    }
    return true;
  },

  /**
   * Destroys a worker entry in the export pool, closing its associated page.
   *
   * @param {Object} workerHandle - The handle to the worker, containing
   * the worker's ID and a reference to the browser page.
   */
  destroy: async (workerHandle) => {
    log(3, `[pool] Destroying pool entry ${workerHandle.id}.`);

    if (workerHandle.page) {
      // We don't really need to wait around for this
      await workerHandle.page.close();
    }
  }
};

/**
 * Initializes the export pool with the provided configuration, creating
 * a browser instance and setting up worker resources.
 *
 * @param {Object} config - Configuration options for the export pool along
 * with custom puppeteer arguments for the puppeteer.launch function.
 */
export const initPool = async (config) => {
  // For the module scope usage
  poolConfig = config && config.pool ? { ...config.pool } : {};

  // Create a browser instance with the puppeteer arguments
  await createBrowser(config.puppeteerArgs);

  log(
    3,
    `[pool] Initializing pool with workers: min ${poolConfig.minWorkers}, max ${poolConfig.maxWorkers}.`
  );

  if (pool) {
    return log(
      4,
      '[pool] Already initialized, please kill it before creating a new one.'
    );
  }

  if (parseInt(poolConfig.minWorkers) > parseInt(poolConfig.maxWorkers)) {
    poolConfig.minWorkers = poolConfig.maxWorkers;
  }

  try {
    // Create a pool along with a minimal number of resources
    pool = new Pool({
      // Get the create/validate/destroy/log functions
      ...factory,
      min: parseInt(poolConfig.minWorkers),
      max: parseInt(poolConfig.maxWorkers),
      acquireTimeoutMillis: poolConfig.acquireTimeout,
      createTimeoutMillis: poolConfig.createTimeout,
      destroyTimeoutMillis: poolConfig.destroyTimeout,
      idleTimeoutMillis: poolConfig.idleTimeout,
      createRetryIntervalMillis: poolConfig.createRetryInterval,
      reapIntervalMillis: poolConfig.reaperInterval,
      propagateCreateError: false
    });

    // Set events
    pool.on('release', async (resource) => {
      // Clear page
      await clearPage(resource.page, false);
      log(4, `[pool] Releasing a worker with ID ${resource.id}.`);
    });

    pool.on('destroySuccess', (eventId, resource) => {
      log(4, `[pool] Destroyed a worker with ID ${resource.id}.`);
    });

    const initialResources = [];
    // Create an initial number of resources
    for (let i = 0; i < poolConfig.minWorkers; i++) {
      try {
        const resource = await pool.acquire().promise;
        initialResources.push(resource);
      } catch (error) {
        logWithStack(2, error, '[pool] Could not create an initial resource.');
      }
    }

    // Release the initial number of resources back to the pool
    initialResources.forEach((resource) => {
      pool.release(resource);
    });

    log(
      3,
      `[pool] The pool is ready${initialResources.length ? ` with ${initialResources.length} initial resources waiting.` : '.'}`
    );
  } catch (error) {
    throw new ExportError(
      '[pool] Could not create the pool of workers.'
    ).setError(error);
  }
};

/**
 * Kills all workers in the pool, destroys the pool, and closes the browser
 * instance.
 *
 * @returns {Promise<void>} A promise that resolves after the workers are
 * killed, the pool is destroyed, and the browser is closed.
 */
export async function killPool() {
  log(3, '[pool] Killing pool with all workers and closing browser.');

  // If still alive, destroy the pool of pages before closing a browser
  if (pool) {
    // Free up not released workers
    for (const worker of pool.used) {
      pool.release(worker.resource);
    }

    // Destroy the pool if it is still available
    if (!pool.destroyed) {
      await pool.destroy();
      log(4, '[browser] Destroyed the pool of resources.');
    }
  }

  // Close the browser instance
  await closeBrowser();
}

/**
 * Processes the export work using a worker from the pool. Acquires a worker
 * handle from the pool, performs the export using puppeteer, and releases
 * the worker handle back to the pool.
 *
 * @param {string} chart - The chart data or configuration to be exported.
 * @param {Object} options - Export options and configuration.
 *
 * @returns {Promise<Object>} A promise that resolves with the export resultand
 * options.
 *
 * @throws {ExportError} If an error occurs during the export process.
 */
export const postWork = async (chart, options) => {
  let workerHandle;

  try {
    log(4, '[pool] Work received, starting to process.');

    ++stats.exportAttempts;
    if (poolConfig.benchmarking) {
      getPoolInfo();
    }

    if (!pool) {
      throw new ExportError('Work received, but pool has not been started.');
    }

    // Acquire the worker along with the id of resource and work count
    const acquireCounter = measureTime();
    try {
      log(4, '[pool] Acquiring a worker handle.');
      workerHandle = await pool.acquire().promise;

      // Check the page acquire time
      if (options.server.benchmarking) {
        log(
          5,
          options.payload?.requestId
            ? `[benchmark] Request with ID ${options.payload?.requestId} -`
            : '[benchmark]',
          `Acquired a worker handle: ${acquireCounter()}ms.`
        );
      }
    } catch (error) {
      throw new ExportError(
        (options.payload?.requestId
          ? `For request with ID ${options.payload?.requestId} - `
          : '') +
          `Error encountered when acquiring an available entry: ${acquireCounter()}ms.`
      ).setError(error);
    }
    log(4, '[pool] Acquired a worker handle.');

    if (!workerHandle.page) {
      throw new ExportError(
        'Resolved worker page is invalid: the pool setup is wonky.'
      );
    }

    // Save the start time
    let workStart = new Date().getTime();

    log(4, `[pool] Starting work on pool entry with ID ${workerHandle.id}.`);

    // Perform an export on a puppeteer level
    const exportCounter = measureTime();
    const result = await puppeteerExport(workerHandle.page, chart, options);

    // Check if it's an error
    if (result instanceof Error) {
      // TODO: If the export failed because puppeteer timed out, we need to force kill the worker so we get a new page. That needs to be handled better than this hack.
      if (result.message === 'Rasterization timeout') {
        workerHandle.page.close();
        workerHandle.page = await newPage();
      }

      throw new ExportError(
        (options.payload?.requestId
          ? `For request with ID ${options.payload?.requestId} - `
          : '') + `Error encountered during export: ${exportCounter()}ms.`
      ).setError(result);
    }

    // Check the Puppeteer export time
    if (options.server.benchmarking) {
      log(
        5,
        options.payload?.requestId
          ? `[benchmark] Request with ID ${options.payload?.requestId} -`
          : '[benchmark]',
        `Exported a chart sucessfully: ${exportCounter()}ms.`
      );
    }

    // Release the resource back to the pool
    pool.release(workerHandle);

    // Used for statistics in averageTime and processedWorkCount, which
    // in turn is used by the /health route.
    const workEnd = new Date().getTime();
    const exportTime = workEnd - workStart;
    stats.timeSpent += exportTime;
    stats.spentAverage = stats.timeSpent / ++stats.performedExports;

    log(4, `[pool] Work completed in ${exportTime} ms.`);

    // Otherwise return the result
    return {
      result,
      options
    };
  } catch (error) {
    ++stats.droppedExports;

    if (workerHandle) {
      pool.release(workerHandle);
    }

    throw new ExportError(`[pool] In pool.postWork: ${error.message}`).setError(
      error
    );
  }
};

/**
 * Retrieves the current pool instance.
 *
 * @returns {Object|null} The current pool instance if initialized, or null
 * if the pool has not been created.
 */
export const getPool = () => pool;

/**
 * Retrieves pool information in JSON format, including minimum and maximum
 * workers, available workers, workers in use, and pending acquire requests.
 *
 * @returns {Object} Pool information in JSON format.
 */
export const getPoolInfoJSON = () => ({
  min: pool.min,
  max: pool.max,
  all: pool.numFree() + pool.numUsed(),
  available: pool.numFree(),
  used: pool.numUsed(),
  pending: pool.numPendingAcquires()
});

/**
 * Logs information about the current state of the pool, including the minimum
 * and maximum workers, available workers, workers in use, and pending acquire
 * requests.
 */
export function getPoolInfo() {
  const { min, max, all, available, used, pending } = getPoolInfoJSON();

  log(5, `[pool] The minimum number of resources allowed by pool: ${min}.`);
  log(5, `[pool] The maximum number of resources allowed by pool: ${max}.`);
  log(5, `[pool] The number of all created resources: ${all}.`);
  log(5, `[pool] The number of available resources: ${available}.`);
  log(5, `[pool] The number of acquired resources: ${used}.`);
  log(5, `[pool] The number of resources waiting to be acquired: ${pending}.`);
}

export default {
  initPool,
  killPool,
  postWork,
  getPool,
  getPoolInfo,
  getPoolInfoJSON,
  getStats: () => stats
};
