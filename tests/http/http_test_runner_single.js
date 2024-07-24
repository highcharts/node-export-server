/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import http from 'http';
import { basename, join } from 'path';

import 'colors';

import { fetch } from '../../lib/fetch.js';
import { __dirname, clearText } from '../../lib/utils.js';

// Test runner message
console.log(
  'Highcharts Export Server HTTP Requests Test Runner'.yellow.bold.underline,
  '\nThis tool simulates POST requests to Highcharts Export Server.'.green,
  '\nThe server needs to be started before running this test.'.green,
  '\nLoads a specified JSON file and runs it'.green,
  '(results are stored in the ./tests/http/_results).\n'.green
);

// Url of Puppeteer export server
const url = 'http://127.0.0.1:7801';

// Perform a health check before continuing
fetch(`${url}/health`)
  .then(() => {
    // Results path
    const resultsPath = join(__dirname, 'tests', 'http', '_results');

    // Create results folder for HTTP exports if it doesn't exist
    !existsSync(resultsPath) && mkdirSync(resultsPath);

    // Get the file's name
    const file = process.argv[2];

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

            // A chunk of data has been received
            response.on('data', (chunk) => {
              fileStream.write(chunk);
            });

            // The whole response has been received
            response.on('end', () => {
              fileStream.end();

              const endMessage = `HTTP request with a payload from file: ${file}, took ${
                new Date().getTime() - startDate
              }ms.`;

              // Based on received status code check if requests failed
              if (response.statusCode >= 400) {
                console.log(`[Fail] ${endMessage}`.red);
              } else {
                console.log(`[Success] ${endMessage}`.green);
              }
            });
          }
        );
        request.write(payload);
        request.end();
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
