/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { Pool } from 'tarn';
import { v4 as uuid } from 'uuid';

import { createBrowser, closeBrowser, newPage, clearPage } from './browser.js';
import { getOptions } from './config.js';
import { puppeteerExport } from './export.js';
import { log, logWithStack } from './logger.js';
import { addTimer } from './timers.js';
import { getNewDateTime, measureTime } from './utils.js';
import { envs } from './validate.js';

import ExportError from './errors/ExportError.js';

// The pool instance
let pool = false;

// Pool statistics
const poolStats = {
  performedExports: 0,
  exportAttempts: 0,
  exportFromSvgAttempts: 0,
  timeSpent: 0,
  droppedExports: 0,
  spentAverage: 0
};

/**
 * Initializes the export pool with the provided configuration, creating
 * a browser instance and setting up worker resources.
 *
 * @param {Object} poolOptions - Object containing pool options.
 * @param {Array.<string>} puppeteerArgs - Array of custom puppeteer arguments
 * for the puppeteer.launch function.
 */
export async function initPool(poolOptions = getOptions().pool, puppeteerArgs) {
  // Create a browser instance with the puppeteer arguments
  await createBrowser(puppeteerArgs);

  log(
    3,
    `[pool] Initializing pool with workers: min ${poolOptions.minWorkers}, max ${poolOptions.maxWorkers}.`
  );

  if (pool) {
    return log(
      4,
      '[pool] Already initialized, please kill it before creating a new one.'
    );
  }

  // Keep an eye on a correct min and max workers number
  if (poolOptions.minWorkers > poolOptions.maxWorkers) {
    poolOptions.minWorkers = poolOptions.maxWorkers;
  }

  try {
    // Create a pool along with a minimal number of resources
    pool = new Pool({
      // Get the create/validate/destroy/log functions
      ..._factory(poolOptions),
      min: poolOptions.minWorkers,
      max: poolOptions.maxWorkers,
      acquireTimeoutMillis: poolOptions.acquireTimeout,
      createTimeoutMillis: poolOptions.createTimeout,
      destroyTimeoutMillis: poolOptions.destroyTimeout,
      idleTimeoutMillis: poolOptions.idleTimeout,
      createRetryIntervalMillis: poolOptions.createRetryInterval,
      reapIntervalMillis: poolOptions.reaperInterval,
      propagateCreateError: false
    });

    // Set events
    pool.on('release', async (resource) => {
      log(4, `[pool] Pool resource [${resource.id}] - Releasing a worker.`);
      await clearPage(resource, false);
    });

    pool.on('destroySuccess', (_eventId, resource) => {
      log(
        4,
        `[pool] Pool resource [${resource.id}] - Destroyed a worker successfully.`
      );
      resource.page = null;
    });

    const initialResources = [];
    // Create an initial number of resources
    for (let i = 0; i < poolOptions.minWorkers; i++) {
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

    // Init the interval for checking if the minimum number of resources exist
    if (envs.POOL_RESOURCES_INTERVAL) {
      // Register interval for the later clearing
      addTimer(_checkingResourcesInterval(envs.POOL_RESOURCES_INTERVAL));
    }

    log(
      3,
      `[pool] The pool is ready${initialResources.length ? ` with ${initialResources.length} initial resources waiting.` : '.'}`
    );
  } catch (error) {
    throw new ExportError(
      '[pool] Could not create the pool of workers.',
      500
    ).setError(error);
  }
}

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

    // Remove all attached event listeners from the pool
    pool.removeAllListeners('release');
    pool.removeAllListeners('destroySuccess');
    pool.removeAllListeners('destroyFail');

    // Destroy the pool if it is still available
    if (!pool.destroyed) {
      await pool.destroy();
      log(4, '[browser] Destroyed the pool of resources.');
    }
    pool = null;
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
export async function postWork(chart, options) {
  let workerHandle;

  try {
    log(4, '[pool] Work received, starting to process.');

    ++poolStats.exportAttempts;
    if (getOptions().pool.benchmarking) {
      getPoolInfo();
    }

    if (!pool) {
      throw new ExportError(
        'Work received, but pool has not been started.',
        500
      );
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
            ? `[benchmark] Request: ${options.payload?.requestId} -`
            : '[benchmark]',
          `Acquired a worker handle: ${acquireCounter()}ms.`
        );
      }
    } catch (error) {
      throw new ExportError(
        (options.payload?.requestId
          ? `Request: ${options.payload?.requestId} - `
          : '') +
          `Error encountered when acquiring an available entry: ${acquireCounter()}ms.`
      ).setError(error);
    }
    log(4, '[pool] Acquired a worker handle.');

    if (!workerHandle.page) {
      // Set the `workLimit` to exceeded in order to recreate the resource
      workerHandle.workCount = options.pool.workLimit + 1;
      throw new ExportError(
        'Resolved worker page is invalid: the pool setup is wonky.',
        500
      );
    }

    // Save the start time
    let workStart = getNewDateTime();

    log(
      4,
      `[pool] Pool resource [${workerHandle.id}] - Starting work on this pool entry.`
    );

    // Perform an export on a puppeteer level
    const exportCounter = measureTime();
    const result = await puppeteerExport(workerHandle.page, chart, options);

    // Check if it's an error
    if (result instanceof Error) {
      if (result.message === 'Rasterization timeout') {
        // Set the `workLimit` to exceeded in order to recreate the resource
        workerHandle.workCount = options.pool.workLimit + 1;
      }

      throw new ExportError(
        (options.payload?.requestId
          ? `Request: ${options.payload?.requestId} - `
          : '') + `Error encountered during export: ${exportCounter()}ms.`
      ).setError(result);
    }

    // Check the Puppeteer export time
    if (options.server.benchmarking) {
      log(
        5,
        options.payload?.requestId
          ? `[benchmark] Request: ${options.payload?.requestId} -`
          : '[benchmark]',
        `Exported a chart sucessfully: ${exportCounter()}ms.`
      );
    }

    // Release the resource back to the pool
    pool.release(workerHandle);

    // Used for statistics in averageTime and processedWorkCount, which
    // in turn is used by the /health route.
    const workEnd = getNewDateTime();
    const exportTime = workEnd - workStart;

    poolStats.timeSpent += exportTime;
    poolStats.spentAverage = poolStats.timeSpent / ++poolStats.performedExports;

    log(4, `[pool] Work completed in ${exportTime} ms.`);

    // Otherwise return the result
    return {
      result,
      options
    };
  } catch (error) {
    ++poolStats.droppedExports;

    if (workerHandle) {
      pool.release(workerHandle);
    }

    throw new ExportError(`[pool] In pool.postWork: ${error.message}`).setError(
      error
    );
  }
}

/**
 * Retrieves the current pool instance.
 *
 * @returns {(Object|null)} The current pool instance if initialized, or null
 * if the pool has not been created.
 */
export function getPool() {
  return pool;
}

/**
 * Gets the statistic of a pool instace about exports.
 */
export function getPoolStats() {
  return poolStats;
}

/**
 * Retrieves pool information in JSON format, including minimum and maximum
 * workers, available workers, workers in use, and pending acquire requests.
 *
 * @returns {Object} Pool information in JSON format.
 */
export function getPoolInfoJSON() {
  return {
    min: pool.min,
    max: pool.max,
    used: pool.numUsed(),
    available: pool.numFree(),
    allCreated: pool.numUsed() + pool.numFree(),
    pendingAcquires: pool.numPendingAcquires(),
    pendingCreates: pool.numPendingCreates(),
    pendingValidations: pool.numPendingValidations(),
    pendingDestroys: pool.pendingDestroys.length,
    absoluteAll:
      pool.numUsed() +
      pool.numFree() +
      pool.numPendingAcquires() +
      pool.numPendingCreates() +
      pool.numPendingValidations() +
      pool.pendingDestroys.length
  };
}

/**
 * Logs information about the current state of the pool, including the minimum
 * and maximum workers, available workers, workers in use, and pending acquire
 * requests.
 */
export function getPoolInfo() {
  const {
    min,
    max,
    used,
    available,
    allCreated,
    pendingAcquires,
    pendingCreates,
    pendingValidations,
    pendingDestroys,
    absoluteAll
  } = getPoolInfoJSON();

  log(5, `[pool] The minimum number of resources allowed by pool: ${min}.`);
  log(5, `[pool] The maximum number of resources allowed by pool: ${max}.`);
  log(5, `[pool] The number of used resources: ${used}.`);
  log(5, `[pool] The number of free resources: ${available}.`);
  log(
    5,
    `[pool] The number of all created (used and free) resources: ${allCreated}.`
  );
  log(
    5,
    `[pool] The number of resources waiting to be acquired: ${pendingAcquires}.`
  );
  log(
    5,
    `[pool] The number of resources waiting to be created: ${pendingCreates}.`
  );
  log(
    5,
    `[pool] The number of resources waiting to be validated: ${pendingValidations}.`
  );
  log(
    5,
    `[pool] The number of resources waiting to be destroyed: ${pendingDestroys}.`
  );
  log(5, `[pool] The number of all resources: ${absoluteAll}.`);
}

/**
 * Factory function that returns an object with create, validate and destroy
 * functions for the pool instance.
 *
 * @param {Object} poolOptions - Object containing pool options.
 */
function _factory(poolOptions) {
  return {
    /**
     * Creates a new worker page for the export pool.
     *
     * @returns {Object} An object containing the worker ID, a reference to the
     * browser page, and initial work count.
     *
     * @throws {ExportError} If there's an error during the creation of the new
     * page.
     */
    create: async () => {
      try {
        const poolResource = {
          id: uuid(),
          // Try to distribute the initial work count
          workCount: Math.round(Math.random() * (poolOptions.workLimit / 2))
        };

        return await newPage(poolResource);
      } catch (error) {
        throw new ExportError(
          'Error encountered when creating a new page.',
          500
        ).setError(error);
      }
    },

    /**
     * Validates a worker page in the export pool, checking if it has exceeded
     * the work limit.
     *
     * @param {Object} poolResource - The handle to the worker, containing the
     * worker's ID, a reference to the browser page, and work count.
     *
     * @returns {boolean} - Returns true if the worker is valid and within
     * the work limit; otherwise, returns false.
     */
    validate: async (poolResource) => {
      let validated = true;

      // Check if the `workLimit` is exceeded
      if (
        poolOptions.workLimit &&
        ++poolResource.workCount > poolOptions.workLimit
      ) {
        log(
          3,
          `[pool] Pool resource [${poolResource.id}] - Validation failed (exceeded the ${poolOptions.workLimit} works limit).`
        );
        validated = false;
      }

      // Check if the `page` is not valid
      if (!poolResource.page) {
        // Check if the `page` is closed
        if (poolResource.page.isClosed()) {
          log(
            3,
            `[pool] Pool resource [${poolResource.id}] - Validation failed (page is closed or invalid).`
          );
        }

        // Check if the `mainFrame` is detached
        if (poolResource.page.mainFrame().detached) {
          log(
            3,
            `[pool] Pool resource [${poolResource.id}] - Validation failed (page's frame is detached).`
          );
        }
        validated = false;
      }

      return validated;
    },

    /**
     * Destroys a worker entry in the export pool, closing its associated page.
     *
     * @param {Object} poolResource - The handle to the worker, containing
     * the worker's ID and a reference to the browser page.
     */
    destroy: async (poolResource) => {
      log(
        3,
        `[pool] Pool resource [${poolResource.id}] - Destroying a worker.`
      );

      if (poolResource.page) {
        try {
          // Remove all attached event listeners from the resource
          poolResource.page.removeAllListeners('pageerror');
          poolResource.page.removeAllListeners('console');
          poolResource.page.removeAllListeners('framedetached');

          // We need to wait around for this
          await poolResource.page.close();
        } catch (error) {
          log(
            3,
            `[pool] Pool resource [${poolResource.id}] - Page could not be closed upon destroying.`
          );
        }
      }
    }
  };
}

/**
 * Periodically checks and ensures the minimum number of resources in the pool.
 * If the total number of used, free and about to be created resources falls
 * below the minimum set with the `pool.min`, it creates additional resources to
 * meet the minimum requirement.
 *
 * @param {number} resourceCheckInterval - The interval, in milliseconds, at
 * which the pool resources are checked.
 *
 * @returns {NodeJS.Timeout} - Returns a timer ID that can be used to clear the
 * interval later.
 */
function _checkingResourcesInterval(resourceCheckInterval) {
  // Set the interval for checking the number of pool resources
  return setInterval(async () => {
    try {
      // Get the current number of resources
      let currentNumber =
        pool.numUsed() + pool.numFree() + pool.numPendingCreates();

      // Create missing resources
      while (currentNumber++ < pool.min) {
        try {
          // Explicitly creating a resource
          await pool._doCreate();
        } catch (error) {
          logWithStack(2, error, '[pool] Could not create a missing resource.');
        }
      }
    } catch (error) {
      logWithStack(
        1,
        error,
        `[pool] Something went wrong when trying to create missing resources.`
      );
    }
  }, resourceCheckInterval);
}

export default {
  initPool,
  killPool,
  postWork,
  getPool,
  getPoolStats,
  getPoolInfo,
  getPoolInfoJSON
};
