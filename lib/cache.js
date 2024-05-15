/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// The cache manager manages the Highcharts library and its dependencies.
// The cache itself is stored in .cache, and is checked by the config system
// before starting the service

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { HttpsProxyAgent } from 'https-proxy-agent';

import { getOptions } from './config.js';
import { envs } from './envs.js';
import { fetch } from './fetch.js';
import { log } from './logger.js';
import { __dirname } from './utils.js';

import ExportError from './errors/ExportError.js';

const cache = {
  cdnURL: 'https://code.highcharts.com/',
  activeManifest: {},
  sources: '',
  hcVersion: ''
};

/**
 * Extracts and caches the Highcharts version from the sources string.
 *
 * @returns {string} The extracted Highcharts version.
 */
export const extractVersion = (cache) => {
  return cache.sources
    .substring(0, cache.sources.indexOf('*/'))
    .replace('/*', '')
    .replace('*/', '')
    .replace(/\n/g, '')
    .trim();
};

/**
 * Extracts the Highcharts module name based on the scriptPath.
 */
export const extractModuleName = (scriptPath) => {
  return scriptPath.replace(
    /(.*)\/|(.*)modules\/|stock\/(.*)indicators\/|maps\/(.*)modules\//gi,
    ''
  );
};

/**
 * Saves the provided configuration and fetched modules to the cache manifest
 * file.
 *
 * @param {object} config - Highcharts-related configuration object.
 * @param {object} fetchedModules - An object that contains mapped names of
 * fetched Highcharts modules to use.
 *
 * @throws {ExportError} Throws an ExportError if an error occurs while writing
 * the cache manifest.
 */
export const saveConfigToManifest = async (config, fetchedModules) => {
  const newManifest = {
    version: config.version,
    modules: fetchedModules || {}
  };

  // Update cache object with the current modules
  cache.activeManifest = newManifest;

  log(3, '[cache] Writing a new manifest.');
  try {
    writeFileSync(
      join(__dirname, config.cachePath, 'manifest.json'),
      JSON.stringify(newManifest),
      'utf8'
    );
  } catch (error) {
    throw new ExportError('[cache] Error writing the cache manifest.').setError(
      error
    );
  }
};

/**
 * Fetches a single script and updates the fetchedModules accordingly.
 *
 * @param {string} script - A path to script to get.
 * @param {Object} requestOptions - Additional options for the proxy agent
 * to use for a request.
 * @param {Object} fetchedModules - An object which tracks which Highcharts
 * modules have been fetched.
 * @param {boolean} shouldThrowError - A flag to indicate if the error should be
 * thrown. This should be used only for the core scripts.
 *
 * @returns {Promise<string>} A Promise resolving to the text representation
 * of the fetched script.
 *
 * @throws {ExportError} Throws an ExportError if there is a problem with
 * fetching the script.
 */
export const fetchAndProcessScript = async (
  script,
  requestOptions,
  fetchedModules,
  shouldThrowError = false
) => {
  // Get rid of the .js from the custom strings
  if (script.endsWith('.js')) {
    script = script.substring(0, script.length - 3);
  }

  log(4, `[cache] Fetching script - ${script}.js`);

  // Fetch the script
  const response = await fetch(`${script}.js`, requestOptions);

  // If OK, return its text representation
  if (response.statusCode === 200 && typeof response.text == 'string') {
    if (fetchedModules) {
      const moduleName = extractModuleName(script);
      fetchedModules[moduleName] = 1;
    }

    return response.text;
  }

  if (shouldThrowError) {
    throw new ExportError(
      `Could not fetch the ${script}.js. The script might not exist in the requested version (status code: ${response.statusCode}).`
    ).setError(response);
  } else {
    log(
      2,
      `[cache] Could not fetch the ${script}.js. The script might not exist in the requested version.`
    );
  }

  return '';
};

/**
 * Fetches Highcharts scripts and customScripts from the given CDNs.
 *
 * @param {string} coreScripts - Array of Highcharts core scripts to fetch.
 * @param {string} moduleScripts - Array of Highcharts modules to fetch.
 * @param {string} customScripts - Array of custom script paths to fetch
 * (full URLs).
 * @param {object} proxyOptions - Options for the proxy agent to use for
 * a request.
 * @param {object} fetchedModules - An object which tracks which Highcharts
 * modules have been fetched.
 *
 * @returns {Promise<string>} The fetched scripts content joined.
 */
export const fetchScripts = async (
  coreScripts,
  moduleScripts,
  customScripts,
  proxyOptions,
  fetchedModules
) => {
  // Configure proxy if exists
  let proxyAgent;
  const proxyHost = proxyOptions.host;
  const proxyPort = proxyOptions.port;

  // Try to create a Proxy Agent
  if (proxyHost && proxyPort) {
    try {
      proxyAgent = new HttpsProxyAgent({
        host: proxyHost,
        port: proxyPort
      });
    } catch (error) {
      throw new ExportError('[cache] Could not create a Proxy Agent.').setError(
        error
      );
    }
  }

  // If exists, add proxy agent to request options
  const requestOptions = proxyAgent
    ? {
        agent: proxyAgent,
        timeout: envs.SERVER_PROXY_TIMEOUT
      }
    : {};

  const allFetchPromises = [
    ...coreScripts.map((script) =>
      fetchAndProcessScript(`${script}`, requestOptions, fetchedModules, true)
    ),
    ...moduleScripts.map((script) =>
      fetchAndProcessScript(`${script}`, requestOptions, fetchedModules)
    ),
    ...customScripts.map((script) =>
      fetchAndProcessScript(`${script}`, requestOptions)
    )
  ];

  const fetchedScripts = await Promise.all(allFetchPromises);
  return fetchedScripts.join(';\n');
};

/**
 * Updates the local cache with Highcharts scripts and their versions.
 *
 * @param {Object} options - Object containing all options.
 * @param {string} sourcePath - The path to the source file in the cache.
 *
 * @returns {Promise<object>} A Promise resolving to an object representing
 * the fetched modules.
 *
 * @throws {ExportError} Throws an ExportError if there is an issue updating
 * the local Highcharts cache.
 */
export const updateCache = async (
  highchartsOptions,
  proxyOptions,
  sourcePath
) => {
  const version = highchartsOptions.version;
  const hcVersion = version === 'latest' || !version ? '' : `${version}/`;
  const cdnURL = highchartsOptions.cdnURL || cache.cdnURL;

  log(
    3,
    `[cache] Updating cache version to Highcharts: ${hcVersion || 'latest'}.`
  );

  const fetchedModules = {};
  try {
    cache.sources = await fetchScripts(
      [
        ...highchartsOptions.coreScripts.map((c) => `${cdnURL}${hcVersion}${c}`)
      ],
      [
        ...highchartsOptions.moduleScripts.map((m) =>
          m === 'map'
            ? `${cdnURL}maps/${hcVersion}modules/${m}`
            : `${cdnURL}${hcVersion}modules/${m}`
        ),
        ...highchartsOptions.indicatorScripts.map(
          (i) => `${cdnURL}stock/${hcVersion}indicators/${i}`
        )
      ],
      highchartsOptions.customScripts,
      proxyOptions,
      fetchedModules
    );

    cache.hcVersion = extractVersion(cache);

    // Save the fetched modules into caches' source JSON
    writeFileSync(sourcePath, cache.sources);
    return fetchedModules;
  } catch (error) {
    throw new ExportError(
      '[cache] Unable to update the local Highcharts cache.'
    ).setError(error);
  }
};

/**
 * Updates the Highcharts version in the applied configuration and checks
 * the cache for the new version.
 *
 * @param {string} newVersion - The new Highcharts version to be applied.
 *
 * @returns {Promise<(object|boolean)>} A Promise resolving to the updated
 * configuration with the new version, or false if no applied configuration
 * exists.
 */
export const updateVersion = async (newVersion) => {
  const options = getOptions();
  if (options?.highcharts) {
    options.highcharts.version = newVersion;
  }
  await checkAndUpdateCache(options);
};

/**
 * Checks the cache for Highcharts dependencies, updates the cache if needed,
 * and loads the sources.
 *
 * @param {Object} options - Object containing all options.
 *
 * @returns {Promise<void>} A Promise that resolves once the cache is checked
 * and updated.
 *
 * @throws {ExportError} Throws an ExportError if there is an issue updating
 * or reading the cache.
 */
export const checkAndUpdateCache = async (options) => {
  const { highcharts, server } = options;
  const cachePath = join(__dirname, highcharts.cachePath);

  let fetchedModules;
  // Prepare paths to manifest and sources from the .cache folder
  const manifestPath = join(cachePath, 'manifest.json');
  const sourcePath = join(cachePath, 'sources.js');

  // Create the cache destination if it doesn't exist already
  !existsSync(cachePath) && mkdirSync(cachePath);

  // Fetch all the scripts either if manifest.json does not exist
  // or if the forceFetch option is enabled
  if (!existsSync(manifestPath) || highcharts.forceFetch) {
    log(3, '[cache] Fetching and caching Highcharts dependencies.');
    fetchedModules = await updateCache(highcharts, server.proxy, sourcePath);
  } else {
    let requestUpdate = false;

    // Read the manifest JSON
    const manifest = JSON.parse(readFileSync(manifestPath));

    // Check if the modules is an array, if so, we rewrite it to a map to make
    // it easier to resolve modules.
    if (manifest.modules && Array.isArray(manifest.modules)) {
      const moduleMap = {};
      manifest.modules.forEach((m) => (moduleMap[m] = 1));
      manifest.modules = moduleMap;
    }

    const { coreScripts, moduleScripts, indicatorScripts } = highcharts;
    const numberOfModules =
      coreScripts.length + moduleScripts.length + indicatorScripts.length;

    // Compare the loaded highcharts config with the contents in cache.
    // If there are changes, fetch requested modules and products,
    // and bake them into a giant blob. Save the blob.
    if (manifest.version !== highcharts.version) {
      log(
        2,
        '[cache] A Highcharts version mismatch in the cache, need to re-fetch.'
      );
      requestUpdate = true;
    } else if (Object.keys(manifest.modules || {}).length !== numberOfModules) {
      log(
        2,
        '[cache] The cache and the requested modules do not match, need to re-fetch.'
      );
      requestUpdate = true;
    } else {
      // Check each module, if anything is missing refetch everything
      requestUpdate = (moduleScripts || []).some((moduleName) => {
        if (!manifest.modules[moduleName]) {
          log(
            2,
            `[cache] The ${moduleName} is missing in the cache, need to re-fetch.`
          );
          return true;
        }
      });
    }

    if (requestUpdate) {
      fetchedModules = await updateCache(highcharts, server.proxy, sourcePath);
    } else {
      log(3, '[cache] Dependency cache is up to date, proceeding.');

      // Load the sources
      cache.sources = readFileSync(sourcePath, 'utf8');

      // Get current modules map
      fetchedModules = manifest.modules;

      cache.hcVersion = extractVersion(cache);
    }
  }

  // Finally, save the new manifest, which is basically our current config
  // in a slightly different format
  await saveConfigToManifest(highcharts, fetchedModules);
};

export const getCachePath = () =>
  join(__dirname, getOptions().highcharts.cachePath);

export const getCache = () => cache;

export const highcharts = () => cache.sources;

export const version = () => cache.hcVersion;

export default {
  checkAndUpdateCache,
  getCachePath,
  updateVersion,
  getCache,
  highcharts,
  version
};
