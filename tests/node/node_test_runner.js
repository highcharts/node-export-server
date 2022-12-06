/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

require('colors');

const {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} = require('fs');
const { join } = require('path');

const exporter = require('../../lib/index.js');
const { mergeConfigOptions } = require('../../lib/utils.js');
const { initDefaultOptions } = require('../../lib/config');
const { defaultConfig } = require('../../lib/schemas/config.js');

console.log(
  'Highcharts Export Server Node Test Runner'.yellow,
  '\nThis tool simulates node module execution by using selected'.green,
  'functions (initPool and startExport) of Highcharts Export Server.'.green,
  '\nLoads all JSON files from the ./tests/node folder and runs them'.green,
  '(results are stored in the ./test/node/_results).\n'.green
);

// Results and scenarios paths
const resultsPath = join(__dirname, '_results');
const scenariosPath = join(__dirname, 'scenarios');

// Create results folder for HTTP exports if doesn't exist
!existsSync(resultsPath) && mkdirSync(resultsPath);

// Get files names
const files = readdirSync(scenariosPath);

(async () => {
  // Get the default options
  const defaultOptions = initDefaultOptions(defaultConfig);

  // Disable export server logging
  defaultOptions.logging.level = 0;
  defaultOptions.pool.queueSize = files.length;

  // Init pool with the default options
  await exporter.initPool(defaultOptions);

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

          let options;
          if (fileOptions.svg) {
            options = initDefaultOptions(defaultConfig);
            options.export.type = fileOptions.type || options.export.type;
            options.export.scale = fileOptions.scale || options.export.scale;
            options.payload = {
              svg: fileOptions.svg
            };
          } else {
            // Get the content of a file and merge it into the default options
            options = mergeConfigOptions(
              initDefaultOptions(defaultConfig),
              fileOptions,
              ['options', 'resources', 'globalOptions', 'themeOptions']
            );
          }

          // Prepare an outfile path
          options.export.outfile = join(
            resultsPath,
            options.export?.outfile ||
              file.replace('.json', `.${options.export?.type || '.png'}`)
          );

          // The start date of a startExport function run
          const startTime = new Date().getTime();

          // Start the export process
          exporter.startExport(options, (info, error) => {
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
    exporter.killPool();
  });
})();
