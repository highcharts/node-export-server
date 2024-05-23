/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { readFileSync } from 'fs';
import path from 'path';

import puppeteer from 'puppeteer';

import { getCachePath } from './cache.js';
import { getOptions } from './config.js';
import { setupHighcharts } from './highcharts.js';
import { log, logWithStack } from './logger.js';
import { __dirname } from './utils.js';

import ExportError from './errors/ExportError.js';

// Get the template for the page
const template = readFileSync(__dirname + '/templates/template.html', 'utf8');

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
  // Get debug and other options
  const { debug, other } = getOptions();

  // Get the debug options
  const { enable: enabledDebug, ...debugOptions } = debug;

  const launchOptions = {
    headless: other.browserShellMode ? 'shell' : true,
    userDataDir: './tmp/',
    args: puppeteerArgs,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    waitForInitialPage: false,
    defaultViewport: null,
    ...(enabledDebug && debugOptions)
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

      // Shell mode inform
      if (launchOptions.headless === 'shell') {
        log(3, `[browser] Launched browser in shell mode.`);
      }

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

  // Set page events
  setPageEvents(page);

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
    if (!page.isClosed()) {
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
 * Adds custom JS and CSS resources to a Puppeteer Page based on the specified
 * options.
 *
 * @param {Object} page - The Puppeteer Page object to which resources will be
 * added.
 * @param {Object} options - All options and configuration.
 *
 * @returns {Promise<Array<Object>>} - Promise resolving to an array of injected
 * resources.
 */
export async function addPageResources(page, options) {
  // Injected resources array
  const injectedResources = [];

  // Use resources
  const resources = options.customLogic.resources;
  if (resources) {
    const injectedJs = [];

    // Load custom JS code
    if (resources.js) {
      injectedJs.push({
        content: resources.js
      });
    }

    // Load scripts from all custom files
    if (resources.files) {
      for (const file of resources.files) {
        const isLocal = !file.startsWith('http') ? true : false;

        // Add each custom script from resources' files
        injectedJs.push(
          isLocal
            ? {
                content: readFileSync(file, 'utf8')
              }
            : {
                url: file
              }
        );
      }
    }

    for (const jsResource of injectedJs) {
      try {
        injectedResources.push(await page.addScriptTag(jsResource));
      } catch (error) {
        logWithStack(2, error, `[export] The JS resource cannot be loaded.`);
      }
    }
    injectedJs.length = 0;

    // Load CSS
    const injectedCss = [];
    if (resources.css) {
      let cssImports = resources.css.match(/@import\s*([^;]*);/g);
      if (cssImports) {
        // Handle css section
        for (let cssImportPath of cssImports) {
          if (cssImportPath) {
            cssImportPath = cssImportPath
              .replace('url(', '')
              .replace('@import', '')
              .replace(/"/g, '')
              .replace(/'/g, '')
              .replace(/;/, '')
              .replace(/\)/g, '')
              .trim();

            // Add each custom css from resources
            if (cssImportPath.startsWith('http')) {
              injectedCss.push({
                url: cssImportPath
              });
            } else if (options.customLogic.allowFileResources) {
              injectedCss.push({
                path: path.join(__dirname, cssImportPath)
              });
            }
          }
        }
      }

      // The rest of the CSS section will be content by now
      injectedCss.push({
        content: resources.css.replace(/@import\s*([^;]*);/g, '') || ' '
      });

      for (const cssResource of injectedCss) {
        try {
          injectedResources.push(await page.addStyleTag(cssResource));
        } catch (error) {
          logWithStack(2, error, `[export] The CSS resource cannot be loaded.`);
        }
      }
      injectedCss.length = 0;
    }
  }
  return injectedResources;
}

/**
 * Clears out all state set on the page with addScriptTag/addStyleTag. Removes
 * injected resources and resets CSS and script tags on the page. Additionally,
 * it destroys previously existing charts.
 *
 * @param {Object} page - The Puppeteer Page object from which resources will
 * be cleared.
 * @param {Array<Object>} injectedResources - Array of injected resources
 * to be cleared.
 */
export async function clearPageResources(page, injectedResources) {
  for (const resource of injectedResources) {
    await resource.dispose();
  }

  // Destroy old charts after export is done and reset all CSS and script tags
  await page.evaluate(() => {
    // We are not guaranteed that Highcharts is loaded, e,g, when doing SVG
    // exports
    if (typeof Highcharts !== 'undefined') {
      // eslint-disable-next-line no-undef
      const oldCharts = Highcharts.charts;

      // Check in any already existing charts
      if (Array.isArray(oldCharts) && oldCharts.length) {
        // Destroy old charts
        for (const oldChart of oldCharts) {
          oldChart && oldChart.destroy();
          // eslint-disable-next-line no-undef
          Highcharts.charts.shift();
        }
      }
    }

    // eslint-disable-next-line no-undef
    const [...scriptsToRemove] = document.getElementsByTagName('script');
    // eslint-disable-next-line no-undef
    const [, ...stylesToRemove] = document.getElementsByTagName('style');
    // eslint-disable-next-line no-undef
    const [...linksToRemove] = document.getElementsByTagName('link');

    // Remove tags
    for (const element of [
      ...scriptsToRemove,
      ...stylesToRemove,
      ...linksToRemove
    ]) {
      element.remove();
    }
  });
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

/**
 * Set events for a Puppeteer Page.
 *
 * @param {Object} page - The Puppeteer Page object to set events to.
 */
function setPageEvents(page) {
  // Get debug options
  const { debug } = getOptions();

  // Set the console listener, if needed
  if (debug.enable && debug.listenToConsole) {
    page.on('console', (message) => {
      console.log(`[debug] ${message.text()}`);
    });
  }

  // Set the pageerror listener
  page.on('pageerror', async (error) => {
    // TODO: Consider adding a switch here that turns on log(0) logging
    // on page errors.
    await page.$eval(
      '#container',
      (element, errorMessage) => {
        // eslint-disable-next-line no-undef
        if (window._displayErrors) {
          element.innerHTML = errorMessage;
        }
      },
      `<h1>Chart input data error: </h1>${error.toString()}`
    );
  });
}

export default {
  get,
  create,
  close,
  newPage,
  clearPage,
  addPageResources,
  clearPageResources
};
