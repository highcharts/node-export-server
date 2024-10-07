/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';

import exporter from '../../lib/index.js';
import { __dirname } from '../../lib/utils.js';
import { style } from '../../lib/logger.js';
import {
  showStartingTestMessage,
  showProcessingTestMessage
} from '../test_utils.js';

showStartingTestMessage();

// Create a promise for the export
(async () => {
  try {
    // Results and scenarios paths
    const resultsPath = join(__dirname, 'tests', 'node', '_results');

    // Create results folder for HTTP exports if doesn't exist
    !existsSync(resultsPath) && mkdirSync(resultsPath);

    // Get the file's name
    const file = process.argv[2];

    // Check if file even exists and if it is a JSON
    if (existsSync(file) && file.endsWith('.json')) {
      // Set options
      const options = exporter.setOptions({
        pool: {
          minWorkers: 1,
          maxWorkers: 1
        },
        logging: {
          level: 0
        }
      });

      // Initialize pool with disabled logging
      await exporter.initExport(options);

      // Start the export
      showProcessingTestMessage(file);

      // Options from a file
      const fileOptions = JSON.parse(readFileSync(file));

      // Prepare an outfile path
      fileOptions.export.outfile = join(
        resultsPath,
        fileOptions.export?.outfile ||
          basename(file).replace(
            '.json',
            `.${fileOptions.export?.type || 'png'}`
          )
      );

      // The start date of a startExport function run
      const startTime = new Date().getTime();

      try {
        // Start the export process
        await exporter.startExport(fileOptions, async (error, info) => {
          // Throw an error
          if (error) {
            throw error;
          }

          // Save returned data to a correct image file if no error occured
          writeFileSync(
            info.options.export.outfile,
            info.options?.export?.type !== 'svg'
              ? Buffer.from(info.result, 'base64')
              : info.result
          );

          // Information about the results and the time it took
          console.log(
            `${style.green}[Success] Node module from file: ${file}, took: ${
              new Date().getTime() - startTime
            }ms.${style.reset}`
          );
        });
      } catch (error) {
        // Information about the error and the time it took
        console.log(
          `${style.red}[Fail] Node module from file: ${file}, took: ${
            new Date().getTime() - startTime
          }ms.${style.reset}`
        );
      }

      // Kill the pool
      await exporter.killPool();
    } else {
      console.log(
        `${style.red}The test does not exist. Please give a full path starting from ./tests.${style.reset}`
      );
    }
  } catch (error) {
    console.error(error);
  }
})();
