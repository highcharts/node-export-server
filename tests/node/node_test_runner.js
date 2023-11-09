/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'fs';
import { basename, join } from 'path';

import 'colors';

import exporter from '../../lib/index.js';
import { __dirname } from '../../lib/utils.js';

console.log(
  'Highcharts Export Server Node Test Runner'.yellow,
  '\nThis tool simulates node module execution by using selected'.green,
  'functions (initPool and startExport) of Highcharts Export Server.'.green,
  '\nLoads all JSON files from the ./tests/node folder and runs them'.green,
  '(results are stored in the ./test/node/_results).\n'.green
);

// Results and scenarios paths
const resultsPath = join(__dirname, 'tests', 'node', '_results');
const scenariosPath = join(__dirname, 'tests', 'node', 'scenarios');

// Create results folder for HTTP exports if doesn't exist
!existsSync(resultsPath) && mkdirSync(resultsPath);

// Get files names
const files = readdirSync(scenariosPath);

// Create a promise for the export
const exportChart = (file) => {
  const promise = new Promise((resolve, reject) => {
    try {
      console.log('[Test runner]'.blue, `Processing test ${file}.`);

      // Options from a file
      const fileOptions = JSON.parse(readFileSync(join(scenariosPath, file)));

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
        // Set the end time
        const endTime = new Date().getTime();

        // Create a message
        let message = `Done with ${file}, time: ${endTime - startTime}ms`;

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
          console.log(`[Fail] ${message}, error: ${error}`.red);
          return reject();
        }

        console.log(`[Success] ${message}.`.green);
        return resolve();
      });
    } catch (error) {
      reject(`Error thrown: ${error}`);
    }
  });

  return promise;
};

(async () => {
  // Set options
  const options = exporter.setOptions({
    logging: {
      level: 0
    }
  });

  // Initialize pool with disabled logging
  await exporter.initPool(options);

  let testCounter = 0;
  let failsCouter = 0;

  try {
    // Await all exports
    await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          try {
            // Start the export
            await exportChart(file);
          } catch (error) {
            console.log(
              `[ERROR] Error while exporting chart from the ${file}, ${error}`
                .red
            );
            failsCouter++;
          }
          testCounter++;
        })
    );
  } catch (error) {
    console.log(`Something went wrong!, ${error}`);
    process.exit(1);
  }

  // Summarize the run and kill the pool
  console.log(
    '\n--------------------------------',
    failsCouter
      ? `\n${testCounter} tests done, ${failsCouter} error(s) found!`.red
      : `\n${testCounter} tests done, errors not found!`.green,
    '\n--------------------------------'
  );
  await exporter.killPool();
})();
