#!/usr/bin/env node
/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import main from '../lib/index.js';

import ExportError from '../lib/errors/ExportError.js';

/**
 * The primary function to initiate the server or perform the direct export.
 *
 * @throws {ExportError} Throws an ExportError if no valid options are provided.
 * @throws {Error} Throws an Error if an unexpected error occurs during
 * execution.
 */
const start = async () => {
  try {
    // Get the CLI arguments
    const args = process.argv;

    // Print the usage information if no arguments supplied
    if (args.length <= 2) {
      main.log(
        2,
        '[cli] The number of provided arguments is too small. Please refer to the section below.'
      );
      return main.printUsage();
    }

    // Set the options, keeping the priority order of setting values:
    // 1. Options from the lib/schemas/config.js file
    // 2. Options from a custom JSON file (loaded by the --loadConfig argument)
    // 3. Options from the environment variables (the .env file)
    // 4. Options from the CLI
    const options = main.setOptions(null, args);

    // If all options correctly parsed
    if (options) {
      // Print initial logo or text
      main.printLogo(options.other.noLogo);

      // In this case we want to prepare config manually
      if (options.customLogic.createConfig) {
        return main.manualConfig(options.customLogic.createConfig);
      }

      // Start server
      if (options.server.enable) {
        // Init the export mechanism for the server configuration
        await main.initExport(options);

        // Run the server
        await main.startServer(options.server);
      } else {
        // Perform batch exports
        if (options.export.batch) {
          // If not set explicitly, use default option for batch exports
          if (!args.includes('--minWorkers', '--maxWorkers')) {
            options.pool = {
              ...options.pool,
              minWorkers: 2,
              maxWorkers: 25
            };
          }

          // Init a pool for the batch exports
          await main.initExport(options);

          // Start batch exports
          await main.batchExport(options);
        } else {
          // No need for multiple workers in case of a single CLI export
          options.pool = {
            ...options.pool,
            minWorkers: 1,
            maxWorkers: 1
          };

          // Init a pool for one export
          await main.initExport(options);

          // Start a single export
          await main.singleExport(options);
        }
      }
    } else {
      throw new ExportError(
        '[cli] No valid options provided. Please check your input and try again.'
      );
    }
  } catch (error) {
    // Log the error with stack
    main.logWithStack(1, error);

    // Gracefully shut down the process
    await main.shutdownCleanUp(1);
  }
};

start();
