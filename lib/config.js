/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

// Here we should fetch all the configuration options.
//
// We should support loading configurations either from a JSON file,
// or from environment variables.
//
// JSON files are necessary because listing modules in an env var
// is really tedious. Also, a lot of windows users have been having issues
// loading the env vars, and so they can serve as an alternative to those.
//
// The support should be stacked, that is, first load the env vars,
// then overwrite with JSON if it's provided.
//
//
// We need to consider if we're willing to break the CLI compatibility.
// If so, we should directly map the config to flags automatically.
//
//

const fs = require('fs');
const fsPromises = fs.promises;
const log = require('./logger.js').log;
const cache = require('./cache.js');

// Load .env into environment variables
require('dotenv').config();

// The active configuration
const config = {
  // Puppeteer config
  puppeteer: {
    // Args to send to puppeteer
    args: [
      // e.g.:
      // '--disable-web-security',
      // '--no-sandbox'
    ]
  },

  // Highcharts config
  highcharts: {
    // Highcharts version
    version: process.env.HIGHCHARTS_VERSION || 'latest',
    // CDN URL
    cdnURL: process.env.HIGHCHARTS_CDN || 'https://code.highcharts.com/',
    // Highcharts Modules
    modules: process.env.HIGHCHARTS_MODULES
      ? process.env.HIGHCHARTS_MODULES.split(',')
      : [
          'data',
          'funnel',
          'solid-gauge',
          'heatmap',
          'treemap',
          'sunburst',
          'xrange',
          'sankey',
          'tilemap',
          'histogram-bellcurve',
          'bullet',
          'organization',
          'funnel3d',
          'pyramid3d',
          'dependency-wheel',
          'item-series',
          'pareto',
          'coloraxis',
          'venn',
          'dumbbell',
          'lollipop',
          'wordcloud',
          'annotations',
          'series-label'
        ],
    // Additional scripts/optional dependencies (e.g. moments.js)
    scripts: [],
    // Allow code execution?
    allowCodeExecution: process.env.HIGHCHARTS_ALLOW_CODE_EXEC || false,
    // Allow file resources?
    allowFileResources: true,
    // Default width - used when exporting if the incoming width is not set
    defaultWidth: 800,
    // Default scale - used when exporting if the incoming scale is not set
    defaultScale: 1,
    // Default height - used as the initial height when exporting
    defaultHeight: 1200
  },

  // UI config @TODO: move the export.highcharts.com UI to here
  ui: {
    // Enable the exporting UI?
    enable: process.env.HIGHCHARTS_UI_ENABLE || false,
    // Route to attach the UI to
    route: process.env.HIGHCHARTS_UI_ROUTE || '/'
  },

  // Config for the server
  server: {
    enable: process.env.HIGHCHARTS_SERVER_ENABLE || true,
    port: process.env.HIGHCHARTS_SERVER_PORT || 7801,
    host: process.env.HIGHCHARTS_SERVER_HOST || '0.0.0.0',

    ssl: {
      enable: process.env.HIGHCHARTS_SERVER_SSL_ENABLE || false,
      force: process.env.HIGHCHARTS_SERVER_SSL_FORCE || false,
      port: process.env.HIGHCHARTS_SERVER_SSL_PORT || 443,
      certPath: process.env.HIGHCHARTS_SSL_CERT_PATH || ''
    },

    rateLimiting: {
      enable: process.env.HIGHCHARTS_RATE_LIMIT_ENABLE || false,
      max: process.env.HIGHCHARTS_RATE_LIMIT_MAX || 10,
      skipKey: process.env.HIGHCHARTS_RATE_LIMIT_KEY || '',
      skipToken: process.env.HIGHCHARTS_RATE_LIMIT_SKIP_TOKEN || ''
    }
  },

  // Config for the pool
  pool: {
    // How deep can the processing queue be?
    queueSize: process.env.HIGHCHARTS_POOL_QUEUE_SIZE || 5,
    // How long should we wait before timing out (in seconds)
    timeoutThreshold: process.env.HIGHCHARTS_POOL_TIMEOUT || 8,
    // How many worker threads should we spawn?
    maxWorkers: process.env.HIGHCHARTS_POOL_MAX_WORKERS || 8,
    // How many workers should initially be available?
    initialWorkers: process.env.HIGHCHARTS_POOL_MIN_WORKERS || 8,
    // How many exports can be done by a worker before it's nuked?
    workLimit: process.env.HIGHCHARTS_POOL_WORK_LIMIT || 60,
    // Should the Reaper be enabled to remove hanging processes?
    reaper: process.env.HIGHCHARTS_POOL_ENABLE_REAPER || true,
    // Should we listen to process exists?
    listenToProcessExits:
      process.env.HIGHCHARTS_POOL_LISTEN_TO_PROCESS_EXITS || true,
    // Should we anable benchmarking?
    benchmarking: process.env.HIGHCHARTS_POOL_BENCHMARKING || true
  },

  // Logging config
  logging: {
    level: process.env.HIGHCHARTS_LOG_LEVEL || 3,
    toFile: process.env.HIGHCHARTS_LOG_TO_FILE || false,
    logDestination: process.env.HIGHCHARTS_LOG_DEST || false
  }
};

// Map of flags
const flags = {};

/**
 *
 * Load configuration from JSON file.
 *
 * Not really needed with dotenv, but some of the options doesn't make sense to
 * use the env variables for, such as anything dealing with direct exporting
 * (e.g. batch, infile, resources, and so on), and in those cases it makes sense
 * to have everything in one file, e.g.
 *
 * {
 *    highcharts: {
 *      version: 'latest'
 *    },
 *    logging: {
 *      level: 4
 *    },
 *    chart: {
 *      options: { title: {text: 'Hello World!'}},
 *      constr: 'Chart',
 *      type: 'png'
 *    }
 * }
 *
 * This is also combinable with environment vars and .dotenv files,
 * so that global configuration can be set through either of those,
 * and then the loaded config simply overrides where specified.
 *
 * The chart part of the loaded config would in any case not be loaded by
 * the config manager, but by the CLI system. Flags are also applied last,
 * which means it should be possible to set global config via .env,
 * override some parts of it in a config file, set exporting properties in a
 * json file, and then load the chart options using a CLI flag.
 *
 * This solves for a lot of use cases.
 *
 */
const loadConfigFile = async (configFile) => {
  if (!configFile) {
    return true;
  }

  // Load config file, and override the loaded configuration.
  try {
    const cfile = await fsPromises.readFile(configFile);
    const cjson = JSON.parse(cfile);

    // Override each nested object to avoid accidental overwriting of defaults.
    Object.assign(config.highcharts, cjson.highcharts || {});
    Object.assign(config.logging, cjson.logging || {});
    Object.assign(config.pool, cjson.pool || {});
    Object.assign(config.server, cjson.server || {});
    Object.assign(config.ui, cjson.ui || {});
  } catch (e) {
    log(1, `config.js - unable to load config: ${e}`);
  }
};

/**
 * Flagify a configuration entry so that it can be controlled by CLI flags or
 * a flat hashmap.
 */
const flagify = (option, overriddenName, description) => {
  if (!description) {
    description = overridenName;
    overriddenName = false;
  }

  // The actual flag is the last entry in option.
  const nameArr = option.split('.');
  const name = overriddenName || nameArr[nameArr.length];

  flags[name] = {
    option,
    description
  };
};

/**
 * Apply an object containing flags to the config
 */
const applyFlagOptions = (flagsToLoad) => {
  Object.keys(flagsToLoad).forEach((flag) => {
    if (flags[flag]) {
      // Set the option

      let root = config;

      const oa = flags[flag].option.split('.');
      let i = 0;

      while (i < oa.length - 2) {
        root = root[oa[i]];
        ++i;
      }

      root[oa[oa.length - 1]] = flagsToLoad[flag];
    }
  });
};

module.exports = {
  /**
   * Load config.
   *
   * @param configFile - Optional path to a configuration.json file.
   */
  load: async (configFile) => {
    await loadConfigFile(configFile);
    await cache.checkCache(config.highcharts);
  },
  /** Flagify an option */
  flagify,
  /** Apply flag options */
  applyFlagOptions,
  /** The actual config */
  config
};
