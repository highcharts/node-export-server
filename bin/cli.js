#!/usr/bin/env node
/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { singleExport, batchExport } from '../lib/chart.js';
import { setGeneralOptions } from '../lib/config.js';
import { initExport } from '../lib/index.js';
import { log, logWithStack } from '../lib/logger.js';
import { manualConfig } from '../lib/prompts.js';
import { shutdownCleanUp } from '../lib/resourceRelease.js';
import { printLogo, printVersion } from '../lib/utils.js';
import { printUsage } from '../lib/schemas/config.js';
import { startServer } from '../lib/server/server.js';

import ExportError from '../lib/errors/ExportError.js';

/**
 * The primary function to initiate the server or perform the direct export.
 *
 * @throws {ExportError} Throws an ExportError if no valid options are provided.
 * @throws {Error} Throws an Error if an unexpected error occurs during
 * execution.
 */
async function start() {
  try {
    // Get the CLI arguments
    const args = process.argv;

    // Display version information if requested
    if (
      ['-v', '--v', '-version', '--version'].includes(args[args.length - 1])
    ) {
      // Print logo with the version information
      return printVersion();
    }

    // Display help information if requested
    if (['-h', '--h', '-help', '--help'].includes(args[args.length - 1])) {
      // Print logo with the version information
      return printUsage();
    }

    // Print logo with a version and usage information if no arguments supplied
    if (args.length <= 2) {
      printUsage();
      return log(
        2,
        '[cli] The number of provided arguments is too small. Please refer to the help section above.'
      );
    }

    // Set the options, keeping the priority order of setting values:
    // 1. Options from the lib/schemas/config.js file
    // 2. Options from a custom JSON file (loaded by the --loadConfig argument)
    // 3. Options from the environment variables (the .env file)
    // 4. Options from the CLI
    const options = setGeneralOptions(null, args);

    // If all options correctly parsed
    if (options) {
      // Print initial logo or text
      printLogo(options.other.noLogo);

      // In this case we want to prepare config manually
      if (options.customLogic.createConfig) {
        return manualConfig(options.customLogic.createConfig);
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
          // Init a pool for the batch exports
          await initExport(options);

          // Start batch exports
          await batchExport(options);
        } else {
          // No need for multiple workers in case of a single CLI export
          options.pool.minWorkers = 1;
          options.pool.maxWorkers = 1;

          // Init a pool for one export
          await initExport(options);

          // Start a single export
          await singleExport(options);
        }
      }
    } else {
      throw new ExportError(
        '[cli] No valid options provided. Please check your input and try again.'
      );
    }
  } catch (error) {
    // Log the error with stack
    logWithStack(1, error);

    // Gracefully shut down the process
    await shutdownCleanUp(1);
  }
}

start();
