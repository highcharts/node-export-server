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
  clearPage,
  getGeneration as getBrowserGeneration
} from './browser.js';
import puppeteerExport from './export.js';
import { log, logWithStack } from './logger.js';
import { measureTime } from './utils.js';

import ExportError from './errors/ExportError.js';
import { errorCodes } from './errors/codes.js';

// The pool instance
let pool = false;

// Pool statistics
export const stats = {
  performedExports: 0,
  exportAttempts: 0,
  exportFromSvgAttempts: 0,
  timeSpent: 0,
  droppedExports: 0,
  spentAverage: 0,
  rejectedForCapacity: 0
};

let poolConfig = {};

// The resolved maximum number of exports allowed to wait for a worker
let queueLimit = 0;

/**
 * Resolves the queue limit from the pool configuration.
 *
 * A limit of 0 means derive it from the pool size. Four times maxWorkers keeps
 * the worst case wait at roughly four exports' worth of time, which is a
 * meaningful bound, while leaving enough slack to absorb normal bursts.
 *
 * @param {Object} config - The pool section of the configuration.
 *
 * @returns {number} The resolved queue limit.
 */
const resolveQueueLimit = (config) => {
  const configured = parseInt(config.queueLimit);
  const maxWorkers = parseInt(config.maxWorkers);

  if (!isNaN(configured) && configured > 0) {
    return configured;
  }

  return (isNaN(maxWorkers) ? 8 : maxWorkers) * 4;
};

/**
 * Returns the number of exports currently allowed to wait for a worker.
 *
 * @returns {number} The active queue limit.
 */
export const getQueueLimit = () => queueLimit;

/**
 * Returns how long to wait before answering a request refused because the queue
 * was full.
 *
 * @returns {number} The delay in milliseconds.
 */
export const getQueueRejectDelay = () => {
  const delay = parseInt(poolConfig.queueRejectDelay);
  return isNaN(delay) || delay < 0 ? 0 : delay;
};

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
      // Which browser this page belongs to, so that it can be recognised as
      // stale if that browser goes away - see factory.validate
      generation: getBrowserGeneration(),
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
    // NOTE: In certain cases acquiring throws a TargetCloseError, which may
    //       be caused by two things:
    //         - The page is closed and attempted to be reused.
    //         - Lost contact with the browser
    //       What we're seeing in logs is that successive exports typically
    //       succeeds, and the server recovers, indicating that it's likely
    //       the first case. This is an attempt at allievating the issue by
    //       simply not validating the worker if the page is null or closed.
    //
    //       The actual result from when this happened, was that a worker would
    //       be completely locked, stopping it from being acquired until
    //       its work count reached the limit.
    if (!workerHandle.page || workerHandle.page?.isClosed()) {
      return false;
    }

    // NOTE: A page whose browser has gone away still reports
    //       isClosed() === false, so the check above cannot detect it and the
    //       pool would keep handing out pages belonging to a dead process,
    //       failing every export while continuing to report healthy workers.
    //
    //       The generation is the reliable signal: it advances whenever the
    //       browser is lost, so any worker created against an earlier one is
    //       stale. Returning false here makes tarn destroy the worker and
    //       create a replacement, which relaunches the browser via newPage.
    if (workerHandle.generation !== getBrowserGeneration()) {
      log(
        3,
        `[pool] Worker failed validation: it belongs to a browser that is gone (worker generation ${workerHandle.generation}, current ${getBrowserGeneration()}).`
      );
      return false;
    }

    // NOTE: Wait for the page clearing started when this worker was released
    //       to complete before handing it out again.
    //
    //       Tarn's release() is synchronous: it invokes the 'release' event
    //       handlers and then returns the resource to the free list within the
    //       same tick, without awaiting anything. Clearing the page in that
    //       handler therefore overlaps the next export whenever an acquire is
    //       already waiting, which is exactly the case under saturation.
    //
    //       In practice the visible damage is currently limited, because
    //       export.js already calls clearPageResources at the end of every
    //       export, which destroys the old charts and removes the injected
    //       tags. The innerHTML reset done here is a second pass. But that
    //       makes correctness depend on the ordering of two independent cleanup
    //       paths, and an innerHTML reset landing part way through the next
    //       render would wipe its container.
    //
    //       Tarn does await validate, so this is the point where the clearing
    //       is guaranteed to have finished. Doing it here rather than in the
    //       handler keeps the work overlapped with the worker's idle time, and
    //       lets a page that could not be cleared recycle the worker instead of
    //       being exported onto.
    if (workerHandle.cleanPromise) {
      const cleared = await workerHandle.cleanPromise;
      workerHandle.cleanPromise = null;

      if (!cleared) {
        log(
          3,
          `[pool] Worker failed validation: the page could not be cleared after its previous export.`
        );
        return false;
      }
    }

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

    if (workerHandle.page && !workerHandle.page.isClosed()) {
      await workerHandle.page.close();
    }
  }

  // log: (message, level) => log(1, '[tarn] ' +  message)
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

  // Work out how deep the queue of waiting exports is allowed to get
  queueLimit = resolveQueueLimit(poolConfig);

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
    pool.on('release', (resource) => {
      // Start clearing the page, but deliberately do not await it here - see
      // the note in factory.validate, which is where the result is awaited
      // before the worker can be handed out again. The catch is belt and braces:
      // clearPage resolves false rather than rejecting, and nothing must be
      // able to turn this into an unhandled rejection.
      resource.cleanPromise = clearPage(resource.page, false).catch(
        () => false
      );

      log(4, `[pool] Releasing a worker with ID ${resource.id}.`);
    });

    pool.on('destroySuccess', (eventId, resource) => {
      log(4, `[pool] Destroyed a worker with ID ${resource.id}.`);
      resource.page = null;
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

    // NOTE: Refuse the work rather than queue it when the queue is already at
    //       its limit.
    //
    //       Throughput does not improve past the pool size - measured, it peaks
    //       at roughly the number of workers and then falls - so an unbounded
    //       queue cannot buy capacity. What it does buy is latency and memory:
    //       every waiting request holds its parsed body until it is served or
    //       times out, and a saturated server was observed accepting more than
    //       twenty times the work it could complete, queueing thousands of
    //       requests and then failing most of them on timeout.
    //
    //       Failing here is cheap and immediate, and carries a distinct error
    //       code so that a caller and a dashboard can tell this apart from a
    //       malformed request.
    if (pool.numPendingAcquires() >= queueLimit) {
      ++stats.rejectedForCapacity;

      throw new ExportError(
        (options.payload?.requestId
          ? `For request with ID ${options.payload?.requestId} - `
          : '') +
          `The server is at capacity: ${pool.numPendingAcquires()} exports are already waiting for a worker (limit is ${queueLimit}). Please retry shortly.`
      ).setCode(errorCodes.QUEUE_FULL);
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
      )
        .setCode(errorCodes.ACQUIRE_TIMEOUT)
        .setError(error);
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
      // NOTE: If there's a rasterization timeout, we want need to flush the page.
      //       This is because the page may be in a state where it's waiting for
      //       the screenshot to finish even though the timeout has occured.
      //       Which of course causes a lot of issues with the event system,
      //       and page consistency.
      //
      // NOTE: Only page.screenshot will throw this, timeouts for PDF's are
      //       handled by the page.pdf function itself.
      //
      //       ...yes, this is ugly.
      if (result.message === 'Rasterization timeout') {
        workerHandle.workCount = poolConfig.workLimit + 1;
        workerHandle.page = null;
      }

      if (
        result.name === 'TimeoutError' ||
        result.message === 'Rasterization timeout'
      ) {
        throw new ExportError(
          'Rasterization timeout: your chart may be too complex or large, and failed to render within the allotted time.'
        )
          .setCode(errorCodes.RASTERIZATION_TIMEOUT)
          .setError(result);
      } else {
        throw new ExportError(
          (options.payload?.requestId
            ? `For request with ID ${options.payload?.requestId} - `
            : '') + `Error encountered during export: ${exportCounter()}ms.`
        )
          .setCode(errorCodes.EXPORT_FAILED)
          .setError(result);
      }
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
  pending: pool.numPendingAcquires(),
  queueLimit
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
