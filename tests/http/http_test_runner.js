/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync
} from 'fs';
import http from 'http';
import { join } from 'path';

import 'colors';

import { fetch } from '../../lib/fetch.js';
import { __dirname, clearText } from '../../lib/utils.js';

// Test runner message
console.log(
  'Highcharts Export Server HTTP Requests Test Runner'.yellow.bold.underline,
  '\nThis tool simulates POST requests to Highcharts Export Server.'.green,
  '\nThe server needs to be started before running this test.'.green,
  '\nLoads all JSON files from the ./tests/http folder and runs them'.green,
  '(results are stored in the ./tests/http/_results).\n'.green
);

// Url of Puppeteer export server
const url = 'http://127.0.0.1:7801';

// Perform a health check before continuing
fetch(`${url}/health`)
  .then(() => {
    // Results and scenarios paths
    const resultsPath = join(__dirname, 'tests', 'http', '_results');
    const scenariosPath = join(__dirname, 'tests', 'http', 'scenarios');

    // Create results folder for HTTP exports if it doesn't exist
    !existsSync(resultsPath) && mkdirSync(resultsPath);

    // Get files' names
    const files = readdirSync(scenariosPath);

    // Tests counters
    let testCounter = 0;
    let failsCounter = 0;
    // Both scenarios submit custom logic, which is disabled by default. Keep
    // these assertions explicit instead of treating every HTTP 400 as success.
    const expectedErrors = {
      'allow_code_execution.json': {
        status: 400,
        message:
          "[chart] The 'callback', 'resources' and 'customCode' options have been disabled for this server."
      },
      'do_not_allow_file_resources.json': {
        status: 400,
        message:
          "[chart] The 'callback', 'resources' and 'customCode' options have been disabled for this server."
      }
    };

    // Disable event listeners limiter
    process.setMaxListeners(0);
    Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
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
            const parsedPayload = JSON.parse(payload);

            // Results folder path
            const resultsFile = join(
              resultsPath,
              file.replace(
                '.json',
                `.${parsedPayload.b64 ? 'txt' : parsedPayload.type || 'png'}`
              )
            );

            return new Promise((resolve) => {
              // The start date of a POST request
              const startDate = new Date().getTime();
              const request = http.request(
                url,
                {
                  path: '/',
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                },
                (response) => {
                  const fileStream = createWriteStream(resultsFile);
                  const chunks = [];

                  // A chunk of data has been received
                  response.on('data', (chunk) => {
                    fileStream.write(chunk);
                    if (expectedErrors[file]) chunks.push(chunk);
                  });

                  // The whole response has been received
                  response.on('end', () => {
                    fileStream.end();

                    const endMessage = `HTTP request with a payload from file: ${file}, took ${
                      new Date().getTime() - startDate
                    }ms.`;

                    const expected = expectedErrors[file];
                    let matches = response.statusCode < 400;
                    if (expected) {
                      try {
                        const body = JSON.parse(
                          Buffer.concat(chunks).toString()
                        );
                        matches =
                          response.statusCode === expected.status &&
                          body.message === expected.message;
                      } catch {
                        matches = false;
                      }
                    }
                    testCounter++;
                    if (!matches) {
                      failsCounter++;
                      console.log(
                        `[Fail] ${endMessage} (HTTP ${response.statusCode})`.red
                      );
                    } else {
                      console.log(`[Success] ${endMessage}`.green);
                    }
                    resolve();
                  });
                }
              );
              request.on('error', (error) => {
                testCounter++;
                failsCounter++;
                console.error(`[Fail] ${file}:`, error);
                resolve();
              });
              request.write(payload);
              request.end();
            });
          } catch (error) {
            testCounter++;
            failsCounter++;
            console.error(error);
          }
        })
    ).then(() => {
      console.log(
        '\n--------------------------------',
        failsCounter
          ? `\n${testCounter} tests done, ${failsCounter} error(s) found!`.red
          : `\n${testCounter} tests done, errors not found!`.green,
        '\n--------------------------------'
      );
      if (failsCounter) process.exitCode = 1;
    });
  })
  .catch((error) => {
    console.error(`[ERROR] Couldn't connect to ${url}: ${error.message}`.red);
    process.exitCode = 1;
  });
