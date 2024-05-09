/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import fs from 'fs';
import * as url from 'url';

import puppeteer from 'puppeteer';

import { getCachePath } from './cache.js';
import { getOptions } from './config.js';
import { setupHighcharts } from './highcharts.js';
import { log, logWithStack } from './logger.js';

import ExportError from './errors/ExportError.js';

// Get the template for the page
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const template = fs.readFileSync(
  __dirname + '/../templates/template.html',
  'utf8'
);

let browser;

/**
 * Retrieves the existing Puppeteer browser instance.
 *
 * @returns {Promise<object>} A Promise resolving to the Puppeteer browser
 * instance.
 *
 * @throws {ExportError} Throws an ExportError if no valid browser has been
 * created.
 */
export function get() {
  if (!browser) {
    throw new ExportError('[browser] No valid browser has been created.');
  }
  return browser;
}

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
export async function create(puppeteerArgs) {
  // Get the debug options
  const { enable: enabledDebug, ...debug } = getOptions().debug;
  const launchOptions = {
    headless: 'shell',
    userDataDir: './tmp/',
    args: puppeteerArgs,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    waitForInitialPage: false,
    defaultViewport: null,
    ...(enabledDebug && debug)
  };

  // Create a browser
  if (!browser) {
    let tryCount = 0;

    const open = async () => {
      try {
        log(
          3,
          `[browser] Attempting to get a browser instance (try ${++tryCount}).`
        );
        browser = await puppeteer.launch(launchOptions);
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
      // Debug mode inform
      if (enabledDebug) {
        log(3, `[browser] Launched browser in debug mode.`);
      }
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
}

/**
 * Closes the Puppeteer browser instance if it is connected.
 *
 * @returns {Promise<boolean>} A Promise resolving to true after the browser
 * is closed.
 */
export async function close() {
  // Close the browser when connnected
  if (browser?.connected) {
    await browser.close();
  }
  log(4, '[browser] Closed the browser.');
}

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
export async function newPage() {
  if (!browser) {
    return false;
  }

  // Create a page
  const page = await browser.newPage();

  // Disable cache
  await page.setCacheEnabled(false);

  // Set the content
  await setPageContent(page);

  return page;
}

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
export async function clearPage(page, hardReset = false) {
  try {
    if (hardReset) {
      // Navigate to about:blank
      await page.goto('about:blank', { waitUntil: 'domcontentloaded' });

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
}

/**
 * Sets the content for a Puppeteer Page using a predefined template
 * and additional scripts. Also, sets the pageerror in order to catch
 * and display errors from the window context.
 *
 * @param {Object} page - The Puppeteer Page object for which the content
 * is being set.
 */
async function setPageContent(page) {
  await page.setContent(template, { waitUntil: 'domcontentloaded' });

  // Add all registered Higcharts scripts, quite demanding
  await page.addScriptTag({ path: `${getCachePath()}/sources.js` });

  // Set the initial animObject
  await page.evaluate(setupHighcharts);
}

export default {
  get,
  create,
  close,
  newPage,
  clearPage
};
