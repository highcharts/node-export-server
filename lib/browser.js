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

// Incremented every time the browser is lost. Pool workers are stamped with the
// value current when they were created, which lets the pool tell that a worker
// belongs to a browser that no longer exists. This is necessary because a page
// belonging to a dead browser still reports isClosed() === false, so the page
// itself cannot be asked whether it is usable.
let browserGeneration = 0;

// The arguments the browser was last launched with, kept so that it can be
// relaunched on the same terms after an unexpected disconnect.
let lastPuppeteerArgs = [];

// Set while the browser is being deliberately closed, so that the resulting
// disconnect is not mistaken for a crash.
let closingOnPurpose = false;

// Shared promise for an in-flight launch, so that concurrent callers - the pool
// creating several workers at once, typically - trigger a single launch rather
// than one each.
let launchPromise = null;

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
 * Returns the current browser generation. Pool workers are stamped with this
 * value on creation and compared against it on validation, so that workers
 * holding a page from a previous, now dead, browser can be identified and
 * replaced.
 *
 * @returns {number} The current browser generation.
 */
export function getGeneration() {
  return browserGeneration;
}

/**
 * Reports whether a usable browser is currently connected.
 *
 * @returns {boolean} True when a browser exists and is connected.
 */
export function isConnected() {
  return !!browser?.connected;
}

/**
 * Handles the browser disconnecting. Puppeteer emits this when the browser
 * process goes away for any reason, including being killed by an out of memory
 * reaper, which is the case this exists for.
 *
 * The browser reference is cleared so that the guard in create() will actually
 * relaunch it, and the generation is advanced so that every pool worker holding
 * a page from the dead browser fails validation and is replaced.
 */
function handleDisconnect() {
  if (closingOnPurpose) {
    return;
  }

  browserGeneration++;
  browser = undefined;

  log(
    1,
    `[browser] The browser disconnected unexpectedly. Invalidating all workers and relaunching on next use (generation ${browserGeneration}).`
  );
}

/**
 * Reports whether a process is still running, by asking the operating system
 * rather than trusting the child process object.
 *
 * NOTE: exitCode and signalCode are not dependable here. Both are null for a
 *       running process, but either can be undefined depending on how the
 *       process object was produced, and `undefined !== null` reads as exited -
 *       which silently skips both the wait and the kill below, leaving the
 *       process alive. Signal 0 performs the permission and existence checks
 *       without delivering anything.
 *
 * @param {Object} proc - The child process to check.
 *
 * @returns {boolean} True while the process still exists.
 */
function isAlive(proc) {
  if (!proc?.pid) {
    return false;
  }

  try {
    process.kill(proc.pid, 0);
    return true;
  } catch (error) {
    // ESRCH means no such process; EPERM means it exists but is not ours
    return error.code === 'EPERM';
  }
}

/**
 * Waits for a child process to exit, up to a limit.
 *
 * @param {Object} proc - The child process to wait for.
 * @param {number} timeout - How long to wait, in milliseconds.
 *
 * @returns {Promise<boolean>} True if the process exited within the limit.
 */
function waitForExit(proc, timeout) {
  return new Promise((resolve) => {
    if (!isAlive(proc)) {
      return resolve(true);
    }

    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };

    const timer = setTimeout(() => {
      proc.removeListener('exit', onExit);
      resolve(false);
    }, timeout);

    proc.once('exit', onExit);
  });
}

/**
 * Closes a browser and makes certain its process has actually gone.
 *
 * @param {Object} instance - The Puppeteer browser instance to end.
 *
 * @returns {Promise<void>} Resolves once the process has exited, or once giving
 * up waiting for it.
 */
async function terminate(instance) {
  // Take the process reference before closing, as it is not reachable afterwards
  const proc = instance.process();

  try {
    await instance.close();
  } catch (error) {
    logWithStack(2, error, '[browser] Could not cleanly close the browser.');
  }

  if (!proc) {
    log(
      2,
      '[browser] No process handle for the browser, so its exit cannot be confirmed.'
    );
    return;
  }

  // NOTE: close() resolving does not mean the process has gone. It can resolve
  //       when the connection drops, and the launch options deliberately disable
  //       Puppeteer's signal handling, so nothing will clean up on our behalf.
  //
  //       A surviving process keeps Chrome's lock on the user data directory,
  //       which is shared by every launch here, so leaving one behind stops any
  //       later browser from starting at all - and on shutdown it leaks a browser
  //       process outright.
  if (await waitForExit(proc, 2000)) {
    return;
  }

  log(
    2,
    '[browser] The browser process is still running after being closed, killing it.'
  );

  try {
    proc.kill('SIGKILL');
  } catch (error) {
    logWithStack(2, error, '[browser] Could not kill the browser process.');
  }

  if (isAlive(proc)) {
    log(
      1,
      `[browser] The browser process ${proc.pid} has still not exited after being killed.`
    );
  }
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
  // Remember the arguments so that an unexpected disconnect can relaunch the
  // browser on the same terms, and clear any deliberate-close state left from a
  // previous cycle
  if (puppeteerArgs !== undefined) {
    lastPuppeteerArgs = puppeteerArgs;
  }
  closingOnPurpose = false;

  if (browser?.connected) {
    return browser;
  }

  // NOTE: Concurrent callers must share a single launch. The pool creates
  //       several workers at once, and after a disconnect each of them finds
  //       no browser at the same moment - without this they would launch a
  //       browser each.
  if (!launchPromise) {
    launchPromise = launchBrowser(lastPuppeteerArgs).finally(() => {
      launchPromise = null;
    });
  }

  return launchPromise;
}

/**
 * Launches a Puppeteer browser instance, retrying on failure.
 *
 * @param {Array} puppeteerArgs - Additional arguments for Puppeteer launch.
 *
 * @returns {Promise<object>} A Promise resolving to the Puppeteer browser
 * instance.
 *
 * @throws {ExportError} Throws an ExportError if max retries to open a browser
 * instance are reached, or if no browser instance is found after retries.
 */
async function launchBrowser(puppeteerArgs) {
  // Get debug and other options
  const { puppeteer: puppeteerOptions, debug, other } = getOptions();

  // Get the debug options
  const { enable: enabledDebug, ...debugOptions } = debug;

  const launchOptions = {
    headless: other.browserShellMode ? 'shell' : true,
    userDataDir: puppeteerOptions.tempDir || './tmp/',
    args: puppeteerArgs,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    waitForInitialPage: false,
    defaultViewport: null,
    ...(enabledDebug && debugOptions)
  };

  const maxTries = 25;
  let tryCount = 0;

  const open = async () => {
    try {
      log(
        3,
        `[browser] Attempting to get a browser instance (try ${++tryCount}).`
      );
      browser = await puppeteer.launch(launchOptions);
    } catch (error) {
      // This isn't a full error yet as puppeteer sometimes takes time to
      // initialize properly.
      logWithStack(
        2,
        error,
        `[browser] Failed to launch a browser instance - retrying (attempt ${tryCount}/${maxTries}).`
      );

      // Retry to launch browser until reaching max attempts
      if (tryCount < maxTries) {
        log(
          3,
          `[browser] Retry to open a browser (attempt ${tryCount}/${maxTries}).`
        );
        await new Promise((response) => setTimeout(response, 4000));
        await open();
      } else {
        //... now it's an error, which is caught by the caller
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

  // Notice the browser going away, so that the pool's workers can be
  // invalidated and the browser relaunched, rather than the pool handing out
  // pages belonging to a process that no longer exists
  browser.once('disconnected', handleDisconnect);

  return browser;
}

/**
 * Closes the Puppeteer browser instance if it is connected.
 *
 * @returns {Promise<boolean>} A Promise resolving to true after the browser
 * is closed.
 */
export async function close() {
  // Mark this as intentional so the resulting disconnect is not treated as a
  // crash and does not trigger a relaunch
  closingOnPurpose = true;

  // Close the browser and make sure its process has gone, so that shutdown does
  // not leave one behind holding the user data directory
  if (browser) {
    await terminate(browser);
  }

  browser = undefined;

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
 * If the browser is not currently available it is relaunched first, so that the
 * pool can recover by itself after the browser process has gone away.
 *
 * @returns {(boolean|object)} Returns false if the browser instance is not
 * available, or a Puppeteer Page object representing the newly created page.
 */
export async function newPage() {
  // The browser may have gone away since the last page was made. Bring it back
  // rather than failing every export from here on - create() is guarded, so
  // concurrent callers share the one relaunch.
  if (!browser?.connected && !closingOnPurpose) {
    log(3, '[browser] No browser available, attempting to relaunch it.');
    await create();
  }

  if (!browser) {
    return false;
  }

  let page;

  try {
    // Create a page
    page = await browser.newPage();

    // Disable cache
    await page.setCacheEnabled(false);

    // Set the content
    await setPageContent(page);

    // Set page events
    setPageEvents(page);

    return page;
  } catch (error) {
    // NOTE: Without this, a page created above but failing any of the
    //       subsequent steps is left open forever - the caller only receives
    //       the error and never had a reference to close it. setPageContent is
    //       the likely thrower, as it injects the entire Highcharts bundle and
    //       so is sensitive to a CPU starved instance. That matters because on
    //       a sustained create failure tarn retries every
    //       createRetryInterval (200ms by default), which would leak another
    //       browser tab on every attempt.
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch (closeError) {
        logWithStack(
          2,
          closeError,
          '[browser] Could not close a page that failed to be set up.'
        );
      }
    }

    throw error;
  }
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
    if (page && !page.isClosed()) {
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
      return true;
    }
  } catch (error) {
    logWithStack(
      2,
      error,
      '[browser] Could not clear the content of the page.'
    );
  }

  return false;
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
    logWithStack(2, error, `[browser] Could not clear page's resources.`);
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
    // It would seem like this may fire at the same time or shortly before
    // a page is closed.
    if (page.isClosed()) {
      return;
    }

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
  getGeneration,
  isConnected,
  create,
  close,
  newPage,
  clearPage,
  addPageResources,
  clearPageResources
};
