/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const fetch = require('node-fetch');

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
const requestsNumber = 10;

const stressTest = (number) => {
  const startTime = new Date().getTime();

  // Perform a request
  fetch('http://127.0.0.1:7801', options)
    .then(() => {
      const postTime = new Date().getTime() - startTime;
      console.log(`${number} request is done, took ${postTime}ms`);
    })
    .catch((error) => {
      return console.log(`[${number}] request returned error: ${error}`);
    });
};

setInterval(() => {
  for (let i = 1; i <= requestsNumber; i++) {
    stressTest(i);
  }
}, 100);
