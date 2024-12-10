/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { exec as spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { basename, join } from 'path';

import 'colors';

import { __dirname, getNewDateTime } from '../../lib/utils.js';

// Test runner message
console.log(
  'Highcharts Export Server CLI Test Runner'.yellow.bold.underline,
  '\nThis tool simulates the CLI commands to Highcharts Export Server.'.green,
  '\nLoads a specified JSON file and runs it'.green,
  '(results are stored in the ./tests/cli/_results).\n'.green
);

// Results and scenarios paths
const resultsPath = join(__dirname, 'tests', 'cli', '_results');

// Create results folder for CLI exports if doesn't exist
!existsSync(resultsPath) && mkdirSync(resultsPath);

// Get the file's name
const file = process.argv[2];

// Check if file even exists and if it is a JSON
if (existsSync(file) && file.endsWith('.json')) {
  try {
    console.log('[Test runner]'.blue, `Processing test ${file}.`);

    // Read a CLI file
    const cliJson = JSON.parse(readFileSync(file));

    // No need for that when doing export through the --batch option
    if (!cliJson.batch) {
      // If needed, prepare default outfile
      cliJson.outfile = join(
        resultsPath,
        cliJson.outfile ||
          basename(file).replace('.json', `.${cliJson.type || 'png'}`)
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
    const startDate = getNewDateTime();

    // Launch command in a new process
    spawn(cliCommand);

    // Close event for a process
    process.on('exit', (code) => {
      const endMessage = `CLI command from file: ${file}, took ${
        getNewDateTime() - startDate
      }ms.`;

      // If code is 1, it means that export server thrown an error
      if (code === 1) {
        return console.error(`[Fail] ${endMessage}`.red);
      }

      console.log(`[Success] ${endMessage}`.green);
    });
  } catch (error) {
    console.error(error);
  }
}
