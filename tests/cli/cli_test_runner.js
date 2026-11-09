/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { exec } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync
} from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import 'colors';

import { __dirname } from '../../lib/utils.js';

// Convert from callback to promise
const spawn = promisify(exec);

// Test runner message
console.log(
  'Highcharts Export Server CLI Test Runner'.yellow.bold.underline,
  '\nThis tool simulates the CLI commands sent to Highcharts Export Server.'
    .green,
  '\nLoads all JSON files from the ./tests/cli folder and runs them sequentially.'
    .green,
  '\nThe results are stored in the ./tests/cli/_results.\n'.green
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
let failsCounter = 0;

for (const file of files.filter((file) => file.endsWith('.json'))) {
  // For a separate CLI command trigger
  await (async (file) => {
    try {
      console.log('[Test runner]'.blue, `Processing test ${file}.`);

      // Read a CLI file
      const cliJson = JSON.parse(readFileSync(join(scenariosPath, file)));

      // No need for that when doing export through the --batch option
      if (!cliJson.batch) {
        // If needed, prepare default outfile
        cliJson.outfile = join(
          resultsPath,
          cliJson.outfile || file.replace('.json', `.${cliJson.type || 'png'}`)
        );
      }

      // Remove stale output so a successful exit cannot hide a missing export.
      if (!cliJson.batch && existsSync(cliJson.outfile)) {
        unlinkSync(cliJson.outfile);
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

      let didFail = false;
      try {
        // Launch command as a new child process
        await spawn(cliCommand);
        if (
          !cliJson.batch &&
          (!existsSync(cliJson.outfile) || statSync(cliJson.outfile).size === 0)
        ) {
          throw new Error(`No output written to ${cliJson.outfile}`);
        }
      } catch (error) {
        failsCounter++;
        didFail = true;
        console.error(error.stderr || error.stdout || error.message);
      }
      testCounter++;

      const endMessage = `CLI command from file: ${file}, took ${
        new Date().getTime() - startDate
      }ms.`;

      console.log(
        didFail ? `[Fail] ${endMessage}`.red : `[Success] ${endMessage}`.green,
        '\n'
      );
    } catch (error) {
      testCounter++;
      failsCounter++;
      console.error(error);
    }
  })(file);
}

// Display the results in numbers
console.log(
  '--------------------------------',
  failsCounter
    ? `\n${testCounter} tests done, ${failsCounter} error(s) found!`.red
    : `\n${testCounter} tests done, errors not found!`.green,
  '\n--------------------------------'
);

if (failsCounter) {
  process.exitCode = 1;
}
