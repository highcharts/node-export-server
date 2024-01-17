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
import { log } from './logger.js';
import path from 'node:path';

// Workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=1463328
// Not ideal - leaves trash in the FS
import { randomBytes } from 'node:crypto';

const RANDOM_PID = randomBytes(64).toString('base64url');
const PUPPETEER_DIR = path.join('tmp', `puppeteer-${RANDOM_PID}`);
const DATA_DIR = path.join(PUPPETEER_DIR, 'profile');

// The minimal args to speed up the browser
const minimalArgs = [
  `--user-data-dir=${DATA_DIR}`,
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
  '--disable-session-crashed-bubble',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-crash-restore-bubble',
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
  '--use-mock-keychain'
];

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const template = fs.readFileSync(
  __dirname + '/../templates/template.html',
  'utf8'
);

let browser;

const setPageContent = async (page) => {
  await page.setContent(template);
  await page.addScriptTag({ path: __dirname + '/../.cache/sources.js' });
  // eslint-disable-next-line no-undef
  await page.evaluate(() => window.setupHighcharts());

  page.on('pageerror', async (err) => {
    // TODO: Consider adding a switch here that turns on log(0) logging
    // on page errors.
    log(1, '[page error]', err);
    await page.$eval(
      '#container',
      (element, errorMessage) => {
        // eslint-disable-next-line no-undef
        if (window._displayErrors) {
          element.innerHTML = errorMessage;
        }
      },
      `<h1>Chart input data error</h1>${err.toString()}`
    );
  });
};

export const newPage = async () => {
  if (!browser) return false;

  const page = await browser.newPage();

  // Disable cache
  await page.setCacheEnabled(false);

  // Set the content
  await setPageContent(page);
  return page;
};

export const clearPage = async (page, hardReset = false) => {
  try {
    if (hardReset) {
      // Navigate to about:blank
      await page.goto('about:blank');

      // Set the content and and scripts again
      await setPageContent(page);
    } else {
      // Clear body content
      await page.$eval(
        'body',
        (body) =>
          (body.innerHTML =
            '<div id="chart-container"><div id="container"></div></div>')
      );
    }
  } catch (error) {
    log(3, '[browser] Could not clear page');
  }
};

export const create = async (puppeteerArgs) => {
  const allArgs = [...minimalArgs, ...(puppeteerArgs || [])];

  // Create a browser
  if (!browser) {
    let tryCount = 0;

    const open = async () => {
      try {
        log(
          3,
          '[browser] attempting to get a browser instance (try',
          tryCount + ')'
        );

        browser = await puppeteer.launch({
          headless: 'new',
          args: allArgs,
          userDataDir: './tmp/'
        });
      } catch (e) {
        log(0, '[browser]', e);
        if (++tryCount < 25) {
          log(3, '[browser] failed:', e);
          await new Promise((response) => setTimeout(response, 4000));
          await open();
        } else {
          log(0, 'Max retries reached');
        }
      }
    };

    try {
      await open();
    } catch (e) {
      log(0, '[browser] Unable to open browser');
      return false;
    }

    if (!browser) {
      log(0, '[browser] Unable to open browser');
      return false;
    }
  }

  // Return a browser promise
  return browser;
};

export const get = async () => {
  if (!browser) {
    throw 'No valid browser has been created';
  }

  return browser;
};

export const close = async () => {
  // Close the browser when connnected
  if (browser.connected) {
    await browser.close();
  }
};

export default {
  newPage,
  clearPage,
  get,
  close
};
