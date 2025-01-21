/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module provides a worker pool implementation for managing
 * the browser instance and pages, specifically designed for use with
 * the Highcharts Export Server. It optimizes resources usage and performance
 * by maintaining a pool of workers that can handle concurrent export tasks
 * using Puppeteer.
 */

import { Pool } from 'tarn';
import { v4 as uuid } from 'uuid';

import { createBrowser, closeBrowser, newPage, clearPage } from './browser.js';
import { puppeteerExport } from './export.js';
import { log, logWithStack } from './logger.js';
import { getNewDateTime, measureTime } from './utils.js';

import ExportError from './errors/ExportError.js';

// The pool instance
let pool = null;

// Pool statistics
const poolStats = {
  exportsAttempted: 0,
  exportsPerformed: 0,
  exportsDropped: 0,
  exportsFromSvg: 0,
  exportsFromOptions: 0,
  exportsFromSvgAttempts: 0,
  exportsFromOptionsAttempts: 0,
  timeSpent: 0,
  timeSpentAverage: 0
};

/**
 * Initializes the export pool with the provided configuration, creating
 * a browser instance and setting up worker resources.
 *
 * @async
 * @function initPool
 *
 * @param {Object} poolOptions - The configuration object containing `pool`
 * options.
 * @param {Array.<string>} puppeteerArgs - Additional arguments for Puppeteer
 * launch.
 *
 * @returns {Promise<void>} A Promise that resolves to ending the function
 * execution when an already initialized pool of resources is found.
 *
 * @throws {ExportError} Throws an `ExportError` if could not create the pool
 * of workers.
 */
export async function initPool(poolOptions, puppeteerArgs) {
  // Create a browser instance with the puppeteer arguments
  await createBrowser(puppeteerArgs);

  try {
    log(
      3,
      `[pool] Initializing pool with workers: min ${poolOptions.minWorkers}, max ${poolOptions.maxWorkers}.`
    );

    if (pool) {
      log(
        4,
        '[pool] Already initialized, please kill it before creating a new one.'
      );
      return;
    }

    // Keep an eye on a correct min and max workers number
    if (poolOptions.minWorkers > poolOptions.maxWorkers) {
      poolOptions.minWorkers = poolOptions.maxWorkers;
    }

    // Create a pool along with a minimal number of resources
    pool = new Pool({
      // Get the `create`, `validate`, and `destroy` functions
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
      // Clear page
      const clearStatus = await clearPage(resource, false);
      log(
        4,
        `[pool] Pool resource [${resource.id}] - Releasing a worker. Clear page status: ${clearStatus}.`
      );
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

    log(
      3,
      `[pool] The pool is ready${initialResources.length ? ` with ${initialResources.length} initial resources waiting.` : '.'}`
    );
  } catch (error) {
    throw new ExportError(
      '[pool] Could not configure and create the pool of workers.',
      500
    ).setError(error);
  }
}

/**
 * Terminates all workers in the pool, destroys the pool, and closes the browser
 * instance.
 *
 * @async
 * @function killPool
 *
 * @returns {Promise<void>} A Promise that resolves once all workers are
 * terminated, the pool is destroyed, and the browser is successfully closed.
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
      log(4, '[pool] Destroyed the pool of resources.');
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
 * @async
 * @function postWork
 *
 * @param {Object} options - The configuration object containing complete set
 * of options.
 *
 * @returns {Promise<Object>} A Promise that resolves to the export result
 * and options.
 *
 * @throws {ExportError} Throws an `ExportError` if an error occurs during
 * the export process.
 */
export async function postWork(options) {
  let workerHandle;

  try {
    log(4, '[pool] Work received, starting to process.');

    // An export attempt counted
    ++poolStats.exportsAttempted;

    // Display the pool information if needed
    if (options.pool.benchmarking) {
      getPoolInfo();
    }

    // Throw an error in case of lacking the pool instance
    if (!pool) {
      throw new ExportError(
        '[pool] Work received, but pool has not been started.',
        500
      );
    }

    // The acquire counter
    const acquireCounter = measureTime();

    // Try to acquire the worker along with the id, works count and page
    try {
      log(4, '[pool] Acquiring a worker handle.');

      // Acquire a pool resource
      workerHandle = await pool.acquire().promise;

      // Check the page acquire time
      if (options.server.benchmarking) {
        log(
          5,
          `[benchmark] ${options.requestId ? `Request [${options.requestId}] - ` : ''}`,
          `Acquiring a worker handle took ${acquireCounter()}ms.`
        );
      }
    } catch (error) {
      throw new ExportError(
        `[pool] ${
          options.requestId ? `Request [${options.requestId}] - ` : ''
        }Error encountered when acquiring an available entry: ${acquireCounter()}ms.`,
        400
      ).setError(error);
    }
    log(4, '[pool] Acquired a worker handle.');

    if (!workerHandle.page) {
      // Set the `workLimit` to exceeded in order to recreate the resource
      workerHandle.workCount = options.pool.workLimit + 1;
      throw new ExportError(
        '[pool] Resolved worker page is invalid: the pool setup is wonky.',
        400
      );
    }

    // Save the start time
    const workStart = getNewDateTime();

    log(
      4,
      `[pool] Pool resource [${workerHandle.id}] - Starting work on this pool entry.`
    );

    // Start measuring export time
    const exportCounter = measureTime();

    // Perform an export on a puppeteer level
    const result = await puppeteerExport(
      workerHandle.page,
      options.export,
      options.customLogic
    );

    // Check if it's an error
    if (result instanceof Error) {
      // NOTE:
      // If there's a rasterization timeout, we want need to flush the page.
      // This is because the page may be in a state where it's waiting for
      // the screenshot to finish even though the timeout has occured.
      // Which of course causes a lot of issues with the event system,
      // and page consistency.
      //
      // NOTE:
      // Only page.screenshot will throw this, timeouts for PDF's are
      // handled by the page.pdf function itself.
      //
      // ...yes, this is ugly.
      if (result.message === 'Rasterization timeout') {
        // Set the `workLimit` to exceeded in order to recreate the resource
        workerHandle.workCount = options.pool.workLimit + 1;
        workerHandle.page = null;
      }

      if (
        result.name === 'TimeoutError' ||
        result.message === 'Rasterization timeout'
      ) {
        throw new ExportError(
          `[pool] ${
            options.requestId ? `Request [${options.requestId}] - ` : ''
          }Rasterization timeout: your chart may be too complex or large, and failed to render within the allotted time.`
        ).setError(result);
      } else {
        throw new ExportError(
          `[pool] ${
            options.requestId ? `Request [${options.requestId}] - ` : ''
          }Error encountered during export: ${exportCounter()}ms.`
        ).setError(result);
      }
    }

    // Check the Puppeteer export time
    if (options.server.benchmarking) {
      log(
        5,
        `[benchmark] ${options.requestId ? `Request [${options.requestId}] - ` : ''}`,
        `Exporting a chart sucessfully took ${exportCounter()}ms.`
      );
    }

    // Release the resource back to the pool
    pool.release(workerHandle);

    // Used for statistics in averageTime and processedWorkCount, which
    // in turn is used by the /health route.
    const workEnd = getNewDateTime();
    const exportTime = workEnd - workStart;

    poolStats.timeSpent += exportTime;
    poolStats.timeSpentAverage =
      poolStats.timeSpent / ++poolStats.exportsPerformed;

    log(4, `[pool] Work completed in ${exportTime}ms.`);

    // Otherwise return the result
    return {
      result,
      options
    };
  } catch (error) {
    ++poolStats.exportsDropped;

    if (workerHandle) {
      pool.release(workerHandle);
    }

    throw error;
  }
}

/**
 * Retrieves the current pool instance.
 *
 * @function getPool
 *
 * @returns {(Object|null)} The current pool instance if initialized, or null
 * if the pool has not been created.
 */
export function getPool() {
  return pool;
}

/**
 * Gets the statistic of a pool instace about exports.
 *
 * @function getPoolStats
 *
 * @returns {Object} The current pool statistics.
 */
export function getPoolStats() {
  return poolStats;
}

/**
 * Retrieves pool information in JSON format, including minimum and maximum
 * workers, available workers, workers in use, and pending acquire requests.
 *
 * @function getPoolInfoJSON
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
 *
 * @function getPoolInfo
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
 * Factory function that returns an object with `create`, `validate`,
 * and `destroy` functions for the pool instance.
 *
 * @function _factory
 *
 * @param {Object} poolOptions - The configuration object containing `pool`
 * options.
 */
function _factory(poolOptions) {
  return {
    /**
     * Creates a new worker page for the export pool.
     *
     * @async
     * @function create
     *
     * @returns {Promise<Object>} A Promise that resolves to an object
     * containing the worker ID, a reference to the browser page, and initial
     * work count.
     *
     * @throws {ExportError} Throws an `ExportError` if there is an error during
     * the creation of the new page.
     */
    create: async () => {
      // Init the resource with unique id and work count
      const poolResource = {
        id: uuid(),
        // Try to distribute the initial work count
        workCount: Math.round(Math.random() * (poolOptions.workLimit / 2))
      };

      try {
        // Start measuring a page creation time
        const startDate = getNewDateTime();

        // Create a new page
        await newPage(poolResource);

        // Measure the time of full creation and configuration of a page
        log(
          3,
          `[pool] Pool resource [${poolResource.id}] - Successfully created a worker, took ${
            getNewDateTime() - startDate
          }ms.`
        );

        // Return ready pool resource
        return poolResource;
      } catch (error) {
        log(
          3,
          `[pool] Pool resource [${poolResource.id}] - Error encountered when creating a new page.`
        );
        throw error;
      }
    },

    /**
     * Validates a worker page in the export pool, checking if it has exceeded
     * the work limit.
     *
     * @async
     * @function validate
     *
     * @param {Object} poolResource - The handle to the worker, containing
     * the worker's ID, a reference to the browser page, and work count.
     *
     * @returns {Promise<boolean>} A Promise that resolves to true if the worker
     * is valid and within the work limit; otherwise, to false.
     */
    validate: async (poolResource) => {
      // NOTE:
      // In certain cases acquiring throws a TargetCloseError, which may
      // be caused by two things:
      // - The page is closed and attempted to be reused.
      // - Lost contact with the browser.
      //
      // What we're seeing in logs is that successive exports typically
      // succeeds, and the server recovers, indicating that it's likely
      // the first case. This is an attempt at allievating the issue by
      // simply not validating the worker if the page is null or closed.
      //
      // The actual result from when this happened, was that a worker would
      // be completely locked, stopping it from being acquired until
      // its work count reached the limit.

      // Check if the `page` is valid
      if (!poolResource.page) {
        log(
          3,
          `[pool] Pool resource [${poolResource.id}] - Validation failed (no valid page is found).`
        );
        return false;
      }

      // Check if the `page` is closed
      if (poolResource.page.isClosed()) {
        log(
          3,
          `[pool] Pool resource [${poolResource.id}] - Validation failed (page is closed or invalid).`
        );
        return false;
      }

      // Check if the `mainFrame` is detached
      if (poolResource.page.mainFrame().detached) {
        log(
          3,
          `[pool] Pool resource [${poolResource.id}] - Validation failed (page's frame is detached).`
        );
        return false;
      }

      // Check if the `workLimit` is exceeded
      if (
        poolOptions.workLimit &&
        ++poolResource.workCount > poolOptions.workLimit
      ) {
        log(
          3,
          `[pool] Pool resource [${poolResource.id}] - Validation failed (exceeded the ${poolOptions.workLimit} works per resource limit).`
        );
        return false;
      }

      // The `poolResource` is validated
      return true;
    },

    /**
     * Destroys a worker entry in the export pool, closing its associated page.
     *
     * @async
     * @function destroy
     *
     * @param {Object} poolResource - The handle to the worker, containing
     * the worker's ID, a reference to the browser page, and work count.
     */
    destroy: async (poolResource) => {
      log(
        3,
        `[pool] Pool resource [${poolResource.id}] - Destroying a worker.`
      );

      if (poolResource.page && !poolResource.page.isClosed()) {
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
          throw error;
        }
      }
    }
  };
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
