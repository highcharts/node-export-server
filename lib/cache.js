/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview The cache manager is responsible for handling and managing
 * the Highcharts library along with its dependencies. It ensures that these
 * resources are stored and retrieved efficiently to optimize performance
 * and reduce redundant network requests. The cache is stored in the `.cache`
 * directory by default, which serves as a dedicated folder for keeping cached
 * files.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { HttpsProxyAgent } from 'https-proxy-agent';

import { getOptions, updateOptions } from './config.js';
import { fetch } from './fetch.js';
import { log } from './logger.js';
import { getAbsolutePath } from './utils.js';

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
 * @async
 * @function checkAndUpdateCache
 *
 * @param {Object} highchartsOptions - The configuration object containing
 * `highcharts` options.
 * @param {Object} serverProxyOptions- The configuration object containing
 * `server.proxy` options.
 */
export async function checkAndUpdateCache(
  highchartsOptions,
  serverProxyOptions
) {
  try {
    let fetchedModules;

    // Get the cache path
    const cachePath = getCachePath();

    // Prepare paths to manifest and sources from the cache folder
    const manifestPath = join(cachePath, 'manifest.json');
    const sourcePath = join(cachePath, 'sources.js');

    // Create the cache destination if it doesn't exist already
    !existsSync(cachePath) && mkdirSync(cachePath, { recursive: true });

    // Fetch all the scripts either if the `manifest.json` does not exist
    // or if the `forceFetch` option is enabled
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
      const manifest = JSON.parse(readFileSync(manifestPath), 'utf8');

      // Check if the modules is an array, if so, we rewrite it to a map to make
      // it easier to resolve modules.
      if (manifest.modules && Array.isArray(manifest.modules)) {
        const moduleMap = {};
        manifest.modules.forEach((m) => (moduleMap[m] = 1));
        manifest.modules = moduleMap;
      }

      // Get the actual number of scripts to be fetched
      const { coreScripts, moduleScripts, indicatorScripts } =
        highchartsOptions;
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
      } else if (
        Object.keys(manifest.modules || {}).length !== numberOfModules
      ) {
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

      // Update cache if needed
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
  } catch (error) {
    throw new ExportError(
      '[cache] Could not configure cache and create or update the config manifest.',
      500
    ).setError(error);
  }
}

/**
 * Gets the version of Highcharts from the cache.
 *
 * @function getHighchartsVersion
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
 * @async
 * @function updateHighchartsVersion
 *
 * @param {string} newVersion - The new Highcharts version to be applied.
 */
export async function updateHighchartsVersion(newVersion) {
  // Update to the new version
  const options = updateOptions({
    highcharts: {
      version: newVersion
    }
  });

  // Check if cache needs to be updated
  await checkAndUpdateCache(options.highcharts, options.server.proxy);
}

/**
 * Extracts Highcharts version from the cache's sources string.
 *
 * @function extractVersion
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
 * @function extractModuleName
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
 * @function getCache
 *
 * @returns {Object} The cache object containing various cached data.
 */
export function getCache() {
  return cache;
}

/**
 * Gets the cache path for Highcharts.
 *
 * @function getCachePath
 *
 * @returns {string} The absolute path to the cache directory for Highcharts.
 */
export function getCachePath() {
  return getAbsolutePath(getOptions().highcharts.cachePath, 'utf8'); // #562
}

/**
 * Fetches a single script and updates the `fetchedModules` accordingly.
 *
 * @async
 * @function _fetchAndProcessScript
 *
 * @param {string} script - A path to script to get.
 * @param {Object} requestOptions - Additional options for the proxy agent
 * to use for a request.
 * @param {Object} fetchedModules - An object which tracks which Highcharts
 * modules have been fetched.
 * @param {boolean} [shouldThrowError=false] - A flag to indicate if the error
 * should be thrown. This should be used only for the core scripts. The default
 * value is `false`.
 *
 * @returns {Promise<string>} A Promise that resolves to the text representation
 * of the fetched script.
 *
 * @throws {ExportError} Throws an `ExportError` if there is a problem
 * with fetching the script.
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

  // Based on the `shouldThrowError` flag, decide how to serve error message
  if (shouldThrowError) {
    throw new ExportError(
      `[cache] Could not fetch the ${script}.js. The script might not exist in the requested version (status code: ${response.statusCode}).`,
      404
    ).setError(response);
  } else {
    log(
      2,
      `[cache] Could not fetch the ${script}.js. The script might not exist in the requested version.`
    );
  }
}

/**
 * Saves the provided configuration and fetched modules to the cache manifest
 * file.
 *
 * @async
 * @function _saveConfigToManifest
 *
 * @param {Object} highchartsOptions - The configuration object containing
 * `highcharts` options.
 * @param {Object} [fetchedModules={}] - An object which tracks which Highcharts
 * modules have been fetched. The default value is an empty object.
 *
 * @throws {ExportError} Throws an `ExportError` if an error occurs while
 * writing the cache manifest.
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
      500
    ).setError(error);
  }
}

/**
 * Fetches Highcharts `scripts` and `customScripts` from the given CDNs.
 *
 * @async
 * @function _fetchScripts
 *
 * @param {Array.<string>} coreScripts - Highcharts core scripts to fetch.
 * @param {Array.<string>} moduleScripts - Highcharts modules to fetch.
 * @param {Array.<string>} customScripts - Custom script paths to fetch (full
 * URLs).
 * @param {Object} serverProxyOptions - The configuration object containing
 * `server.proxy` options.
 * @param {Object} fetchedModules - An object which tracks which Highcharts
 * modules have been fetched.
 *
 * @returns {Promise<string>} A Promise that resolves to the fetched scripts
 * content joined.
 *
 * @throws {ExportError} Throws an `ExportError` if an error occurs while
 * setting an HTTP Agent for proxy.
 */
async function _fetchScripts(
  coreScripts,
  moduleScripts,
  customScripts,
  serverProxyOptions,
  fetchedModules
) {
  // Configure proxy if exists
  let proxyAgent;
  const proxyHost = serverProxyOptions.host;
  const proxyPort = serverProxyOptions.port;

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
        timeout: serverProxyOptions.timeout
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
 * @async
 * @function _updateCache
 *
 * @param {Object} highchartsOptions - The configuration object containing
 * `highcharts` options.
 * @param {Object} serverProxyOptions - The configuration object containing
 * `server.proxy` options.
 * @param {string} sourcePath - The path to the source file in the cache.
 *
 * @returns {Promise<Object>} A Promise that resolves to an object representing
 * the fetched modules.
 *
 * @throws {ExportError} Throws an `ExportError` if there is an issue updating
 * the local Highcharts cache.
 */
async function _updateCache(highchartsOptions, serverProxyOptions, sourcePath) {
  // Get Highcharts version for scripts
  const hcVersion =
    highchartsOptions.version === 'latest'
      ? null
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
        ...highchartsOptions.coreScripts.map((c) =>
          hcVersion ? `${cdnUrl}/${hcVersion}/${c}` : `${cdnUrl}/${c}`
        )
      ],
      [
        ...highchartsOptions.moduleScripts.map((m) =>
          m === 'map'
            ? hcVersion
              ? `${cdnUrl}/maps/${hcVersion}/modules/${m}`
              : `${cdnUrl}/maps/modules/${m}`
            : hcVersion
              ? `${cdnUrl}/${hcVersion}/modules/${m}`
              : `${cdnUrl}/modules/${m}`
        ),
        ...highchartsOptions.indicatorScripts.map((i) =>
          hcVersion
            ? `${cdnUrl}/stock/${hcVersion}/indicators/${i}`
            : `${cdnUrl}/stock/indicators/${i}`
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
