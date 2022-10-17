/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

require('colors');

const fetch = require('node-fetch');
const spawn = require('child_process').exec;
const { existsSync, mkdirSync, readdirSync, readFileSync } = require('fs');
const { join } = require('path');

const { clearText } = require('../../lib/utils.js');

// Test runner message
console.log(
  'Highcharts Export Server HTTP Requests Test Runner'.yellow,
  '\nThis tool simulates POST requests (via Curl) to'.green,
  'Highcharts Export Server.'.green,
  '\nThe server needs to be started before running this test.'.green,
  '\nLoads all JSON files from the ./tests/http folder and runs them'.green,
  '(results are stored in the ./tests/http/_results).\n'.green
);

// Results and scenarios paths
const resultsPath = join(__dirname, '_results');
const scenariosPath = join(__dirname, 'scenarios');

// Create results folder for HTTP exports if doesn't exist
!existsSync(resultsPath) && mkdirSync(resultsPath);

// Get files names
const files = readdirSync(scenariosPath);

// Tests counters
let testCounter = 0;
let failsCouter = 0;

// Url of Puppeteer export server
const url = 'http://127.0.0.1:7801';

// Perform a health check before continuing
fetch(`${url}/health`)
  .then(() => {
    process.setMaxListeners(0);
    Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(
          (file) =>
            new Promise((resolve) => {
              try {
                console.log('[Test runner]'.blue, `Processing test ${file}.`);

                // A file path
                const filePath = join(scenariosPath, file);

                // Read a payload file
                const payload = clearText(
                  readFileSync(filePath).toString(),
                  /\s\s+/g,
                  ''
                );

                const parsedJPayload = JSON.parse(payload);

                // Results folder path
                const resultsFile = join(
                  resultsPath,
                  file.replace(
                    '.json',
                    `.${
                      parsedJPayload.b64 ? 'txt' : parsedJPayload.type || 'png'
                    }`
                  )
                );

                // Complete the curl command
                let command = [
                  'curl',
                  '-H "Content-Type: application/json"',
                  '-X POST'
                ];

                // Use the --data-binary to get payload body from a file
                command.push('--data-binary', `"@${filePath}"`);

                // Complete the curl command
                command = command.concat([url, '-o', resultsFile]).join(' ');

                // The start date of a POST request
                const startDate = new Date().getTime();

                // Launch command in a new process
                process = spawn(command);

                // Close event for a process
                process.on('exit', (code) => {
                  testCounter++;

                  // If code is 1, it means that export server thrown an error
                  if (code) {
                    failsCouter++;
                  }

                  const endMessage = `HTTP request with a payload from file: ${file}, took ${
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
  })
  .catch((error) => {
    if (error.code === 'ECONNREFUSED') {
      return console.log(
        `[ERROR] Couldn't connect to ${url}.`.red,
        `Set your server before running tests.`.red
      );
    }
  });
