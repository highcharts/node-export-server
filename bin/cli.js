#!/usr/bin/env node
/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import main from '../lib/index.js';

import { manualConfig } from '../lib/config.js';
import { printLogo, printUsage } from '../lib/utils.js';

/**
 * The main start function to start the server or do the direct export
 */
const start = async () => {
  // Get the CLI arguments
  const args = process.argv;

  // Print the usage information if no arguments supplied
  if (args.length <= 2) {
    return printUsage();
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
    printLogo(options.other.noLogo);

    // In this case we want to prepare config manually
    if (options.customCode.createConfig) {
      return manualConfig(options.customCode.createConfig);
    }

    // Start server
    if (options.server.enable) {
      // Init a pool for the server and send options
      await main.initPool(options);

      // Run the server
      await main.startServer(options.server);
    } else {
      // Perform batch exports
      if (options.export.batch) {
        // If not set explicitly, use default option for batch exports
        if (!args.includes('--minWorkers', '--maxWorkers')) {
          options.pool = {
            ...options.pool,
            minWorkers: 5,
            maxWorkers: 25
          };
        }

        // Init a pool for the batch exports
        await main.initPool(options);

        // Start batch exports
        main.batchExport(options);
      } else {
        // No need for multiple workers in case of a single CLI export
        options.pool = {
          ...options.pool,
          minWorkers: 1,
          maxWorkers: 1
        };

        // Init a pool for one export
        await main.initPool(options);

        // Start a single export
        main.singleExport(options);
      }
    }
  }
};

start();
