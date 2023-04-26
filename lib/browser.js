/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/


import puppeteer from 'puppeteer';
import fs from 'fs';
import * as url from 'url';

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

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const template = fs.readFileSync(__dirname + '/../templates/template.html', 'utf8');

let reopen = false;
let browser;

export const newPage = async () => {
    if (!browser) return false;

    const p = await browser.newPage();

    await p.setContent(template);
    await p.addScriptTag({path: __dirname + '/../.cache/sources.js'});
    await p.evaluate(() => window.setupHighcharts());

    p.on('pageerror', async (err) => {
      // TODO: Consider adding a switch here that turns on log(0) logging
      // on page errors.
      await p.$eval(
        '#container',
        (element, errorMessage) => {
          if (window._displayErrors) {
            element.innerHTML = errorMessage;
          }
        },
        `<h1>Chart input data error</h1>${err.toString()}`
      );
    });

    return p;
  }

export const get = async (id, puppeteerArgs) => {
  const allArgs = [...minimalArgs, ...(puppeteerArgs || [])];
  users[id] = true;

  // Create a browser
  if (!browser || reopen) {
    try {
    browser = await puppeteer.launch({
      headless: true,
      args: allArgs,
      userDataDir: './tmp/'
    });
    reopen = false;
    } catch (e) {
      log(0, e);
    }
  }

  // Return a browser promise
  return browser;
};

export const close = async (id) => {
  // Delete user of a browser's instance
  delete users[id];

  // Close the browser if there are no users left
  if (Object.keys(users).length === 0) {
    reopen = true;
    return (browser = browser.close());
  }
};

export default {
  get,
  close
};
