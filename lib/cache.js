/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

/*
 * The cache manager manages the Highcharts library and its dependencies.
 *
 * The cache itself is stored in .cache, and is checked by the config system
 * before starting the service (should be refactored, but need to find the best
 * way to remain backwards compatible: one option is to let the pool init
 * deal with it)
 *
 */
const fetch = require('node-fetch');
const { join } = require('path');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');

const log = require('./logger.js').log;

const cachePath = join(__basedir, '.cache');
/// const cachePath = join(__dirname, '..', '.cache');

const cache = {
  activeManifest: {},
  sources: '',
  hcVersion: ''
};

/** Extract the highcharts version from the cache */
const extractVersion = () =>
  (cache.hcVersion = cache.sources
    .substr(0, cache.sources.indexOf('*/'))
    .replace('/*', '')
    .replace('*/', '')
    .replace(/\n/g, '')
    .trim());

/** Save the Highcharts part of a config to a manifest file in the cache */
const saveConfigToManifest = async (config) => {
  const newManifest = {
    version: config.version,
    modules: {}
  };

  // Mark used modules in the manifest
  (config.modules || []).forEach(
    (moduleName) => (newManifest.modules[moduleName] = 1)
  );

  try {
    writeFileSync(
      join(cachePath, 'manifest.json'),
      JSON.stringify(newManifest),
      'utf8'
    );
  } catch (erorr) {
    log(1, `[cache] - Error writing cache manifest: ${error}`);
  }
};

/** Fetch a single Highcharts module */
const fetchScript = async (name, cdnURL) => {
  try {
    log(4, `[cache] - Fetching Highcharts module ${name}`);

    // Only map module requires maps/ before
    if (name === 'modules/map') {
      name = 'maps/modules/map';
    }

    // Fetch the script
    const response = await fetch(cdnURL + name + '.js');

    // If OK, return its text representation
    if (response.status === 200) {
      return response.text();
    }

    throw `${response.status}`;
  } catch (error) {
    log(1, `[cache] - Error fetching module ${name}: ${error}`);
    throw error;
  }
};

/** Update the Highcharts cache */
const updateCache = async (config, sourcePath) => {
  try {
    cache.sources = (
      await Promise.all(
        [fetchScript('highcharts', config.cdnURL)].concat(
          config.modules.map((moduleName) =>
            fetchScript('modules/' + moduleName, config.cdnURL)
          )
        )
      )
    ).join(';\n');
    extractVersion();

    // Save the fetched modules into caches' source JSON
    writeFileSync(sourcePath, cache.sources);
  } catch (e) {
    log(1, '[cache] - Unable to update local Highcharts cache');
  }
};

/** Fetch any missing Highcharts and dependencies */
const checkCache = async (config) => {
  // Prepare paths to manifest and sources from the .cache folder
  const manifestPath = join(cachePath, 'manifest.json');
  const sourcePath = join(cachePath, 'sources.js');

  // Create the .cache destination if it doesn't exist already
  !existsSync(cachePath) && mkdirSync(cachePath);

  // Load the .cache manifest
  if (existsSync(manifestPath)) {
    let requestUpdate = false;

    // Read the manifest JSON
    const manifest = require(manifestPath);

    // Compare the loaded config with the contents in .cache.
    // If there are changes, fetch requested modules and products,
    // and bake them into a giant blob. Save the blob.
    if (manifest.version !== config.version) {
      log(
        3,
        '[cache] - Highcharts version mismatch in cache, need to re-fetch'
      );
      requestUpdate = true;
    } else if (
      Object.keys(manifest.modules || {}).length !== config.modules.length
    ) {
      log(
        3,
        '[cache] - The cache modules and requested modules does not match, need to re-fetch'
      );
      requestUpdate = true;
    } else {
      // Check each module, if anything is missing refetch everything
      requestUpdate = config.modules.some((moduleName) => {
        if (!manifest.modules[moduleName]) {
          log(
            3,
            `[cache] - The ${moduleName} missing in cache, need to re-fetch`
          );
          return true;
        }
      });
    }

    if (requestUpdate) {
      await updateCache(config, sourcePath);
    } else {
      log(3, '[cache] - Dependency cache is up to date, proceeding');

      // Load the sources
      cache.sources = readFileSync(sourcePath, 'utf8');
      extractVersion();
    }
  } else {
    // So we don't have one yet, which means we need to fetch everything
    log(3, '[cache] - Fetching and caching Highcharts dependencies');
    await updateCache(config, sourcePath);
  }

  // Finally, save the new manifest, which is basically our current config
  // in a slightly different format
  await saveConfigToManifest(config);
};

module.exports = {
  checkCache,
  highcharts: () => cache.sources,
  version: () => cache.hcVersion
};
