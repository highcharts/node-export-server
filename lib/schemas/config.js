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
      description: 'Arguments array to send to Puppeteer.'
    }
  },
  highcharts: {
    version: {
      value: 'latest',
      envLink: 'HIGHCHARTS_VERSION',
      type: 'string',
      description: 'The Highcharts version to be used.'
    },
    cdnURL: {
      value: 'https://code.highcharts.com/',
      envLink: 'HIGHCHARTS_CDN_URL',
      type: 'string',
      description: 'The CDN URL for Highcharts scripts to be used.'
    },
    coreScripts: {
      envLink: 'HIGHCHARTS_CORE_SCRIPTS',
      value: ['highcharts', 'highcharts-more', 'highcharts-3d'],
      type: 'string[]',
      description: 'The core Highcharts scripts to fetch.'
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
      description: 'The modules of Highcharts to fetch.'
    },
    indicators: {
      envLink: 'HIGHCHARTS_INDICATORS',
      value: ['indicators-all'],
      type: 'string[]',
      description: 'The indicators of Highcharts to fetch.'
    },
    scripts: {
      value: [
        'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.34/moment-timezone-with-data.min.js'
      ],
      type: 'string[]',
      description: 'Additional optional scripts or dependencies to fetch.'
    },
    forceFetch: {
      envLink: 'HIGHCHARTS_FORCE_FETCH',
      value: false,
      type: 'boolean',
      description:
        'The flag to determine whether to refetch all scripts after each server rerun.'
    }
  },
  export: {
    infile: {
      value: false,
      type: 'string',
      description:
        'The input file should include a name and a type (json or svg). It must be correctly formatted as a JSON or SVG file.'
    },
    instr: {
      value: false,
      type: 'string',
      description:
        'Input, provided in the form of a stringified JSON or SVG file, will override the --infile option.'
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
        'The output filename along with a type (jpeg, png, pdf, or svg). This will ignore the --type flag.'
    },
    type: {
      envLink: 'EXPORT_TYPE',
      value: 'png',
      type: 'string',
      description: 'The file export format. It can be jpeg, png, pdf, or svg.'
    },
    constr: {
      envLink: 'EXPORT_CONSTR',
      value: 'chart',
      type: 'string',
      description:
        'The constructor to use. Can be chart, stockChart, mapChart, or ganttChart.'
    },
    defaultHeight: {
      envLink: 'EXPORT_DEFAULT_HEIGHT',
      value: 400,
      type: 'number',
      description:
        'the default height of the exported chart. Used when no value is set.'
    },
    defaultWidth: {
      envLink: 'EXPORT_DEFAULT_WIDTH',
      value: 600,
      type: 'number',
      description:
        'The default width of the exported chart. Used when no value is set.'
    },
    defaultScale: {
      envLink: 'EXPORT_DEFAULT_SCALE',
      value: 1,
      type: 'number',
      description:
        'The default scale of the exported chart. Used when no value is set.'
    },
    height: {
      type: 'number',
      value: false,
      description:
        'The height of the exported chart, overriding the option in the chart settings.'
    },
    width: {
      type: 'number',
      value: false,
      description:
        'The width of the exported chart, overriding the option in the chart settings.'
    },
    scale: {
      value: false,
      type: 'number',
      description:
        'The scale of the exported chart, overriding the option in the chart settings. Ranges between 0.1 and 5.0.'
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
        'Initiates a batch job with a string containing input/output pairs: "in=out;in=out;...".'
    },
    rasterizationTimeout: {
      envLink: 'EXPORT_RASTERIZATION_TIMEOUT',
      value: 1500,
      type: 'number',
      description:
        'The duration in milliseconds to wait for rendering a webpage.'
    }
  },
  customLogic: {
    allowCodeExecution: {
      envLink: 'CUSTOM_LOGIC_ALLOW_CODE_EXECUTION',
      value: false,
      type: 'boolean',
      description:
        'Controls whether the execution of arbitrary code is allowed during the exporting process.'
    },
    allowFileResources: {
      envLink: 'CUSTOM_LOGIC_ALLOW_FILE_RESOURCES',
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
        'Additional resource in the form of a stringified JSON, which may contain files, js, and css sections.'
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
      description:
        'When set to true, the server starts on the local IP address 0.0.0.0.'
    },
    host: {
      envLink: 'SERVER_HOST',
      value: '0.0.0.0',
      type: 'string',
      description:
        'The hostname of the server. Additionally, it starts a server on the provided hostname.'
    },
    port: {
      envLink: 'SERVER_PORT',
      value: 7801,
      type: 'number',
      description: 'The server port when enabled.'
    },
    benchmarking: {
      envLink: 'SERVER_BENCHMARKING',
      value: false,
      type: 'boolean',
      cliName: 'serverBenchmarking',
      description:
        'Indicates whether to display the duration, in milliseconds, of specific actions that occur on the server while serving a request.'
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
          'When set to true, the server is forced to serve only over HTTPS.'
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
        type: 'string',
        description:
          'Allows bypassing the rate limiter and should be provided with the skipToken argument.'
      },
      skipToken: {
        envLink: 'SERVER_RATE_LIMITING_SKIP_TOKEN',
        value: '',
        type: 'string',
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
      cliName: 'poolBenchmarking',
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
  }
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
      message: 'The URL of CDN',
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
      message: 'Force re-fetch the scripts',
      initial: defaultConfig.highcharts.forceFetch.value
    }
  ],
  export: [
    {
      type: 'select',
      name: 'type',
      message: 'The default export file type',
      hint: `Default: ${defaultConfig.export.type.value}`,
      initial: 0,
      choices: ['png', 'jpeg', 'pdf', 'svg']
    },
    {
      type: 'select',
      name: 'constr',
      message: 'The default constructor for Highcharts',
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
      message: 'The rendering webpage timeout in milliseconds',
      initial: defaultConfig.export.rasterizationTimeout.value
    }
  ],
  customLogic: [
    {
      type: 'toggle',
      name: 'allowCodeExecution',
      message: 'Enable execution of custom code',
      initial: defaultConfig.customLogic.allowCodeExecution.value
    },
    {
      type: 'toggle',
      name: 'allowFileResources',
      message: 'Enable file resources',
      initial: defaultConfig.customLogic.allowFileResources.value
    }
  ],
  server: [
    {
      type: 'toggle',
      name: 'enable',
      message: 'Starts the server on 0.0.0.0',
      initial: defaultConfig.server.enable.value
    },
    {
      type: 'text',
      name: 'host',
      message: 'Server hostname',
      initial: defaultConfig.server.host.value
    },
    {
      type: 'number',
      name: 'port',
      message: 'Server port',
      initial: defaultConfig.server.port.value
    },
    {
      type: 'toggle',
      name: 'benchmarking',
      message: 'Enable server benchmarking',
      initial: defaultConfig.server.benchmarking.value
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
      message: 'Force serving only over HTTPS',
      initial: defaultConfig.server.ssl.force.value
    },
    {
      type: 'number',
      name: 'ssl.port',
      message: 'SSL server port',
      initial: defaultConfig.server.ssl.port.value
    },
    {
      type: 'text',
      name: 'ssl.certPath',
      message: 'The path to find the SSL certificate/key',
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
      message: 'The maximum requests allowed per minute',
      initial: defaultConfig.server.rateLimiting.maxRequests.value
    },
    {
      type: 'number',
      name: 'rateLimiting.window',
      message: 'The rate-limiting time window in minutes',
      initial: defaultConfig.server.rateLimiting.window.value
    },
    {
      type: 'number',
      name: 'rateLimiting.delay',
      message:
        'The delay for each successive request before reaching the maximum',
      initial: defaultConfig.server.rateLimiting.delay.value
    },
    {
      type: 'toggle',
      name: 'rateLimiting.trustProxy',
      message: 'Set to true if behind a load balancer',
      initial: defaultConfig.server.rateLimiting.trustProxy.value
    },
    {
      type: 'text',
      name: 'rateLimiting.skipKey',
      message:
        'Allows bypassing the rate limiter when provided with the skipToken argument',
      initial: defaultConfig.server.rateLimiting.skipKey.value
    },
    {
      type: 'text',
      name: 'rateLimiting.skipToken',
      message:
        'Allows bypassing the rate limiter when provided with the skipKey argument',
      initial: defaultConfig.server.rateLimiting.skipToken.value
    }
  ],
  pool: [
    {
      type: 'number',
      name: 'minWorkers',
      message: 'The initial number of workers to spawn',
      initial: defaultConfig.pool.minWorkers.value
    },
    {
      type: 'number',
      name: 'maxWorkers',
      message: 'The maximum number of workers to spawn',
      initial: defaultConfig.pool.maxWorkers.value
    },
    {
      type: 'number',
      name: 'workLimit',
      message:
        'The pieces of work that can be performed before restarting a Puppeteer process',
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
        'The retry interval in milliseconds after a create process fails',
      initial: defaultConfig.pool.createRetryInterval.value
    },
    {
      type: 'number',
      name: 'reaperInterval',
      message:
        'The reaper interval in milliseconds after triggering the check for idle resources to destroy',
      initial: defaultConfig.pool.reaperInterval.value
    },
    {
      type: 'toggle',
      name: 'benchmarking',
      message: 'Enable benchmarking for a resource pool',
      initial: defaultConfig.pool.benchmarking.value
    },
    {
      type: 'toggle',
      name: 'listenToProcessExits',
      message: 'Set to false to skip attaching process.exit handlers',
      initial: defaultConfig.pool.listenToProcessExits.value
    }
  ],
  logging: [
    {
      type: 'number',
      name: 'level',
      message:
        'The log level (0: silent, 1: error, 2: warning, 3: notice, 4: verbose, 5: benchmark)',
      initial: defaultConfig.logging.level.value,
      round: 0,
      min: 0,
      max: 5
    },
    {
      type: 'text',
      name: 'file',
      message: 'A log file name. Set with the --logDest to enable file logging',
      initial: defaultConfig.logging.file.value
    },
    {
      type: 'text',
      name: 'dest',
      message: 'The path to log files. Enables file logging',
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
      message: 'A route to attach the UI',
      initial: defaultConfig.ui.route.value
    }
  ],
  other: [
    {
      type: 'toggle',
      name: 'noLogo',
      message: 'Skip printing the logo on startup. Replaced by simple text',
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
