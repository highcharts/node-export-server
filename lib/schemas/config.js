/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// Load .env into environment variables
import dotenv from 'dotenv';

dotenv.config();

// This is the configuration object with all options and their default values,
// also from the .env file if one exists
export const defaultConfig = {
  puppeteer: {
    args: {
      value: [],
      type: 'string[]',
      description: 'Array of arguments to send to puppeteer.'
    }
  },
  highcharts: {
    version: {
      value: 'latest',
      envLink: 'HIGHCHARTS_VERSION',
      type: 'string',
      description: 'Highcharts version to use.'
    },
    cdnURL: {
      value: 'https://code.highcharts.com/',
      envLink: 'HIGHCHARTS_CDN_URL',
      type: 'string',
      description: 'Highcharts CDN URL of scripts to be used'
    },
    coreScripts: {
      envLink: 'HIGHCHARTS_CORE_SCRIPTS',
      value: ['highcharts', 'highcharts-more', 'highcharts-3d'],
      type: 'string[]',
      description: 'Highcharts core scripts to fetch.'
    },
    modules: {
      envLink: 'HIGHCHARTS_MODULES',
      value: [
        'stock',
        'map',
        'gantt',
        'exporting',
        'export-data',
        'parallel-coordinates',
        'accessibility',
        'annotations-advanced',
        'boost-canvas',
        'boost',
        'data',
        'data-tools',
        'draggable-points',
        'static-scale',
        'broken-axis',
        'heatmap',
        'tilemap',
        'tiledwebmap',
        'timeline',
        'treemap',
        'treegraph',
        'item-series',
        'drilldown',
        'histogram-bellcurve',
        'bullet',
        'funnel',
        'funnel3d',
        'geoheatmap',
        'pyramid3d',
        'networkgraph',
        'overlapping-datalabels',
        'pareto',
        'pattern-fill',
        'pictorial',
        'price-indicator',
        'sankey',
        'arc-diagram',
        'dependency-wheel',
        'series-label',
        'solid-gauge',
        'sonification',
        'stock-tools',
        'streamgraph',
        'sunburst',
        'variable-pie',
        'variwide',
        'vector',
        'venn',
        'windbarb',
        'wordcloud',
        'xrange',
        'no-data-to-display',
        'drag-panes',
        'debugger',
        'dumbbell',
        'lollipop',
        'cylinder',
        'organization',
        'dotplot',
        'marker-clusters',
        'hollowcandlestick',
        'heikinashi',
        'flowmap'
      ],
      type: 'string[]',
      description: 'Highcharts modules to fetch.'
    },
    indicators: {
      envLink: 'HIGHCHARTS_INDICATORS',
      value: ['indicators-all'],
      type: 'string[]',
      description: 'Highcharts indicators to fetch.'
    },
    scripts: {
      value: [
        'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.34/moment-timezone-with-data.min.js'
      ],
      type: 'string[]',
      description:
        'Additional direct scripts/optional dependencies (e.g. moment.js).'
    },
    forceFetch: {
      envLink: 'HIGHCHARTS_FORCE_FETCH',
      value: false,
      type: 'boolean',
      description:
        'The flag that determines whether to refetch all scripts after each server rerun.'
    }
  },
  export: {
    infile: {
      value: false,
      type: 'string',
      description:
        'The input file should include a name and a type (json or svg) and must be a correctly formatted JSON or SVG file.'
    },
    instr: {
      value: false,
      type: 'string',
      description:
        'An input in a form of a stringified JSON or SVG file. Overrides the --infile.'
    },
    options: {
      value: false,
      type: 'string',
      description: 'An alias for the --instr option.'
    },
    outfile: {
      value: false,
      type: 'string',
      description:
        'The output filename, accompanied by a type (jpeg, png, pdf, or svg). Ignores the --type flag.'
    },
    type: {
      envLink: 'EXPORT_TYPE',
      value: 'png',
      type: 'string',
      description:
        'The format of the file to export to. Can be jpeg, png, pdf or svg.'
    },
    constr: {
      envLink: 'EXPORT_CONSTR',
      value: 'chart',
      type: 'string',
      description:
        'The constructor to use. Can be chart, stockChart, mapChart or ganttChart.'
    },
    defaultHeight: {
      envLink: 'EXPORT_DEFAULT_HEIGHT',
      value: 400,
      type: 'number',
      description:
        'The default height of the exported chart. Used when not found any value set.'
    },
    defaultWidth: {
      envLink: 'EXPORT_DEFAULT_WIDTH',
      value: 600,
      type: 'number',
      description:
        'The default width of the exported chart. Used when not found any value set.'
    },
    defaultScale: {
      envLink: 'EXPORT_DEFAULT_SCALE',
      value: 1,
      type: 'number',
      description:
        'The default scale of the exported chart. Ranges between 0.1 and 5.'
    },
    height: {
      type: 'number',
      value: false,
      description:
        'The height of the exported chart. Overrides the option in the chart settings.'
    },
    width: {
      type: 'number',
      value: false,
      description:
        'The width of the exported chart. Overrides the option in the chart settings.'
    },
    scale: {
      value: false,
      type: 'number',
      description:
        'The scale of the exported chart. Ranges between 0.1 and 5.0.'
    },
    globalOptions: {
      value: false,
      type: 'string',
      description:
        'Either a stringified JSON or a filename containing options to be passed into the Highcharts.setOptions.'
    },
    themeOptions: {
      value: false,
      type: 'string',
      description:
        'Either a stringified JSON or a filename containing theme options to be passed into the Highcharts.setOptions.'
    },
    batch: {
      value: false,
      type: 'string',
      description:
        'Initiates a batch job with a string containing input/output pairs: "in=out;in=out;..".'
    },
    rasterizationTimeout: {
      envLink: 'EXPORT_RASTERIZATION_TIMEOUT',
      value: 1500,
      type: 'number',
      description:
        'The specified duration, in milliseconds, to wait for rendering a webpage.'
    }
  },
  customCode: {
    allowCodeExecution: {
      envLink: 'CUSTOM_CODE_ALLOW_CODE_EXECUTION',
      value: false,
      type: 'boolean',
      description:
        'Controls whether the execution of arbitrary code is allowed during the exporting process.'
    },
    allowFileResources: {
      envLink: 'CUSTOM_CODE_ALLOW_FILE_RESOURCES',
      value: false,
      type: 'boolean',
      description:
        'Controls the ability to inject resources from the filesystem. This setting has no effect when running as a server.'
    },
    customCode: {
      value: false,
      type: 'string',
      description:
        'Custom code to execute before chart initialization. It can be a function, code wrapped within a function, or a filename with the .js extension.'
    },
    callback: {
      value: false,
      type: 'string',
      description:
        'JavaScript code to run during construction. It can be a function or a filename with the .js extension.'
    },
    resources: {
      value: false,
      type: 'string',
      description:
        'An additional resource in the form of a stringified JSON. It may contain files, js, and css sections.'
    },
    loadConfig: {
      value: false,
      type: 'string',
      legacyName: 'fromFile',
      description: 'A file containing a pre-defined configuration to use.'
    },
    createConfig: {
      value: false,
      type: 'string',
      description:
        'Enables setting options through a prompt and saving them in a provided config file.'
    }
  },
  server: {
    enable: {
      envLink: 'SERVER_ENABLE',
      value: false,
      type: 'boolean',
      cliName: 'enableServer',
      description: 'If set to true, the server starts on 0.0.0.0.'
    },
    host: {
      envLink: 'SERVER_HOST',
      value: '0.0.0.0',
      type: 'string',
      description:
        'The hostname of the server. Additionally, it starts a server listening on the provided hostname.'
    },
    port: {
      envLink: 'SERVER_PORT',
      value: 7801,
      type: 'number',
      description: 'The port to be used for the server when enabled.'
    },
    ssl: {
      enable: {
        envLink: 'SERVER_SSL_ENABLE',
        value: false,
        type: 'boolean',
        cliName: 'enableSsl',
        description: 'Enables or disables the SSL protocol.'
      },
      force: {
        envLink: 'SERVER_SSL_FORCE',
        value: false,
        type: 'boolean',
        cliName: 'sslForced',
        legacyName: 'sslOnly',
        description:
          'If set to true, the server is forced to serve only over HTTPS.'
      },
      port: {
        envLink: 'SERVER_SSL_PORT',
        value: 443,
        type: 'number',
        cliName: 'sslPort',
        description: 'The port on which to run the SSL server.'
      },
      certPath: {
        envLink: 'SERVER_SSL_CERT_PATH',
        value: '',
        type: 'string',
        legacyName: 'sslPath',
        description: 'The path to the SSL certificate/key file.'
      }
    },
    rateLimiting: {
      enable: {
        envLink: 'SERVER_RATE_LIMITING_ENABLE',
        value: false,
        type: 'boolean',
        cliName: 'enableRateLimiting',
        description: 'Enables rate limiting for the server.'
      },
      maxRequests: {
        envLink: 'SERVER_RATE_LIMITING_MAX_REQUESTS',
        value: 10,
        type: 'number',
        legacyName: 'rateLimit',
        description: 'The maximum number of requests allowed in one minute.'
      },
      window: {
        envLink: 'SERVER_RATE_LIMITING_WINDOW',
        value: 1,
        type: 'number',
        description: 'The time window, in minutes, for the rate limiting.'
      },
      delay: {
        envLink: 'SERVER_RATE_LIMITING_DELAY',
        value: 0,
        type: 'number',
        description:
          'The delay duration for each successive request before reaching the maximum limit.'
      },
      trustProxy: {
        envLink: 'SERVER_RATE_LIMITING_TRUST_PROXY',
        value: false,
        type: 'boolean',
        description: 'Set this to true if the server is behind a load balancer.'
      },
      skipKey: {
        envLink: 'SERVER_RATE_LIMITING_SKIP_KEY',
        value: '',
        type: 'number|string',
        description:
          'Allows bypassing the rate limiter and should be provided with the skipToken argument.'
      },
      skipToken: {
        envLink: 'SERVER_RATE_LIMITING_SKIP_TOKEN',
        value: '',
        type: 'number|string',
        description:
          'Allows bypassing the rate limiter and should be provided with the skipKey argument.'
      }
    }
  },
  pool: {
    minWorkers: {
      envLink: 'POOL_MIN_WORKERS',
      value: 4,
      type: 'number',
      description: 'The number of minimum and initial pool workers to spawn.'
    },
    maxWorkers: {
      envLink: 'POOL_MAX_WORKERS',
      value: 8,
      type: 'number',
      legacyName: 'workers',
      description: 'The number of maximum pool workers to spawn.'
    },
    workLimit: {
      envLink: 'POOL_WORK_LIMIT',
      value: 40,
      type: 'number',
      description:
        'The number of work pieces that can be performed before restarting the worker process.'
    },
    acquireTimeout: {
      envLink: 'POOL_ACQUIRE_TIMEOUT',
      value: 5000,
      type: 'number',
      description:
        'The duration, in milliseconds, to wait for acquiring a resource.'
    },
    createTimeout: {
      envLink: 'POOL_CREATE_TIMEOUT',
      value: 5000,
      type: 'number',
      description:
        'The duration, in milliseconds, to wait for creating a resource.'
    },
    destroyTimeout: {
      envLink: 'POOL_DESTROY_TIMEOUT',
      value: 5000,
      type: 'number',
      description:
        'The duration, in milliseconds, to wait for destroying a resource.'
    },
    idleTimeout: {
      envLink: 'POOL_IDLE_TIMEOUT',
      value: 30000,
      type: 'number',
      description:
        'The duration, in milliseconds, after which an idle resource is destroyed.'
    },
    createRetryInterval: {
      envLink: 'POOL_CREATE_RETRY_INTERVAL',
      value: 200,
      type: 'number',
      description:
        'The duration, in milliseconds, to wait before retrying the create process in case of a failure.'
    },
    reaperInterval: {
      envLink: 'POOL_REAPER_INTERVAL',
      value: 1000,
      type: 'number',
      description:
        'The duration, in milliseconds, after which the check for idle resources to destroy is triggered.'
    },
    benchmarking: {
      envLink: 'POOL_BENCHMARKING',
      value: false,
      type: 'boolean',
      description:
        'Indicate whether to show statistics for the pool of resources or not.'
    },
    listenToProcessExits: {
      envLink: 'POOL_LISTEN_TO_PROCESS_EXITS',
      value: true,
      type: 'boolean',
      description: 'Decides whether or not to attach process.exit handlers.'
    }
  },
  logging: {
    level: {
      envLink: 'LOGGING_LEVEL',
      value: 4,
      type: 'number',
      cliName: 'logLevel',
      description: 'The logging level to be used.'
    },
    file: {
      envLink: 'LOGGING_FILE',
      value: 'highcharts-export-server.log',
      type: 'string',
      cliName: 'logFile',
      description:
        'The name of a log file. The logDest option also needs to be set to enable file logging.'
    },
    dest: {
      envLink: 'LOGGING_DEST',
      value: 'log/',
      type: 'string',
      cliName: 'logDest',
      description:
        'The path to store log files. This also enables file logging.'
    }
  },
  ui: {
    enable: {
      envLink: 'UI_ENABLE',
      value: false,
      type: 'boolean',
      cliName: 'enableUi',
      description:
        'Enables or disables the user interface (UI) for the export server.'
    },
    route: {
      envLink: 'UI_ROUTE',
      value: '/',
      type: 'string',
      cliName: 'uiRoute',
      description:
        'The endpoint route to which the user interface (UI) should be attached.'
    }
  },
  other: {
    noLogo: {
      envLink: 'OTHER_NO_LOGO',
      value: false,
      type: 'boolean',
      description:
        'Skip printing the logo on a startup. Will be replaced by a simple text.'
    }
  },
  payload: {}
};

// The config descriptions object for the prompts functionality. It contains
// information like:
// * Type of a prompt
// * Name of an option
// * Short description of a chosen option
// * Initial value
export const promptsConfig = {
  puppeteer: [
    {
      type: 'list',
      name: 'args',
      message: 'Puppeteer arguments',
      initial: defaultConfig.puppeteer.args.value.join(','),
      separator: ','
    }
  ],
  highcharts: [
    {
      type: 'text',
      name: 'version',
      message: 'Highcharts version',
      initial: defaultConfig.highcharts.version.value
    },
    {
      type: 'text',
      name: 'cdnURL',
      message: 'The url of CDN',
      initial: defaultConfig.highcharts.cdnURL.value
    },
    {
      type: 'multiselect',
      name: 'modules',
      message: 'Available modules',
      instructions: 'Space: Select specific, A: Select all, Enter: Confirm.',
      choices: defaultConfig.highcharts.modules.value
    },
    {
      type: 'list',
      name: 'scripts',
      message: 'Custom scripts',
      initial: defaultConfig.highcharts.scripts.value.join(','),
      separator: ','
    },
    {
      type: 'toggle',
      name: 'forceFetch',
      message: 'Should refetch all the scripts after each server rerun',
      initial: defaultConfig.highcharts.forceFetch.value
    }
  ],
  export: [
    {
      type: 'select',
      name: 'type',
      message: 'The default type of a file to export to',
      hint: `Default: ${defaultConfig.export.type.value}`,
      initial: 0,
      choices: ['png', 'jpeg', 'pdf', 'svg']
    },
    {
      type: 'select',
      name: 'constr',
      message: 'The default constructor for Highcharts to use',
      hint: `Default: ${defaultConfig.export.constr.value}`,
      initial: 0,
      choices: ['chart', 'stockChart', 'mapChart', 'ganttChart']
    },
    {
      type: 'number',
      name: 'defaultHeight',
      message: 'The default fallback height of the exported chart',
      initial: defaultConfig.export.defaultHeight.value
    },
    {
      type: 'number',
      name: 'defaultWidth',
      message: 'The default fallback width of the exported chart',
      initial: defaultConfig.export.defaultWidth.value
    },
    {
      type: 'number',
      name: 'defaultScale',
      message: 'The default fallback scale of the exported chart',
      initial: defaultConfig.export.defaultScale.value,
      min: 0.1,
      max: 5
    },
    {
      type: 'number',
      name: 'rasterizationTimeout',
      message: 'The number of milliseconds to wait for rendering a webpage',
      initial: defaultConfig.export.rasterizationTimeout.value
    }
  ],
  customCode: [
    {
      type: 'toggle',
      name: 'allowCodeExecution',
      message: 'Allow to execute custom code',
      initial: defaultConfig.customCode.allowCodeExecution.value
    },
    {
      type: 'toggle',
      name: 'allowFileResources',
      message: 'Allow file resources',
      initial: defaultConfig.customCode.allowFileResources.value
    }
  ],
  server: [
    {
      type: 'toggle',
      name: 'enable',
      message: 'Starts a server on 0.0.0.0',
      initial: defaultConfig.server.enable.value
    },
    {
      type: 'text',
      name: 'host',
      message: 'A hostname of a server',
      initial: defaultConfig.server.host.value
    },
    {
      type: 'number',
      name: 'port',
      message: 'A port of a server',
      initial: defaultConfig.server.port.value
    },
    {
      type: 'toggle',
      name: 'ssl.enable',
      message: 'Enable SSL protocol',
      initial: defaultConfig.server.ssl.enable.value
    },
    {
      type: 'toggle',
      name: 'ssl.force',
      message: 'Force to only serve over HTTPS',
      initial: defaultConfig.server.ssl.force.value
    },
    {
      type: 'number',
      name: 'ssl.port',
      message: 'Port on which to run the SSL server',
      initial: defaultConfig.server.ssl.port.value
    },
    {
      type: 'text',
      name: 'ssl.certPath',
      message: 'A path where to find the SSL certificate/key',
      initial: defaultConfig.server.ssl.certPath.value
    },
    {
      type: 'toggle',
      name: 'rateLimiting.enable',
      message: 'Enable rate limiting',
      initial: defaultConfig.server.rateLimiting.enable.value
    },
    {
      type: 'number',
      name: 'rateLimiting.maxRequests',
      message: 'Max requests allowed in a one minute',
      initial: defaultConfig.server.rateLimiting.maxRequests.value
    },
    {
      type: 'number',
      name: 'rateLimiting.window',
      message: 'The time window in minutes for rate limiting',
      initial: defaultConfig.server.rateLimiting.window.value
    },
    {
      type: 'number',
      name: 'rateLimiting.delay',
      message:
        'The amount to delay each successive request before hitting the max',
      initial: defaultConfig.server.rateLimiting.delay.value
    },
    {
      type: 'toggle',
      name: 'rateLimiting.trustProxy',
      message: 'Set this to true if behind a load balancer',
      initial: defaultConfig.server.rateLimiting.trustProxy.value
    },
    {
      type: 'text',
      name: 'rateLimiting.skipKey',
      message:
        'Allows bypassing the rate limiter and should be provided with skipToken argument',
      initial: defaultConfig.server.rateLimiting.skipKey.value
    },
    {
      type: 'text',
      name: 'rateLimiting.skipToken',
      message:
        'Allows bypassing the rate limiter and should be provided with skipKey argument',
      initial: defaultConfig.server.rateLimiting.skipToken.value
    }
  ],
  pool: [
    {
      type: 'number',
      name: 'minWorkers',
      message: 'The number of initial workers to spawn',
      initial: defaultConfig.pool.minWorkers.value
    },
    {
      type: 'number',
      name: 'maxWorkers',
      message: 'The number of max workers to spawn',
      initial: defaultConfig.pool.maxWorkers.value
    },
    {
      type: 'number',
      name: 'workLimit',
      message:
        'The pieces of work that can be performed before restarting a puppeteer process',
      initial: defaultConfig.pool.workLimit.value
    },
    {
      type: 'number',
      name: 'acquireTimeout',
      message: 'The number of milliseconds to wait for acquiring a resource',
      initial: defaultConfig.pool.acquireTimeout.value
    },
    {
      type: 'number',
      name: 'createTimeout',
      message: 'The number of milliseconds to wait for creating a resource',
      initial: defaultConfig.pool.createTimeout.value
    },
    {
      type: 'number',
      name: 'destroyTimeout',
      message: 'The number of milliseconds to wait for destroying a resource',
      initial: defaultConfig.pool.destroyTimeout.value
    },
    {
      type: 'number',
      name: 'idleTimeout',
      message: 'The number of milliseconds after an idle resource is destroyed',
      initial: defaultConfig.pool.idleTimeout.value
    },
    {
      type: 'number',
      name: 'createRetryInterval',
      message:
        'The number of milliseconds after the create process is retried in case of fail',
      initial: defaultConfig.pool.createRetryInterval.value
    },
    {
      type: 'number',
      name: 'reaperInterval',
      message:
        'The number of milliseconds after the check for idle resources to destroy is triggered',
      initial: defaultConfig.pool.reaperInterval.value
    },
    {
      type: 'toggle',
      name: 'benchmarking',
      message: 'Set benchmarking',
      initial: defaultConfig.pool.benchmarking.value
    },
    {
      type: 'toggle',
      name: 'listenToProcessExits',
      message: 'Set to false in order to skip attaching process.exit handlers',
      initial: defaultConfig.pool.listenToProcessExits.value
    }
  ],
  logging: [
    {
      type: 'number',
      name: 'level',
      message:
        'The log level (0: silent, 1: error, 2: warning, 3: notice, 4: verbose)',
      initial: defaultConfig.logging.level.value,
      round: 0,
      min: 0,
      max: 4
    },
    {
      type: 'text',
      name: 'file',
      message:
        'A name of a log file. The --logDest also needs to be set to enable file logging',
      initial: defaultConfig.logging.file.value
    },
    {
      type: 'text',
      name: 'dest',
      message: 'A path to log files. It enables file logging',
      initial: defaultConfig.logging.dest.value
    }
  ],
  ui: [
    {
      type: 'toggle',
      name: 'enable',
      message: 'Enable UI for the export server',
      initial: defaultConfig.ui.enable.value
    },
    {
      type: 'text',
      name: 'route',
      message: 'A route to attach the UI to',
      initial: defaultConfig.ui.route.value
    }
  ],
  other: [
    {
      type: 'toggle',
      name: 'noLogo',
      message:
        'Skip printing the logo on a startup. Will be replaced by a simple text',
      initial: defaultConfig.other.noLogo.value
    }
  ]
};

// Absolute props that, in case of merging recursively, need to be force merged
export const absoluteProps = [
  'options',
  'globalOptions',
  'themeOptions',
  'resources',
  'payload'
];

// Argument nesting level of all export server options
export const nestedArgs = {};

/**
 * Recursively creates a chain of nested arguments from an object.
 *
 * @param {Object} obj - The object containing nested arguments.
 * @param {string} propChain - The current chain of nested properties
 * (used internally during recursion).
 */
const createNestedArgs = (obj, propChain = '') => {
  Object.keys(obj).forEach((k) => {
    if (!['puppeteer', 'highcharts'].includes(k)) {
      const entry = obj[k];
      if (typeof entry.value === 'undefined') {
        // Go deeper in the nested arguments
        createNestedArgs(entry, `${propChain}.${k}`);
      } else {
        // Create the chain of nested arguments
        nestedArgs[entry.cliName || k] = `${propChain}.${k}`.substring(1);

        // Support for the legacy, PhantomJS properties names
        if (entry.legacyName !== undefined) {
          nestedArgs[entry.legacyName] = `${propChain}.${k}`.substring(1);
        }
      }
    }
  });
};

createNestedArgs(defaultConfig);
