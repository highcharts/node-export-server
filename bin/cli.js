/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { writeFileSync } from 'fs';

import main from '../lib/index.js';
import { initDefaultOptions, manualConfiguration } from '../lib/config.js';
import { printLogo, printUsage, pairArgumentValue } from '../lib/utils.js';
import { defaultConfig } from '../lib/schemas/config.js';

/**
 * The main start function to start the server or do the direct export
 */
const start = async () => {
  const args = process.argv;

  // Set default values for server's options and returns them
  let options = initDefaultOptions(defaultConfig);

  // Print initial logo or text
  printLogo(options.other.noLogo);

  // Print the usage information if no arguments supplied
  if (args.length <= 2) {
    return printUsage(defaultConfig);
  }

  // Parse provided arguments
  options = await pairArgumentValue(options, args, defaultConfig);

  // If all options correctly parsed
  if (options) {
    // In this case we want to prepare config manually
    if (options.customCode.createConfig) {
      return manualConfiguration(options.customCode.createConfig);
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
        const batchFunctions = [];

        // If not set explicitly, use default option for batch exports
        if (!args.includes('--initialWorkers', '--maxWorkers')) {
          options.pool = {
            ...options.pool,
            initialWorkers: 5,
            maxWorkers: 25,
            reaper: false
          };
        }

        // Init a pool for the batch exports
        await main.initPool(options);

        // Split and pair the --batch arguments
        for (let pair of options.export.batch.split(';')) {
          pair = pair.split('=');
          if (pair.length === 2) {
            batchFunctions.push(
              new Promise((resolve) => {
                main.startExport(
                  {
                    ...options,
                    export: {
                      ...options.export,
                      infile: pair[0],
                      outfile: pair[1]
                    }
                  },
                  (info, error) => {
                    // Throw an error
                    if (error) {
                      throw error;
                    }

                    // Save the base64 from a buffer to a correct image file
                    writeFileSync(
                      info.options.export.outfile,
                      Buffer.from(info.data, 'base64')
                    );

                    resolve();
                  }
                );
              })
            );
          }
        }

        // Kill the pool after all exports are done
        Promise.all(batchFunctions).then(() => {
          main.killPool();
        });
      } else {
        // No need for multiple workers in case of a single CLI export
        options.pool = {
          ...options.pool,
          initialWorkers: 1,
          maxWorkers: 1,
          reaper: false
        };

        // Init a pool for one export
        await main.initPool(options);

        // Use instr or its alias, options
        options.export.instr = options.export.instr || options.export.options;

        // Perform an export
        main.startExport(options, (info, error) => {
          // Exit process when error
          if (error) {
            main.log(1, `[cli] ${error.message}`);
            process.exit(1);
          }

          const { outfile, type } = info.options.export;

          // Save the base64 from a buffer to a correct image file
          writeFileSync(
            outfile || `chart.${type}`,
            type !== 'svg' ? Buffer.from(info.data, 'base64') : info.data
          );

          // Kill the pool
          main.killPool();
        });
      }
    }
  }
};

start();
