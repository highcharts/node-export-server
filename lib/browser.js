/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const puppeteer = require('puppeteer');
const users = {};

let browserPromise;

module.exports = {
  get: (id, puppeteerArgs) => {
    users[id] = true;

    // Create a browser promise
    if (!browserPromise) {
      browserPromise = puppeteer.launch({
        headless: true,
        args: puppeteerArgs || []
      });
    }

    // Return a browser promise
    return browserPromise;
  },
  close: async (id) => {
    delete users[id];

    if (Object.keys(users).length === 0) {
      return (browserPromise = (await browserPromise).close());
    }
  }
};
