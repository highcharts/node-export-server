/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import fs from 'fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import * as url from 'url';

// Workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=1463328
// Not ideal - leaves trash in the FS
import { randomBytes } from 'node:crypto';

import { log, logWithStack } from './logger.js';

import ExportError from './errors/ExportError.js';

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

/**
 * Sets the content for a Puppeteer Page using a predefined template
 * and additional scripts. Also, sets the pageerror in order to catch
 * and display errors from the window context.
 *
 * @param {Object} page - The Puppeteer Page object for which the content
 * is being set.
 */
const setPageContent = async (page) => {
  await page.setContent(template);
  await page.addScriptTag({ path: __dirname + '/../.cache/sources.js' });
  // eslint-disable-next-line no-undef
  await page.evaluate(() => window.setupHighcharts());

  page.on('pageerror', async (error) => {
    // TODO: Consider adding a switch here that turns on log(0) logging
    // on page errors.
    // log(0, '[page error]', err);
    await page.$eval(
      '#container',
      (element, errorMessage) => {
        // eslint-disable-next-line no-undef
        if (window._displayErrors) {
          element.innerHTML = errorMessage;
        }
      },
      `<h1>Chart input data error</h1>${error.toString()}`
    );
  });
};

/**
 * Clears the content of a Puppeteer Page based on the specified mode.
 *
 * @param {Object} page - The Puppeteer Page object to be cleared.
 * @param {boolean} hardReset - A flag indicating the type of clearing
 * to be performed. If true, navigates to 'about:blank' and resets content
 * and scripts. If false, clears the body content by setting a predefined HTML
 * structure.
 *
 * @throws {Error} Logs thrown error if clearing the page content fails.
 */
export const clearPage = async (page, hardReset = false) => {
  try {
    if (hardReset) {
      // Navigate to about:blank
      await page.goto('about:blank');

      // Set the content and and scripts again
      await setPageContent(page);
    } else {
      // Clear body content
      await page.evaluate(() => {
        document.body.innerHTML =
          '<div id="chart-container"><div id="container"></div></div>';
      });
    }
  } catch (error) {
    logWithStack(
      2,
      error,
      '[browser] Could not clear the content of the page.'
    );
  }
};

/**
 * Creates a new Puppeteer Page within an existing browser instance.
 *
 * If the browser instance is not available, returns false.
 *
 * The function creates a new page, disables caching, sets content using
 * setPageContent(), and returns the created Puppeteer Page.
 *
 * @returns {(boolean|object)} Returns false if the browser instance is not
 * available, or a Puppeteer Page object representing the newly created page.
 */
export const newPage = async () => {
  if (!browser) return false;

  const page = await browser.newPage();

  // Disable cache
  await page.setCacheEnabled(false);

  // Set the content
  await setPageContent(page);
  return page;
};

/**
 * Creates a Puppeteer browser instance with the specified arguments.
 *
 * @param {Array} puppeteerArgs - Additional arguments for Puppeteer launch.
 *
 * @returns {Promise<object>} A Promise resolving to the Puppeteer browser
 * instance.
 *
 * @throws {ExportError} Throws an ExportError if max retries to open a browser
 * instance are reached, or if no browser instance is found after retries.
 */
export const create = async (puppeteerArgs) => {
  const allArgs = [...minimalArgs, ...(puppeteerArgs || [])];

  // Create a browser
  if (!browser) {
    let tryCount = 0;

    const open = async () => {
      try {
        log(
          3,
          `[browser] Attempting to get a browser instance (try ${++tryCount}).`
        );
        browser = await puppeteer.launch({
          headless: 'new',
          args: allArgs,
          userDataDir: './tmp/'
        });
      } catch (error) {
        logWithStack(
          1,
          error,
          '[browser] Failed to launch a browser instance.'
        );

        // Retry to launch browser until reaching max attempts
        if (tryCount < 25) {
          log(3, `[browser] Retry to open a browser (${tryCount} out of 25).`);
          await new Promise((response) => setTimeout(response, 4000));
          await open();
        } else {
          throw error;
        }
      }
    };

    try {
      await open();
    } catch (error) {
      throw new ExportError(
        '[browser] Maximum retries to open a browser instance reached.'
      ).setError(error);
    }

    if (!browser) {
      throw new ExportError('[browser] Cannot find a browser to open.');
    }
  }

  // Return a browser promise
  return browser;
};

/**
 * Retrieves the existing Puppeteer browser instance.
 *
 * @returns {Promise<object>} A Promise resolving to the Puppeteer browser
 * instance.
 *
 * @throws {ExportError} Throws an ExportError if no valid browser has been
 * created.
 */
export const get = async () => {
  if (!browser) {
    throw new ExportError('[browser] No valid browser has been created.');
  }

  return browser;
};

/**
 * Closes the Puppeteer browser instance if it is connected.
 *
 * @returns {Promise<boolean>} A Promise resolving to true after the browser
 * is closed.
 */
export const close = async () => {
  // Close the browser when connnected
  if (browser?.isConnected()) {
    await browser.close();
    log(4, '[browser] Closed the browser.');
  }
  return true;
};

export default {
  newPage,
  clearPage,
  get,
  close
};
