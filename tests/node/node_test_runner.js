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
import { join } from 'path';

import 'colors';

import main from '../../lib/index.js';
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

(async () => {
  const options = {
    logging: {
      level: 0 // disable export server logging
    },
    pool: {
      queueSize: files.length
    }
  };

  // Init pool with the default options
  await main.initPool(options);

  let testCounter = 0;
  let failsCouter = 0;

  Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map((file) =>
        new Promise((resolve, reject) => {
          console.log('[Test runner]'.blue, `Processing test ${file}.`);

          // Options from a file
          const fileOptions = JSON.parse(
            readFileSync(join(scenariosPath, file))
          );

          // The start date of a startExport function run
          const startTime = new Date().getTime();

          // Start the export process
          main.startExport(fileOptions, (info, error) => {
            // Set the end time
            const endTime = new Date().getTime();

            // Create a message
            let message = `Done with ${file}, time: ${endTime - startTime}ms`;

            // Information about the results and the time it took
            console.log(
              error
                ? `[Fail] ${message}, error: ${error}`.red
                : `[Success] ${message}.`.green
            );

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

            return error ? reject() : resolve();
          });
        })
          .catch(() => {
            failsCouter++;
          })
          .finally(() => {
            testCounter++;
          })
      )
  ).then(() => {
    console.log(
      '\n--------------------------------',
      failsCouter
        ? `\n${testCounter} tests done, ${failsCouter} error(s) found!`.red
        : `\n${testCounter} tests done, errors not found!`.green,
      '\n--------------------------------'
    );
    main.killPool();
  });
})();
