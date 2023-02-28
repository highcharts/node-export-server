/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const puppeteer = require('puppeteer');

////
// const users = {};
// let browserPromise;

// module.exports = {
//   get: (id, puppeteerArgs) => {
//     users[id] = true;

//     // Create a browser promise
//     if (!browserPromise) {
//       browserPromise = puppeteer.launch({
//         headless: true,
//         args: puppeteerArgs || []
//       });
//     }

//     // Return a browser promise
//     return browserPromise;
//   },
//   close: async (id) => {
//     delete users[id];

//     // Close the browser if there are no users left
//     if (Object.keys(users).length === 0) {
//       return (browserPromise = (await browserPromise).close());
//     }
//   }
// };
////

///
const users = {};
let reopen = false;
let browser;

module.exports = {
  get: async (id, puppeteerArgs) => {
    users[id] = true;

    // Create a browser promise or reopen in case of resource was removed
    if (!browser || reopen) {
      browser = await puppeteer.launch({
        headless: true,
        args: puppeteerArgs || []
      });
      reopen = false;
    }

    // Return a browser promise
    return browser;
  },
  close: async (id) => {
    delete users[id];

    // Close the browser if there are no users left
    if (Object.keys(users).length === 0) {
      reopen = true;
      return browser.close();
    }
  }
};
///
