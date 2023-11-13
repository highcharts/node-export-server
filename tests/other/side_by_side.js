/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { fetch } from '../../lib/fetch.js';
import { exec as spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import 'colors';

import { __dirname } from '../../lib/utils.js';

// Results paths
const resultsPath = join(__dirname, 'tests', 'other', '_results');

// Create results folder for CLI exports if doesn't exist
!existsSync(resultsPath) && mkdirSync(resultsPath);

// Urls of Puppeteer and PhantomJS export servers
const urls = ['http://127.0.0.1:7801', 'http://127.0.0.1:7802'];

// Test message
console.log(
  'Highcharts Export Server Side By Side comparator'.yellow,
  `\nPuppeteer: ${urls[0]}`.green,
  `\nPhantomJS: ${urls[1]}\n`.blue
);

try {
  // Run for both servers
  for (const [index, url] of urls.entries()) {
    // Perform a health check before continuing
    fetch(`${url}/health`)
      .then(() => {
        // And all types
        for (const type of ['png', 'jpeg', 'svg', 'pdf']) {
          // Results folder path
          const resultsFile = join(
            resultsPath,
            (index ? 'phantom_' : 'puppeteer_') + `chart.${type}`
          );

          // Payload body
          const payload = JSON.stringify({
            infile: {
              title: {
                text: index
                  ? 'Phantom Export Server'
                  : 'Puppeteer Export Server'
              },
              xAxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr']
              },
              series: [
                {
                  type: 'line',
                  data: [1, 3, 2, 4]
                },
                {
                  type: 'line',
                  data: [5, 3, 4, 2]
                }
              ]
            },
            type,
            scale: 2,
            callback:
              "function callback(chart) {chart.renderer.label('This label is added in the callback', 100, 100).attr({id: 'renderer-callback-label', fill: '#90ed7d', padding: 10, r: 10, zIndex: 10}).css({color: 'black', width: '100px'}).add();}"
          });

          // Complete the curl command
          const command = [
            'curl',
            '-H "Content-Type: application/json"',
            '-X POST',
            '-d',
            // Stringify again for a correct format for both Unix and Windows
            JSON.stringify(payload),
            url,
            '-o',
            resultsFile
          ].join(' ');

          // The start date of a POST request
          const startDate = new Date().getTime();

          // Launch command in a new process
          // eslint-disable-next-line no-global-assign
          process = spawn(command);

          // Close event for a process
          process.on('close', () => {
            const message = `Done with ${
              index ? '[PhantomJS]' : '[Puppeteer]'
            } ${type} export, took ${new Date().getTime() - startDate}ms.`;

            console.log(index ? message.blue : message.green);
          });
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
  }
} catch (error) {
  console.log(`Error thrown: ${error}`);
}
