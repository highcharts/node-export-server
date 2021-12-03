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

const fs = require('fs');
const { join } = require('path');
const fetch = require('node-fetch');
const log = require('./logger.js').log;

const fsPromises = fs.promises;
//// const cachePath = join(__basedir, '.cache');__dirname, '..'
///
const cachePath = join(__dirname, '..', '.cache');
///

let manifestPath;
let sourcePath;

const cache = {
  activeManifest: {},
  sources: '',
  hcVersion: ''
};

/** Create the cache folder if it doesn't exist already */
const createCacheDest = () => {
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath);
  }
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

  (config.modules || []).forEach((m) => (newManifest.modules[m] = 1));

  try {
    await fsPromises.writeFile(
      join(cachePath, 'manifest.json'),
      JSON.stringify(newManifest),
      'utf8'
    );
  } catch (e) {
    log(1, `cache.js - error writing cache manifest: ${e}`);
  }
};

/** Fetch a single Highcharts module */
const fetchScript = async (name, cdnURL) => {
  try {
    log(4, `cache.js - fetching Highcharts module ${name}`);
    const res = await fetch(cdnURL + name + '.js');

    if (res.status === 200) {
      return res.text();
    }

    throw `${res.status}`;
  } catch (e) {
    log(1, `cache.js - error fetching module ${name}: ${e}`);
    throw e;
  }
};

/** Update the Highcharts cache */
const updateCache = async (config) => {
  try {
    const sources = await Promise.all(
      [fetchScript('highcharts', config.cdnURL)].concat(
        config.modules.map((m) => fetchScript('modules/' + m, config.cdnURL))
      )
    );

    cache.sources = sources.join(';\n');
    extractVersion();

    await fsPromises.writeFile(sourcePath, cache.sources);
  } catch (e) {
    log(1, 'cache.js - unable to update local Highcharts cache!');
  }
};

/** Fetch any missing Highcharts and dependencies */
const checkCache = async (config) => {
  // Prepare paths to manifest and sources from the .cache folder.
  manifestPath = join(cachePath, 'manifest.json');
  sourcePath = join(cachePath, 'sources.js');

  // Create the .cache destination if it doesn't exist already.
  createCacheDest();

  // Load the .cache manifest.
  if (fs.existsSync(manifestPath)) {
    let requestUpdate = false;
    const manifest = require(manifestPath);

    // Compare the loaded config with the contents in .cache.
    // If there are changes, fetch requested modules and products,
    // and bake them into a giant blob. Save the blob.
    if (manifest.version !== config.version) {
      log(3, 'cache.js - Highcharts version mismatch in cache, re-fetching');
      requestUpdate = true;
    } else if (
      Object.keys(manifest.modules || {}).length !== config.modules.length
    ) {
      log(
        3,
        'cache.js - cache modules and requested modules does not match, refetching'
      );
      requestUpdate = true;
    } else {
      // Check each module, if anything is missing refetch everything.
      config.modules.some((m) => {
        if (!manifest.modules[m]) {
          log(3, `cache.js - ${m} missing in cache, re-fetching`);
          requestUpdate = true;
          return true;
        }
      });
    }

    if (requestUpdate) {
      await updateCache(config);
    } else {
      log(3, 'cache.js - dependency cache is up to date, proceeding');
      // Load the sources.
      cache.sources = await fsPromises.readFile(sourcePath, 'utf8');
      extractVersion();
    }
  } else {
    // So we don't have one yet, which means we need to fetch everything.
    log(3, 'cache.js - fetching & caching Highcharts dependencies');
    await updateCache(config);
  }

  // Finally, save the new manifest, which is basically our current config
  // in a slightly different format.
  await saveConfigToManifest(config);
};

module.exports = {
  checkCache,
  updateCache,
  createCacheDest,
  highcharts: () => cache.sources,
  version: () => cache.hcVersion
};
