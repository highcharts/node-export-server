/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

require('colors');

const fetch = require('node-fetch');

// Test message
console.log(
  'Highcharts Export Server stress test'.yellow,
  `\nIt sends a certain number of requests in a certain interval`.green
);

// The request options
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    infile: {
      title: {
        text: 'Chart'
      },
      xAxis: {
        categories: ['Jan', 'Feb', 'Mar']
      },
      series: [
        {
          data: [29.9, 71.5, 106.4]
        }
      ]
    }
  })
};

const url = 'http://127.0.0.1:7801';
const requestsNumber = 10;
const interval = 1000;

const stressTest = (number) => {
  const startTime = new Date().getTime();

  // Perform a request
  fetch(url, options)
    .then(() => {
      const postTime = new Date().getTime() - startTime;
      console.log(`${number} request is done, took ${postTime}ms`);
    })
    .catch((error) => {
      return console.log(`[${number}] request returned error: ${error}`);
    });
};

// Perform a health check before continuing
fetch(`${url}/health`)
  .then(() => {
    setInterval(() => {
      for (let i = 1; i <= requestsNumber; i++) {
        stressTest(i);
      }
    }, interval);
  })
  .catch((error) => {
    if (error.code === 'ECONNREFUSED') {
      return console.log(
        `[ERROR] Couldn't connect to ${url}.`.red,
        `Set your server before running tests.`.red
      );
    }
  });
