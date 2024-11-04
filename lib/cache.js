/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { isAbsolute, join } from 'path';

import { HttpsProxyAgent } from 'https-proxy-agent';

import { getOptions } from './config.js';
import { fetch } from './fetch.js';
import { log } from './logger.js';
import { __dirname } from './utils.js';

import ExportError from './errors/ExportError.js';

// The initial cache template
const cache = {
  cdnUrl: 'https://code.highcharts.com',
  activeManifest: {},
  sources: '',
  hcVersion: ''
};

/**
 * Checks the cache for Highcharts dependencies, updates the cache if needed,
 * and loads the sources.
 *
 * @param {Object} highchartsOptions - Object containing highcharts options.
 * @param {Object} serverProxyOptions - Object containing server options.
 *
 * @returns {Promise<void>} A Promise that resolves once the cache is checked
 * and updated.
 *
 * @throws {ExportError} Throws an ExportError if there is an issue updating
 * or reading the cache.
 */
export async function checkAndUpdateCache(
  highchartsOptions,
  serverProxyOptions
) {
  let fetchedModules;

  // Get the cache path
  const cachePath = getCachePath();

  // Prepare paths to manifest and sources from the .cache folder
  const manifestPath = join(cachePath, 'manifest.json');
  const sourcePath = join(cachePath, 'sources.js');

  // Create the cache destination if it doesn't exist already
  !existsSync(cachePath) && mkdirSync(cachePath, { recursive: true });

  // Fetch all the scripts either if manifest.json does not exist
  // or if the forceFetch option is enabled
  if (!existsSync(manifestPath) || highchartsOptions.forceFetch) {
    log(3, '[cache] Fetching and caching Highcharts dependencies.');
    fetchedModules = await _updateCache(
      highchartsOptions,
      serverProxyOptions,
      sourcePath
    );
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

    const { coreScripts, moduleScripts, indicatorScripts } = highchartsOptions;
    const numberOfModules =
      coreScripts.length + moduleScripts.length + indicatorScripts.length;

    // Compare the loaded highcharts config with the contents in cache.
    // If there are changes, fetch requested modules and products,
    // and bake them into a giant blob. Save the blob.
    if (manifest.version !== highchartsOptions.version) {
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
      fetchedModules = await _updateCache(
        highchartsOptions,
        serverProxyOptions,
        sourcePath
      );
    } else {
      log(3, '[cache] Dependency cache is up to date, proceeding.');

      // Load the sources
      cache.sources = readFileSync(sourcePath, 'utf8');

      // Get current modules map
      fetchedModules = manifest.modules;

      // Extract and save version of currently used Highcharts
      cache.hcVersion = extractVersion(cache.sources);
    }
  }

  // Finally, save the new manifest, which is basically our current config
  // in a slightly different format
  await _saveConfigToManifest(highchartsOptions, fetchedModules);
}

/**
 * Gets the version of Highcharts from the cache.
 *
 * @returns {string} The cached Highcharts version.
 */
export function getHighchartsVersion() {
  return cache.hcVersion;
}

/**
 * Updates the Highcharts version in the applied configuration and checks
 * the cache for the new version.
 *
 * @param {string} newVersion - The new Highcharts version to be applied.
 *
 * @returns {Promise<(Object|boolean)>} A Promise resolving to the updated
 * configuration with the new version, or false if no applied configuration
 * exists.
 */
export async function updateHighchartsVersion(newVersion) {
  // Get the reference to the global options to update to the new version
  const options = getOptions(true);

  // Set to the new version
  options.highcharts.version = newVersion;

  // Check if cache needs to be updated
  await checkAndUpdateCache(options.highcharts, options.server.proxy);
}

/**
 * Extracts Highcharts version from the cache's sources string.
 *
 * @param {Object} cacheSources - The cache sources object.
 *
 * @returns {string} The extracted Highcharts version.
 */
export function extractVersion(cacheSources) {
  return cacheSources
    .substring(0, cacheSources.indexOf('*/'))
    .replace('/*', '')
    .replace('*/', '')
    .replace(/\n/g, '')
    .trim();
}

/**
 * Extracts the Highcharts module name based on the scriptPath.
 *
 * @param {string} scriptPath - The path of the script from which the module
 * name will be extracted.
 *
 * @returns {string} The extracted module name.
 */
export function extractModuleName(scriptPath) {
  return scriptPath.replace(
    /(.*)\/|(.*)modules\/|stock\/(.*)indicators\/|maps\/(.*)modules\//gi,
    ''
  );
}

/**
 * Retrieves the current cache object.
 *
 * @returns {Object} The cache object containing various cached data.
 */
export function getCache() {
  return cache;
}

/**
 * Gets the cache path for Highcharts.
 *
 * @returns {string} The path to the cache directory for Highcharts.
 */
export function getCachePath() {
  const cachePathOption = getOptions().highcharts.cachePath;

  // Issue #562: support for absolute paths
  return isAbsolute(cachePathOption)
    ? cachePathOption
    : join(__dirname, cachePathOption);
}

/**
 * Fetches a single script and updates the `fetchedModules` accordingly.
 *
 * @param {string} script - A path to script to get.
 * @param {Object} requestOptions - Additional options for the proxy agent
 * to use for a request.
 * @param {Object} fetchedModules - An object which tracks which Highcharts
 * modules have been fetched.
 * @param {boolean} [shouldThrowError=false] - A flag to indicate if the error
 * should be thrown. This should be used only for the core scripts.
 *
 * @returns {Promise<string>} A Promise resolving to the text representation
 * of the fetched script.
 *
 * @throws {ExportError} Throws an `ExportError` if there is a problem with
 * fetching the script.
 */
async function _fetchAndProcessScript(
  script,
  requestOptions,
  fetchedModules,
  shouldThrowError = false
) {
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
      `Could not fetch the ${script}.js. The script might not exist in the requested version (status code: ${response.statusCode}).`,
      500
    ).setError(response);
  } else {
    log(
      2,
      `[cache] Could not fetch the ${script}.js. The script might not exist in the requested version.`
    );
  }

  return '';
}

/**
 * Saves the provided configuration and fetched modules to the cache manifest
 * file.
 *
 * @param {Object} highchartsOptions - Highcharts-related configuration object.
 * @param {Object} [fetchedModules={}] - An object that contains mapped names of
 * fetched Highcharts modules to use.
 *
 * @throws {ExportError} Throws an ExportError if an error occurs while writing
 * the cache manifest.
 */
async function _saveConfigToManifest(highchartsOptions, fetchedModules = {}) {
  const newManifest = {
    version: highchartsOptions.version,
    modules: fetchedModules
  };

  // Update cache object with the current modules
  cache.activeManifest = newManifest;

  log(3, '[cache] Writing a new manifest.');
  try {
    writeFileSync(
      join(getCachePath(), 'manifest.json'),
      JSON.stringify(newManifest),
      'utf8'
    );
  } catch (error) {
    throw new ExportError(
      '[cache] Error writing the cache manifest.',
      400
    ).setError(error);
  }
}

/**
 * Fetches Highcharts scripts and customScripts from the given CDNs.
 *
 * @param {string} coreScripts - Array of Highcharts core scripts to fetch.
 * @param {string} moduleScripts - Array of Highcharts modules to fetch.
 * @param {string} customScripts - Array of custom script paths to fetch
 * (full URLs).
 * @param {Object} proxyOptions - Options for the proxy agent to use for
 * a request.
 * @param {Object} fetchedModules - An object which tracks which Highcharts
 * modules have been fetched.
 *
 * @returns {Promise<string>} The fetched scripts content joined.
 */
async function _fetchScripts(
  coreScripts,
  moduleScripts,
  customScripts,
  proxyOptions,
  fetchedModules
) {
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
      throw new ExportError(
        '[cache] Could not create a Proxy Agent.',
        500
      ).setError(error);
    }
  }

  // If exists, add proxy agent to request options
  const requestOptions = proxyAgent
    ? {
        agent: proxyAgent,
        timeout: proxyOptions.timeout
      }
    : {};

  const allFetchPromises = [
    ...coreScripts.map((script) =>
      _fetchAndProcessScript(`${script}`, requestOptions, fetchedModules, true)
    ),
    ...moduleScripts.map((script) =>
      _fetchAndProcessScript(`${script}`, requestOptions, fetchedModules)
    ),
    ...customScripts.map((script) =>
      _fetchAndProcessScript(`${script}`, requestOptions)
    )
  ];

  const fetchedScripts = await Promise.all(allFetchPromises);
  return fetchedScripts.join(';\n');
}

/**
 * Updates the local cache with Highcharts scripts and their versions.
 *
 * @param {Object} highchartsOptions - Object containing Highcharts options.
 * @param {Object} serverProxyOptions - Object containing server proxy options.
 * @param {string} sourcePath - The path to the source file in the cache.
 *
 * @returns {Promise<Object>} A Promise resolving to an object representing
 * the fetched modules.
 *
 * @throws {ExportError} Throws an ExportError if there is an issue updating
 * the local Highcharts cache.
 */
async function _updateCache(highchartsOptions, serverProxyOptions, sourcePath) {
  // Get Highcharts version for scripts
  const hcVersion =
    highchartsOptions.version === 'latest'
      ? ''
      : `${highchartsOptions.version}`;

  // Get the CDN url for scripts
  const cdnUrl = highchartsOptions.cdnUrl || cache.cdnUrl;

  try {
    const fetchedModules = {};

    log(
      3,
      `[cache] Updating cache version to Highcharts: ${hcVersion || 'latest'}.`
    );

    cache.sources = await _fetchScripts(
      [
        ...highchartsOptions.coreScripts.map(
          (c) => `${cdnUrl}/${hcVersion}/${c}`
        )
      ],
      [
        ...highchartsOptions.moduleScripts.map((m) =>
          m === 'map'
            ? `${cdnUrl}/maps/${hcVersion}/modules/${m}`
            : `${cdnUrl}/${hcVersion}/modules/${m}`
        ),
        ...highchartsOptions.indicatorScripts.map(
          (i) => `${cdnUrl}/stock/${hcVersion}/indicators/${i}`
        )
      ],
      highchartsOptions.customScripts,
      serverProxyOptions,
      fetchedModules
    );

    // Extract and save version of currently used Highcharts
    cache.hcVersion = extractVersion(cache.sources);

    // Save the fetched modules into caches' source JSON
    writeFileSync(sourcePath, cache.sources);
    return fetchedModules;
  } catch (error) {
    throw new ExportError(
      '[cache] Unable to update the local Highcharts cache.',
      500
    ).setError(error);
  }
}

export default {
  checkAndUpdateCache,
  getHighchartsVersion,
  updateHighchartsVersion,
  extractVersion,
  extractModuleName,
  getCache,
  getCachePath
};
