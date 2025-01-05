#!/usr/bin/env node
/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module serves as the entry point for the Highcharts Export
 * Server. It provides functionality for starting the server, performing batch
 * or single chart exports, and managing configuration options. It supports both
 * CLI and server-based usage, allowing flexible integration for generating
 * Highcharts exports in various environments.
 */

import { singleExport, batchExport } from '../lib/chart.js';
import {
  printLicense,
  printUsage,
  printVersion,
  setOptions
} from '../lib/config.js';
import { initExport } from '../lib/index.js';
import { log, logWithStack } from '../lib/logger.js';
import { manualConfig } from '../lib/prompt.js';
import { shutdownCleanUp } from '../lib/resourceRelease.js';
import { startServer } from '../lib/server/server.js';

import ExportError from '../lib/errors/ExportError.js';

/**
 * The primary function to initiate the server or perform the direct export.
 * Logs an error if it occurs during the execution and gracefully shuts down
 * the process.
 *
 * @async
 * @function start
 *
 * @returns {Promise<void>} A Promise that resolves to ending the function
 * execution when displaying license, version, or usage information, or when
 * triggering manual configuration using the prompts functionality.
 *
 * @throws {ExportError} Throws an `ExportError` if no valid options
 * are provided.
 */
async function start() {
  try {
    // Get the CLI arguments
    const args = process.argv;

    // Display version and license information if requested
    if (['-v', '--v'].some((a) => args.includes(a))) {
      // Print logo with version and license information
      printLicense();
      return;
    }

    // Display help information if requested
    if (['-h', '--h', '-help', '--help'].some((a) => args.includes(a))) {
      // Print CLI usage information
      printUsage();
      return;
    }

    // Print CLI usage information if no arguments are supplied
    if (args.length <= 2) {
      printVersion();
      log(
        2,
        '[cli] The number of provided arguments is too small. Please refer to the help section (use --h or --help command).'
      );
      return;
    }

    // Set the options, keeping the priority order of setting values
    const options = setOptions({}, args, true);

    // If all options are correctly parsed
    if (options) {
      // Print initial logo or text with the version
      printVersion(options.other.noLogo);

      // In this case we want to prepare config manually
      if (options.customLogic.createConfig) {
        manualConfig(options.customLogic.createConfig);
        return;
      }

      // Start server
      if (options.server.enable) {
        // Init the export mechanism for the server configuration
        await initExport(options);

        // Run the server
        await startServer(options.server);
      } else {
        // Perform batch exports
        if (options.export.batch) {
          // Init the export mechanism for batch exports
          await initExport(options);

          // Start batch exports
          await batchExport(options);
        } else {
          // No need for multiple workers in case of a single CLI export
          options.pool.minWorkers = 1;
          options.pool.maxWorkers = 1;

          // Init the export mechanism for a single export
          await initExport(options);

          // Start a single export
          await singleExport(options);
        }
      }
    } else {
      throw new ExportError(
        '[cli] No valid options provided. Please check your input and try again.',
        400
      );
    }
  } catch (error) {
    // Log the error with stack
    logWithStack(1, error);

    // Gracefully shut down the process
    await shutdownCleanUp(1);
  }
}

// Start the export server process
start();
