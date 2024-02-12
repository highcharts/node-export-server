/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { exec as spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { fetch } from '../../lib/fetch.js';
import { basename, join } from 'path';

import 'colors';

import { __dirname, clearText } from '../../lib/utils.js';

// Test runner message
console.log(
  'Highcharts Export Server HTTP Requests Test Runner'.yellow,
  '\nThis tool simulates POST requests (via Curl) to'.green,
  'Highcharts Export Server.'.green,
  '\nThe server needs to be started before running this test.'.green,
  '\nLoads a specified JSON file and runs it'.green,
  '(results are stored in the ./tests/http/_results).\n'.green
);

// Results and scenarios paths
const resultsPath = join(__dirname, 'tests', 'http', '_results');

// Create results folder for HTTP exports if doesn't exist
!existsSync(resultsPath) && mkdirSync(resultsPath);

// Get the file's name
const file = process.argv[2];

// Url of Puppeteer export server
const url = 'http://127.0.0.1:7801';

// Perform a health check before continuing
fetch(`${url}/health`)
  .then(() => {
    // Check if file even exists and if it is a JSON
    if (existsSync(file) && file.endsWith('.json')) {
      try {
        console.log('[Test runner]'.blue, `Processing test ${file}.`);

        // Read a payload file
        const payload = clearText(readFileSync(file).toString(), /\s\s+/g, '');

        const parsedJPayload = JSON.parse(payload);

        // Results folder path
        const resultsFile = join(
          resultsPath,
          basename(file).replace(
            '.json',
            `.${parsedJPayload.b64 ? 'txt' : parsedJPayload.type || 'png'}`
          )
        );

        // Complete the curl command
        let command = [
          'curl',
          '-H "Content-Type: application/json"',
          '-X POST'
        ];

        // Use the --data-binary to get payload body from a file
        command.push('--data-binary', `"@${file}"`);

        // Complete the curl command
        command = command.concat([url, '-o', resultsFile]).join(' ');

        // The start date of a POST request
        const startDate = new Date().getTime();

        // Launch command in a new process
        spawn(command, (error) => {
          const endMessage = `HTTP request with a payload from file: ${file}, took ${
            new Date().getTime() - startDate
          }ms.`;

          // If code is 1, it means that export server thrown an error
          if (error) {
            return console.error(`[Fail] ${endMessage}`.red);
          }

          console.log(`[Success] ${endMessage}`.green);
        });
      } catch (error) {
        console.error(error);
      }
    }
  })
  .catch((error) => {
    if (error.code === 'ECONNREFUSED') {
      return console.log(
        `[ERROR] Couldn't connect to ${url}.`.red,
        `Set your server before running tests.`.red
      );
    }
  });
