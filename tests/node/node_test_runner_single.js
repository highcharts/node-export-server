/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';

import 'colors';

import exporter from '../../lib/index.js';
import { log } from '../../lib/logger.js';
import { __dirname } from '../../lib/utils.js';

console.log(
  'Highcharts Export Server Node Test Runner'.yellow,
  '\nThis tool simulates node module execution by using selected'.green,
  'functions (initPool and startExport) of Highcharts Export Server.'.green,
  '\nLoads a specified JSON file and runs it'.green,
  '(results are stored in the ./test/node/_results).\n'.green
);

// Results and scenarios paths
const resultsPath = join(__dirname, 'tests', 'node', '_results');

// Create results folder for HTTP exports if doesn't exist
!existsSync(resultsPath) && mkdirSync(resultsPath);

// Get the file's name
const file = process.argv[2];

// Create a promise for the export
const exportChart = () => {
  const promise = new Promise((resolve, reject) => {
    try {
      console.log('[Test runner]'.blue, `Processing test ${file}.`);

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

      // Start the export process
      exporter.startExport(fileOptions, (info, error) => {
        // Create a message
        let endMessage = `Node module from file: ${file}, took: ${
          new Date().getTime() - startTime
        }ms`;

        // Try to save to a file
        if (!error) {
          // Save returned data to a correct image file if no error occured
          writeFileSync(
            info.options.export.outfile,
            info.options?.export?.type !== 'svg'
              ? Buffer.from(info.data, 'base64')
              : info.data
          );
        } else {
          // Information about the error and the time it took
          console.log(
            `[Fail] ${endMessage}, error: ${JSON.stringify(error)}`.red
          );
          return reject();
        }

        // Information about the results and the time it took
        console.log(`[Success] ${endMessage}.`.green);
        return resolve();
      });
    } catch (error) {
      return reject(`Error thrown: ${error}`);
    }
  });

  return promise;
};

(async () => {
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
  await exporter.initPool(options);

  // Check if file even exists and if it is a JSON
  if (existsSync(file) && file.endsWith('.json')) {
    try {
      // Start the export
      await exportChart();
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  } else {
    log(
      1,
      'The test does not exist. Please give a full path starting from ./tests'
    );
    await exporter.killPool();
  }
})();
