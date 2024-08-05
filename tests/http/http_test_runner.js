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

import { fetch } from '../../lib/fetch.js';
import { __dirname, clearText } from '../../lib/utils.js';
import { style } from '../../lib/logger.js';
import {
  showStartingTestMessage,
  showProcessingTestMessage,
  showFailOrSuccessMessage,
  showTestResults,
  showConnectionErrorMessage
} from '../test_utils.js';

showStartingTestMessage();

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

    // Disable event listeners limiter
    process.setMaxListeners(0);
    Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          try {
            showProcessingTestMessage(file);

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

                  // A chunk of data has been received
                  response.on('data', (chunk) => {
                    fileStream.write(chunk);
                  });

                  // The whole response has been received
                  response.on('end', () => {
                    fileStream.end();

                    showFailOrSuccessMessage(
                      response.statusCode >= 400,
                      `HTTP request with a payload from file: ${file}, took ${
                        new Date().getTime() - startDate
                      }ms.`
                    );

                    if (response.statusCode >= 400) {
                      failsCounter++;
                    } else {
                      testCounter++;
                    }

                    resolve();
                  });
                }
              );
              request.write(payload);
              request.end();
            });
          } catch (error) {
            console.error(error);
          }
        })
    ).then(() => {
      showTestResults(testCounter, failsCounter);
    });
  })
  .catch((error) => {
    if (error.code === 'ECONNREFUSED') {
      return showConnectionErrorMessage(url);
    }
  });
