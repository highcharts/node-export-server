/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

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
  'Highcharts Export Server Node Test Runner'.yellow.bold.underline,
  '\nThis tool simulates NodeJS module execution by using selected'.green,
  'functions (initExport and startExport) of Highcharts Export Server.'.green,
  '\nLoads all JSON files from the ./tests/node folder and runs them'.green,
  '(results are stored in the ./test/node/_results).\n'.green
);

(async () => {
  try {
    // Results and scenarios paths
    const resultsPath = join(__dirname, 'tests', 'node', '_results');
    const scenariosPath = join(__dirname, 'tests', 'node', 'scenarios');

    // Create results folder for HTTP exports if doesn't exist
    !existsSync(resultsPath) && mkdirSync(resultsPath);

    // Get files names
    const files = readdirSync(scenariosPath);

    // Set options
    const options = exporter.setOptions();

    try {
      // Initialize pool with disabled logging
      await exporter.initExport(options);
    } catch (error) {
      await exporter.killPool();
      throw error;
    }

    // Disable logs for the rest of the code
    exporter.setLogLevel(0);

    let testCounter = 0;
    let failsCounter = 0;

    // Await all exports
    Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(
          (file) =>
            new Promise((resolve) => {
              console.log('[Test runner]'.blue, `Processing test ${file}.`);

              // Options from a file
              const fileOptions = JSON.parse(
                readFileSync(join(scenariosPath, file))
              );

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
              exporter
                .startExport(fileOptions, (error, info) => {
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
                    `[Success] Node module from file: ${file}, took: ${
                      new Date().getTime() - startTime
                    }ms.`.green
                  );
                })
                .catch((error) => {
                  // Information about the error and the time it took
                  console.log(
                    `[Fail] Node module from file: ${file}, took: ${
                      new Date().getTime() - startTime
                    }ms.`.red
                  );
                  exporter.setLogLevel(1);
                  exporter.logWithStack(1, error);
                  exporter.setLogLevel(0);
                  failsCounter++;
                })
                .finally(() => {
                  testCounter++;
                  resolve();
                });
            })
        )
    ).then(async () => {
      // Summarize the run and kill the pool
      console.log(
        '\n--------------------------------',
        failsCounter
          ? `\n${testCounter} tests done, ${failsCounter} error(s) found!`.red
          : `\n${testCounter} tests done, errors not found!`.green,
        '\n--------------------------------'
      );
      await exporter.killPool();
    });
  } catch (error) {
    console.error(error);
  }
})();
