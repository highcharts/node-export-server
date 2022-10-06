/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

require('colors');

const spawn = require('child_process').exec;
const { existsSync, mkdirSync, readdirSync, readFileSync } = require('fs');
const { join } = require('path');

console.log(
  'Highcharts Export Server CLI Test Runner'.yellow,
  '\nThis tool simulates the CLI commands to Highcharts Export Server.',
  '\nLoads all JSON files from the ./test/cli folder and runs them',
  '(results are stored in the ./test/cli/results).\n'
);

const cliResultsPath = join(__dirname, '_results');

// Create results folder for CLI exports if doesn't exist
!existsSync(cliResultsPath) && mkdirSync(cliResultsPath);

// Get files names
const files = readdirSync(__dirname);

// Tests counters
let testCounter = 0;
let failsCouter = 0;

Promise.all(
  files
    .filter((file) => file.endsWith('.json'))
    .map(
      (file) =>
        new Promise((resolve) => {
          try {
            console.log('[Test runner]'.blue, `Processing test ${file}.`);

            // Read a CLI file
            const cliJson = JSON.parse(readFileSync(join(__dirname, file)));

            // No need for that when doing export through the --batch option
            if (!cliJson.batch) {
              // If needed, prepare default outfile
              cliJson.outfile = join(
                cliResultsPath,
                cliJson.outfile ||
                  file.replace('.json', `.${cliJson.type || 'png'}`)
              );
            }

            // Start time
            const startDate = new Date().getTime();

            // Complete the CLI command
            let cliCommand = [];

            // Check if run in debug mode
            cliCommand.push('node', './bin/cli.js');

            // Cycle through commands with value
            for (const [argument, value] of Object.entries(cliJson)) {
              cliCommand.push(`--${argument}`, JSON.stringify(value));
            }

            // Complete the CLI command
            cliCommand = cliCommand.join(' ');

            // Launch command in a new process
            process = spawn(cliCommand);

            // Close event for a proccess
            process.on('exit', (code) => {
              testCounter++;

              // If code is 1, it means that export server thrown an error
              if (code) {
                failsCouter++;
              }

              const endMessage = `CLI command from file: ${file}, took ${
                new Date().getTime() - startDate
              }ms.`;

              console.log(
                code
                  ? `[Fail] ${endMessage}`.red
                  : `[Success] ${endMessage}`.green
              );

              resolve();
            });
          } catch (error) {
            throw error;
          }
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
});
