/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const puppeteer = require('puppeteer');

// The minimal args to speed up the browser
const minimalArgs = [
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain'
];

const users = {};
let reopen = false;
let browser;

module.exports = {
  get: async (id, puppeteerArgs) => {
    const allArgs = [...minimalArgs, ...(puppeteerArgs || [])];
    users[id] = true;

    // Create a browser
    if (!browser || reopen) {
      browser = await puppeteer.launch({
        headless: true,
        args: allArgs
      });
      reopen = false;
    }

    // Return a browser promise
    return browser;
  },
  close: async (id) => {
    // Delete user of a browser's instance
    delete users[id];

    // Close the browser if there are no users left
    if (Object.keys(users).length === 0) {
      reopen = true;
      return (browser = browser.close());
    }
  }
};

/// Commented for now
// module.exports = {
//   get: async (id, puppeteerArgs) => {
//     const allArgs = [...minimalArgs, ...(puppeteerArgs || [])];
//     users[id] = true;

//     // Create a browser
//     const browser = await puppeteer.launch({
//       headless: true,
//       args: allArgs
//     });

//     // Return a browser promise
//     return browser;
//   },
//   close: async (browserInstance) => {
//     // Delete user of a browser's instance
//     delete users[browserInstance.id];

//     // Close the browser
//     return browserInstance.close();
//   }
// };
///
