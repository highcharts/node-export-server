/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { exec as spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import 'colors';

import { __dirname } from '../../lib/utils.js';

// Test runner message
console.log(
  'Highcharts Export Server CLI Test Runner'.yellow,
  '\nThis tool simulates the CLI commands to Highcharts Export Server.'.green,
  '\nLoads all JSON files from the ./tests/cli folder and runs them'.green,
  '(results are stored in the ./tests/cli/_results).\n'.green
);

// Results and scenarios paths
const resultsPath = join(__dirname, 'tests', 'cli', '_results');
const scenariosPath = join(__dirname, 'tests', 'cli', 'scenarios');

// Create results folder for CLI exports if doesn't exist
!existsSync(resultsPath) && mkdirSync(resultsPath);

// Get files names
const files = readdirSync(scenariosPath);

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
            const cliJson = JSON.parse(readFileSync(join(scenariosPath, file)));

            // No need for that when doing export through the --batch option
            if (!cliJson.batch) {
              // If needed, prepare default outfile
              cliJson.outfile = join(
                resultsPath,
                cliJson.outfile ||
                  file.replace('.json', `.${cliJson.type || 'png'}`)
              );
            }

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

            // The start date of a CLI command
            const startDate = new Date().getTime();

            // Launch command in a new process
            // eslint-disable-next-line no-global-assign
            process = spawn(cliCommand);

            // Close event for a process
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
            console.log(`Error thrown: ${error}`);
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
