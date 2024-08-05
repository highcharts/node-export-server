/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { exec } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import { __dirname } from '../../lib/utils.js';
import {
  showStartingTestMessage,
  showProcessingTestMessage,
  showFailOrSuccessMessage,
  showTestResults
} from '../test_utils.js';

showStartingTestMessage();

// Convert from callback to promise
const spawn = promisify(exec);

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
      showProcessingTestMessage(file);

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
      } catch (error) {
        failsCounter++;
        didFail = true;
      }
      testCounter++;

      showFailOrSuccessMessage(
        didFail,
        `CLI command from file: ${file}, took ${
          new Date().getTime() - startDate
        }ms.`
      );
    } catch (error) {
      console.error(error);
    }
  })(file);
}

showTestResults(testCounter, failsCounter);
