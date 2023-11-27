/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// The cache manager manages the Highcharts library and its dependencies.
// The cache itself is stored in .cache, and is checked by the config system
// before starting the service

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import dotenv from 'dotenv';
import HttpsProxyAgent from 'https-proxy-agent';
import { fetch } from './fetch.js';

import { log } from './logger.js';
import { __dirname } from '../lib/utils.js';

dotenv.config();

const cachePath = join(__dirname, '.cache');

const cache = {
  cdnURL: 'https://code.highcharts.com/',
  activeManifest: {},
  sources: '',
  hcVersion: ''
};

// TODO: The config should be accesssible globally so we don't have to do this sort of thing..
let appliedConfig = false;

/**
 * Extracts the Highcharts version from the cache
 */
const extractVersion = () =>
  (cache.hcVersion = cache.sources
    .substr(0, cache.sources.indexOf('*/'))
    .replace('/*', '')
    .replace('*/', '')
    .replace(/\n/g, '')
    .trim());

/**
 * Saves the Highcharts part of a config to a manifest file in the cache
 *
 * @param {object} config - Highcharts related configuration object.
 * @param {object} fetchedModules - An object that contains mapped names of
 * fetched Highcharts modules to use.
 */
const saveConfigToManifest = async (config, fetchedModules) => {
  const newManifest = {
    version: config.version,
    modules: fetchedModules || {}
  };

  // Update cache object with the current modules
  cache.activeManifest = newManifest;

  log(4, '[cache] writing new manifest');

  try {
    writeFileSync(
      join(cachePath, 'manifest.json'),
      JSON.stringify(newManifest),
      'utf8'
    );
  } catch (error) {
    log(1, `[cache] Error writing cache manifest: ${error}.`);
  }
};

/**
 * Fetches a single script.
 *
 * @param {string} script - A path to script to get.
 * @param {object} proxyAgent - The proxy agent to use for a request.
 */
const fetchScript = async (script, proxyAgent) => {
  try {
    // Get rid of the .js from the custom strings
    if (script.endsWith('.js')) {
      script = script.substring(0, script.length - 3);
    }

    log(4, `[cache] Fetching script - ${script}.js`);

    // If exists, add proxy agent to request options
    const requestOptions = proxyAgent
      ? {
          agent: proxyAgent,
          timeout: +process.env['PROXY_SERVER_TIMEOUT'] || 5000
        }
      : {};

    // Fetch the script
    const response = await fetch(`${script}.js`, requestOptions);

    // If OK, return its text representation
    if (response.statusCode === 200) {
      return response.text;
    }

    throw `${response.statusCode}`;
  } catch (error) {
    log(1, `[cache] Error fetching script ${script}.js: ${error}.`);
    throw error;
  }
};

/**
 * Updates the Highcharts cache.
 *
 * @param {object} config - Highcharts related configuration object.
 * @param {string} sourcePath - A path to the file where save updated sources.
 * @return {object} An object that contains mapped names of fetched Highcharts
 * modules to use.
 */
const updateCache = async (config, sourcePath) => {
  const { coreScripts, modules, indicators, scripts: customScripts } = config;
  const hcVersion =
    config.version === 'latest' || !config.version ? '' : `${config.version}/`;

  log(3, '[cache] Updating cache to Highcharts ', hcVersion);

  // Gather all scripts to fetch
  const allScripts = [
    ...coreScripts.map((c) => `${hcVersion}${c}`),
    ...modules.map((m) =>
      m === 'map' ? `maps/${hcVersion}modules/${m}` : `${hcVersion}modules/${m}`
    ),
    ...indicators.map((i) => `stock/${hcVersion}indicators/${i}`)
  ];

  // Configure proxy if exists
  let proxyAgent;
  const proxyHost = process.env['PROXY_SERVER_HOST'];
  const proxyPort = process.env['PROXY_SERVER_PORT'];

  if (proxyHost && proxyPort) {
    proxyAgent = new HttpsProxyAgent({
      host: proxyHost,
      port: +proxyPort
    });
  }

  const fetchedModules = {};
  try {
    cache.sources = // TODO: convert to for loop
      (
        await Promise.all([
          ...allScripts.map(async (script) => {
            const text = await fetchScript(
              `${config.cdnURL || cache.cdnURL}${script}`,
              proxyAgent
            );

            // If fetched correctly, set it
            if (typeof text === 'string') {
              fetchedModules[
                script.replace(
                  /(.*)\/|(.*)modules\/|stock\/(.*)indicators\/|maps\/(.*)modules\//gi,
                  ''
                )
              ] = 1;
            }

            return text;
          }),
          ...customScripts.map((script) => fetchScript(script, proxyAgent))
        ])
      ).join(';\n');
    extractVersion();

    // Save the fetched modules into caches' source JSON
    writeFileSync(sourcePath, cache.sources);
    return fetchedModules;
  } catch (error) {
    log(1, '[cache] Unable to update local Highcharts cache.');
  }
};

export const updateVersion = async (newVersion) =>
  appliedConfig
    ? await checkCache(
        Object.assign(appliedConfig, {
          version: newVersion
        })
      )
    : false;

/**
 * Fetches any missing Highcharts and dependencies
 *
 * @param {object} config - Highcharts related configuration object.
 */
export const checkCache = async (config) => {
  let fetchedModules;
  // Prepare paths to manifest and sources from the .cache folder
  const manifestPath = join(cachePath, 'manifest.json');
  const sourcePath = join(cachePath, 'sources.js');

  // TODO: deal with trying to switch to the running version
  // const activeVersion = appliedConfig ? appliedConfig.version : false;

  appliedConfig = config;

  // Create the .cache destination if it doesn't exist already
  !existsSync(cachePath) && mkdirSync(cachePath);

  // Fetch all the scripts either if manifest.json does not exist
  // or if the forceFetch option is enabled
  if (!existsSync(manifestPath) || config.forceFetch) {
    log(3, '[cache] Fetching and caching Highcharts dependencies.');
    fetchedModules = await updateCache(config, sourcePath);
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

    const { modules, coreScripts, indicators } = config;
    const numberOfModules =
      modules.length + coreScripts.length + indicators.length;

    // Compare the loaded config with the contents in .cache.
    // If there are changes, fetch requested modules and products,
    // and bake them into a giant blob. Save the blob.
    if (manifest.version !== config.version) {
      log(3, '[cache] Highcharts version mismatch in cache, need to re-fetch.');
      requestUpdate = true;
    } else if (Object.keys(manifest.modules || {}).length !== numberOfModules) {
      log(
        3,
        '[cache] Cache and requested modules does not match, need to re-fetch.'
      );
      requestUpdate = true;
    } else {
      // Check each module, if anything is missing refetch everything
      requestUpdate = (config.modules || []).some((moduleName) => {
        if (!manifest.modules[moduleName]) {
          log(
            3,
            `[cache] The ${moduleName} missing in cache, need to re-fetch.`
          );
          return true;
        }
      });
    }

    if (requestUpdate) {
      fetchedModules = await updateCache(config, sourcePath);
    } else {
      log(3, '[cache] Dependency cache is up to date, proceeding.');

      // Load the sources
      cache.sources = readFileSync(sourcePath, 'utf8');

      // Get current modules map
      fetchedModules = manifest.modules;
      extractVersion();
    }
  }

  // Finally, save the new manifest, which is basically our current config
  // in a slightly different format
  await saveConfigToManifest(config, fetchedModules);
};

export default {
  checkCache,
  updateVersion,
  getCache: () => cache,
  highcharts: () => cache.sources,
  version: () => cache.hcVersion
};
