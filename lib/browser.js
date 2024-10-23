/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { readFileSync } from 'fs';
import { join } from 'path';

import puppeteer from 'puppeteer';

import { getCachePath } from './cache.js';
import { getOptions } from './config.js';
import { setupHighcharts } from './highcharts.js';
import { log, logWithStack } from './logger.js';
import { __dirname, expBackoff } from './utils.js';
import { envs } from './validate.js';

import ExportError from './errors/ExportError.js';

// Get the template for the page
const template = readFileSync(__dirname + '/templates/template.html', 'utf8');

// To save the browser
let browser;

// To save the WebSocket endpoint in case of a sudden disconnect
let wsEndpoint;

/**
 * Retrieves the existing Puppeteer browser instance.
 *
 * @returns {Promise<Object>} A Promise resolving to the Puppeteer browser
 * instance.
 *
 * @throws {ExportError} Throws an ExportError if no valid browser has been
 * created.
 */
export function getBrowser() {
  if (!browser) {
    throw new ExportError('[browser] No valid browser has been created.', 500);
  }
  return browser;
}

/**
 * Creates a Puppeteer browser instance with the specified arguments.
 *
 * @param {Array.<string>} [puppeteerArg=[]] - Additional arguments for
 * Puppeteer launch.
 *
 * @returns {Promise<Object>} A Promise resolving to the Puppeteer browser
 * instance.
 *
 * @throws {ExportError} Throws an ExportError if max retries to open a browser
 * instance are reached, or if no browser instance is found after retries.
 */
export async function createBrowser(puppeteerArgs = []) {
  // Get `debug` and `other` options
  const { debug, other } = getOptions();

  // Get the `debug` options
  const { enable: enabledDebug, ...debugOptions } = debug;

  // Launch options for the browser instance
  const launchOptions = {
    headless: other.browserShellMode ? 'shell' : true,
    userDataDir: 'tmp',
    args: puppeteerArgs,
    // Must be disabled for debugging to work
    pipe: envs.OTHER_CONNECTION_OVER_PIPE,
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

        // Launch the browser
        browser = await puppeteer.launch(launchOptions);

        // Close the initial pages if any found
        const pages = await browser.pages();
        if (pages) {
          for (const page of pages) {
            await page.close();
          }
        }

        // Only for the WebSocket connection
        if (!launchOptions.pipe) {
          // Save WebSocket endpoint
          wsEndpoint = browser.wsEndpoint();

          // Attach the disconnected event
          browser.on('disconnected', _reconnect);
        }
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
        '[browser] Maximum retries to open a browser instance reached.',
        500
      ).setError(error);
    }

    if (!browser) {
      throw new ExportError('[browser] Cannot find a browser to open.', 500);
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
export async function closeBrowser() {
  // Close the browser when connected
  if (browser && browser.connected) {
    await browser.close();
  }
  browser = null;
  log(4, '[browser] Closed the browser.');
}

/**
 * Creates a new Puppeteer Page within an existing browser instance.
 *
 * If the browser instance is not available, returns false.
 *
 * The function creates a new page, disables caching, sets content using
 * _setPageContent(), and returns the created Puppeteer Page.
 *
 * @param {Object} poolResource - The pool resource that contians page and id.
 *
 * @returns {(boolean|object)} Returns false if the browser instance is not
 * available, or a Puppeteer Page object representing the newly created page.
 */
export async function newPage(poolResource) {
  const startDate = new Date().getTime();

  // Throw an error in case of no connected browser
  if (!browser || !browser.connected) {
    throw new ExportError(`[browser] Browser is not yet connected.`, 400);
  }

  // Create a page
  poolResource.page = await browser.newPage();

  // Disable cache
  await poolResource.page.setCacheEnabled(false);

  // Set the content
  await _setPageContent(poolResource.page);

  // Set page events
  _setPageEvents(poolResource);

  // Check if the page is correctly created
  if (!poolResource.page || poolResource.page.isClosed()) {
    throw new ExportError('The page is invalid or closed.', 500);
  }

  log(
    3,
    `[pool] Pool resource [${poolResource.id}] - Successfully created a worker, took ${
      new Date().getTime() - startDate
    }ms.`
  );

  // Return the resource with a ready to use page
  return poolResource;
}

/**
 * Clears the content of a Puppeteer Page based on the specified mode.
 *
 * @param {Object} poolResource - The pool resource that contians page and id.
 * @param {boolean} [hardReset=false] - A flag indicating the type of clearing
 * to be performed. If true, navigates to 'about:blank' and resets content
 * and scripts. If false, clears the body content by setting a predefined HTML
 * structure.
 *
 * @throws {Error} Logs thrown error if clearing the page content fails.
 */
export async function clearPage(poolResource, hardReset = false) {
  try {
    if (!poolResource.page.isClosed()) {
      if (hardReset) {
        // Navigate to about:blank
        await poolResource.page.goto('about:blank', {
          waitUntil: 'domcontentloaded'
        });

        // Set the content and and scripts again
        await _setPageContent(poolResource.page);
      } else {
        // Clear body content
        await poolResource.page.evaluate(() => {
          document.body.innerHTML =
            '<div id="chart-container"><div id="container"></div></div>';
        });
      }
    }
  } catch (error) {
    logWithStack(
      2,
      error,
      `[pool] Pool resource [${poolResource.id}] - Content of the page could not be cleared.`
    );
    // Set the `workLimit` to exceeded in order to recreate the resource
    poolResource.workCount = getOptions().pool.workLimit + 1;
  }
}

/**
 * Adds custom JS and CSS resources to a Puppeteer Page based on the specified
 * options.
 *
 * @param {Object} page - The Puppeteer Page object to which resources will be
 * added.
 * @param {Object} customLogicOptions - The custom logic options.
 *
 * @returns {Promise<Array.<Object>>} Promise resolving to an array of injected
 * resources.
 */
export async function addPageResources(page, customLogicOptions) {
  // Injected resources array
  const injectedResources = [];

  // Use resources
  const resources = customLogicOptions.resources;
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
            } else if (customLogicOptions.allowFileResources) {
              injectedCss.push({
                path: join(__dirname, cssImportPath)
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
 * @param {Array.<Object>} injectedResources - Array of injected resources
 * to be cleared.
 */
export async function clearPageResources(page, injectedResources) {
  try {
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
  } catch (error) {
    logWithStack(1, error, `[browser] Could not clear page's resources.`);
  }
}

/**
 * Reconnects to the browser instance when it is disconnected. If the current
 * browser connection is lost, it attempts to reconnect using the previous
 * WebSocket endpoint. If the reconnection fails, it will try to close the
 * browser and relaunch a new instance.
 */
async function _reconnect() {
  try {
    // Start the reconnecting
    log(3, `[browser] Restarting the browser connection.`);

    // Try to reconnect the browser
    if (browser && !browser.connected) {
      browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint
      });
    }

    // Save a new WebSocket endpoint
    wsEndpoint = browser.wsEndpoint();

    // Add the reconnect event again
    browser.on('disconnected', _reconnect);

    // Log the success message
    log(3, `[browser] Browser reconnected successfully.`);
  } catch (error) {
    logWithStack(
      1,
      error,
      '[browser] Could not restore the browser connection, attempting to relaunch.'
    );

    // Try to close the browser before relaunching
    try {
      await close();
    } catch (error) {
      logWithStack(
        1,
        error,
        '[browser] Could not close the browser before relaunching (probably is already closed).'
      );
    }

    // Try to relaunch the browser
    await createBrowser(getOptions().puppeteer.args || []);

    // Log the success message
    log(3, `[browser] Browser relaunched successfully.`);
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
async function _setPageContent(page) {
  await page.setContent(template, { waitUntil: 'domcontentloaded' });

  // Add all registered Higcharts scripts, quite demanding
  await page.addScriptTag({ path: join(getCachePath(), 'sources.js') });

  // Set the initial animObject
  await page.evaluate(setupHighcharts);
}

/**
 * Set events for a Puppeteer Page.
 *
 * @param {Object} poolResource - The pool resource that contians page and id.
 */
function _setPageEvents(poolResource) {
  // Get `debug` and `pool` options
  const { debug, pool } = getOptions();

  // Set the pageerror listener
  poolResource.page.on('pageerror', async (error) => {
    await poolResource.page.$eval(
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

  // Set the console listener, if needed
  if (debug.enable && debug.listenToConsole) {
    poolResource.page.on('console', (message) => {
      console.log(`[debug] ${message.text()}`);
    });
  }

  // Add the framedetached event if the connection is over WebSocket
  if (envs.OTHER_CONNECTION_OVER_PIPE === false) {
    poolResource.page.on('framedetached', async (frame) => {
      // Get the main frame
      const mainFrame = poolResource.page.mainFrame();

      // Check if a page's frame is detached and requires to be recreated
      if (
        frame === mainFrame &&
        mainFrame.detached &&
        poolResource.workCount <= pool.workLimit
      ) {
        log(
          3,
          `[browser] Pool resource [${poolResource.id}] - Page's frame detached.`
        );
        try {
          // Try to connect to a new page using exponential backoff strategy
          expBackoff(
            async (poolResourceId, poolResource) => {
              try {
                // Try to close the page with a detached frame
                if (!poolResource.page.isClosed()) {
                  await poolResource.page.close();
                }
              } catch (error) {
                log(
                  3,
                  `[browser] Pool resource [${poolResourceId}] - Could not close the page with a detached frame.`
                );
              }

              // Trigger a page creation
              await newPage(poolResource);
            },
            0,
            poolResource.id,
            poolResource
          );
        } catch (error) {
          logWithStack(
            3,
            error,
            `[browser] Pool resource [${poolResource.id}] - Could not create a new page.`
          );

          // Set the `workLimit` to exceeded in order to recreate the resource
          poolResource.workCount = pool.workLimit + 1;
        }
      }
    });
  }
}

export default {
  getBrowser,
  createBrowser,
  closeBrowser,
  newPage,
  clearPage,
  addPageResources,
  clearPageResources
};
