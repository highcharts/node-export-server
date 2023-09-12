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

import { initDefaultOptions } from '../../lib/config.js';
import main from '../../lib/index.js';
import { __dirname, mergeConfigOptions } from '../../lib/utils.js';
import { defaultConfig } from '../../lib/schemas/config.js';
import { log } from '../../lib/logger.js';

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

(async () => {

  // Init pool without logging
  await main.initPool({
    logging: {
        level: 4
    }
  });

  // Check if file even exists and if it is a JSON
  if (existsSync(file) && file.endsWith('.json')) {
    new Promise((resolve, reject) => {
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
              `.${fileOptions.export?.type || '.png'}`
            )
        );

        // The start date of a startExport function run
        const startTime = new Date().getTime();

        // Start the export process
        main.startExport(fileOptions, (info, error) => {
          // Create a message
          let endMessage = `Node module from file: ${file}, took: ${
            new Date().getTime() - startTime
          }ms`;

          const failMessage = `[Fail] ${endMessage}, error: ${JSON.stringify(error)}`.red;
          const successMessage = `[Success] ${endMessage}.`.green;

          // Try to save to a file
          if (!error) {
            // Save returned data to a correct image file if no error occured
            writeFileSync(
              info.options.export.outfile,
              info.options?.export?.type !== 'svg'
                ? Buffer.from(info.data, 'base64')
                : info.data
            );
          }

          // Information about the results and the time it took
          return error ? reject(failMessage) : resolve(successMessage);
        });
      } catch (error) {
        reject(`Error thrown: ${error}`);
      }
    })
      .then((message) => {
        console.log(message);
        process.exit(0);
      })
      .catch((message) => {
        console.log(message);
        process.exit(1);
      });
  } else {
    log(1, 'The test does not exist. Please give a full path starting from ./tests');
    main.killPool();
  }
})();
