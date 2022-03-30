/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// Load .env into environment variables
require('dotenv').config();

const toBoolean = require('../../lib/utils').toBoolean;

// This is the configuration object with all options and their default values,
// also from the .env file if one exists
const defaultConfig = {
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
      envLink: 'HIGHCHARTS_CDN',
      type: 'string',
      description: 'The CDN URL of Highcharts scripts to use.'
    },
    modules: {
      envLink: 'HIGHCHARTS_MODULES',
      value: [
        'accessibility',
        'annotations',
        'annotations-advanced',
        'arrow-symbols',
        'boost',
        'boost-canvas',
        'broken-axis',
        'bullet',
        'coloraxis',
        'current-date-indicator',
        'cylinder',
        'data',
        'datagrouping',
        'debugger',
        'dependency-wheel',
        'dotplot',
        'drag-panes',
        'draggable-points',
        'drilldown',
        'dumbbell',
        'export-data',
        'full-screen',
        'funnel',
        'funnel3d',
        'gantt',
        'grid-axis',
        'heatmap',
        'heikinashi',
        'histogram-bellcurve',
        'hollowcandlestick',
        'item-series',
        'lollipop',
        'map',
        'marker-clusters',
        'networkgraph',
        'no-data-to-display',
        'oldie-polyfills',
        'oldie',
        'organization',
        'overlapping-datalabels',
        'parallel-coordinates',
        'pareto',
        'pathfinder',
        'pattern-fill',
        'price-indicator',
        'pyramid3d',
        'sankey',
        'series-label',
        'solid-gauge',
        'sonification',
        'static-scale',
        'stock-tools',
        'stock',
        'streamgraph',
        'sunburst',
        'tilemap',
        'timeline',
        'treegrid',
        'treemap',
        'variable-pie',
        'variwide',
        'vector',
        'venn',
        'windbarb',
        'wordcloud',
        'xrange'
      ],
      type: 'string[]',
      description: 'Highcharts modules to fetch.'
    },
    scripts: {
      value: [],
      type: 'string[]',
      description: 'Additional scripts/optional dependencies (e.g. moments.js).'
    }
  },
  export: {
    infile: {
      value: false,
      type: 'string',
      description:
        'The input file name along with a type (jpeg, png, pdf or svg). It can be a correct JSON or SVG file.'
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
        'The output filename along with a type (jpeg, png, pdf or svg). Ignores the --type flag.'
    },
    type: {
      envLink: 'EXPORT_DEFAULT_TYPE',
      value: 'png',
      type: 'string',
      description:
        'The format of the file to export to. Can be jpeg, png, pdf or svg.'
    },
    constr: {
      envLink: 'EXPORT_DEFAULT_CONSTR',
      value: 'chart',
      type: 'string',
      description:
        'The constructor to use. Can be Chart, StockChart or MapChart.'
    },
    height: {
      envLink: 'EXPORT_DEFAULT_HEIGHT',
      value: 1200,
      type: 'number',
      description:
        'The height of the exported chart. Overrides the option in the chart settings.'
    },
    width: {
      envLink: 'EXPORT_DEFAULT_WIDTH',
      value: 800,
      type: 'number',
      description:
        'The width of the exported chart. Overrides the option in the chart settings.'
    },
    scale: {
      envLink: 'EXPORT_DEFAULT_SCALE',
      value: 1,
      type: 'number',
      description: 'The scale of the exported chart. Ranges between 1 and 5.'
    },
    globalOptions: {
      value: false,
      type: 'string',
      description:
        'A stringified JSON or a filename with options to be passed into the Highcharts.setOptions.'
    },
    themeOptions: {
      value: false,
      type: 'string',
      description:
        'A stringified JSON or a filename with theme options to be passed into the Highcharts.setOptions.'
    },
    batch: {
      value: false,
      type: 'string',
      description:
        'Starts a batch job. A string that contains input/output pairs: "in=out;in=out;..".'
    }
  },
  customCode: {
    allowCodeExecution: {
      envLink: 'HIGHCHARTS_ALLOW_CODE_EXECUTION',
      value: false,
      type: 'boolean',
      description:
        'If set to true, allow for the execution of arbitrary code when exporting.'
    },
    allowFileResources: {
      envLink: 'HIGHCHARTS_ALLOW_FILE_RESOURCES',
      value: true,
      type: 'boolean',
      description:
        'Allow injecting resources from the filesystem. Has no effect when running as a server.'
    },
    allowForceInject: {
      envLink: 'HIGHCHARTS_ALLOW_FORCE_INJECT',
      value: false,
      type: 'boolean',
      description:
        'Allow injecting code directly. Has no effect when running as a server.'
    },
    callback: {
      value: false,
      type: 'string',
      description: 'A JavaScript file with a function to run on construction.'
    },
    resources: {
      value: false,
      type: 'string',
      description:
        'An additional resource in a form of stringified JSON. It can contains files, js and css sections.'
    },
    loadConfig: {
      value: false,
      type: 'string',
      description: 'A file that contains a pre-defined config to use.'
    },
    createConfig: {
      value: false,
      type: 'string',
      description:
        'Allows to set options through a prompt and save in a provided config file.'
    }
  },
  server: {
    enable: {
      envLink: 'HIGHCHARTS_SERVER_ENABLE',
      value: false,
      type: 'boolean',
      cliName: 'enableServer',
      description: 'If set to true, starts a server on 0.0.0.0.'
    },
    host: {
      envLink: 'HIGHCHARTS_SERVER_HOST',
      value: '0.0.0.0',
      type: 'string',
      description:
        'The hostname of the server. Also starts a server listening on the supplied hostname.'
    },
    port: {
      envLink: 'HIGHCHARTS_SERVER_PORT',
      value: 8080,
      type: 'number',
      description: 'The port to use for the server. Defaults to 8080.'
    },
    ssl: {
      enable: {
        envLink: 'HIGHCHARTS_SERVER_SSL_ENABLE',
        value: false,
        type: 'boolean',
        cliName: 'enableSsl',
        description: 'Enables the SSL protocol.'
      },
      force: {
        envLink: 'HIGHCHARTS_SERVER_SSL_FORCE',
        value: false,
        type: 'boolean',
        cliName: 'sslForced',
        description:
          'If set to true, forces the server to only serve over HTTPS.'
      },
      port: {
        envLink: 'HIGHCHARTS_SERVER_SSL_PORT',
        value: 443,
        type: 'number',
        cliName: 'sslPort',
        description: 'The port on which to run the SSL server.'
      },
      certPath: {
        envLink: 'HIGHCHARTS_SSL_CERT_PATH',
        value: '',
        type: 'string',
        description: 'The path to the SSL certificate/key.'
      }
    },
    rateLimiting: {
      enable: {
        envLink: 'HIGHCHARTS_RATE_LIMIT_ENABLE',
        value: false,
        type: 'boolean',
        cliName: 'enableRateLimiting',
        description: 'Enables rate limiting.'
      },
      maxRequests: {
        envLink: 'HIGHCHARTS_RATE_LIMIT_MAX',
        value: 10,
        type: 'number',
        description: 'Max requests allowed in a one minute.'
      },
      skipKey: {
        envLink: 'HIGHCHARTS_RATE_LIMIT_SKIP_KEY',
        value: '',
        type: 'number|string',
        description:
          'Allows bypassing the rate limiter and should be provided with skipToken argument.'
      },
      skipToken: {
        envLink: 'HIGHCHARTS_RATE_LIMIT_SKIP_TOKEN',
        value: '',
        type: 'number|string',
        description:
          'Allows bypassing the rate limiter and should be provided with skipKey argument.'
      }
    }
  },
  pool: {
    initialWorkers: {
      envLink: 'HIGHCHARTS_POOL_MIN_WORKERS',
      value: 4,
      type: 'number',
      description: 'The number of initial workers to spawn.'
    },
    maxWorkers: {
      envLink: 'HIGHCHARTS_POOL_MAX_WORKERS',
      value: 4,
      type: 'number',
      description: 'The number of max workers to spawn.'
    },
    workLimit: {
      envLink: 'HIGHCHARTS_POOL_WORK_LIMIT',
      value: 60,
      type: 'number',
      description:
        'The pieces of work that can be performed before restarting process.'
    },
    queueSize: {
      envLink: 'HIGHCHARTS_POOL_QUEUE_SIZE',
      value: 5,
      type: 'number',
      description: 'The size of the request overflow queue.'
    },
    timeoutThreshold: {
      envLink: 'HIGHCHARTS_POOL_TIMEOUT',
      value: 30000,
      type: 'number',
      description: 'The number of seconds before timing out.'
    },
    reaper: {
      envLink: 'HIGHCHARTS_POOL_ENABLE_REAPER',
      value: true,
      type: 'boolean',
      description: 'Whether or not to evict workers after a certain time period'
    },
    benchmarking: {
      envLink: 'HIGHCHARTS_POOL_BENCHMARKING',
      value: true,
      type: 'boolean',
      description: 'Enable benchmarking.'
    },
    listenToProcessExits: {
      envLink: 'HIGHCHARTS_POOL_LISTEN_TO_PROCESS_EXITS',
      value: true,
      type: 'boolean',
      description:
        'Set to false in order to skip attaching process.exit handlers.'
    }
  },
  logging: {
    level: {
      envLink: 'HIGHCHARTS_LOG_LEVEL',
      value: 4,
      type: 'number',
      cliName: 'logLevel',
      description:
        'The log level (0: silent, 1: error, 2: warning, 3: notice, 4: verbose).'
    },
    file: {
      envLink: 'HIGHCHARTS_LOG_FILE',
      value: 'highcharts-export-server.log',
      type: 'string',
      cliName: 'logFile',
      description:
        'A name of a log file. The --logDest also needs to be set to enable file logging.'
    },
    dest: {
      envLink: 'HIGHCHARTS_LOG_DEST',
      value: 'log/',
      type: 'string',
      cliName: 'logDest',
      description: 'The path to store log files. Also enables file logging.'
    }
  },
  ui: {
    enable: {
      envLink: 'HIGHCHARTS_UI_ENABLE',
      value: false,
      type: 'boolean',
      cliName: 'enableUi',
      description: 'Enables the UI for the export server.'
    },
    route: {
      envLink: 'HIGHCHARTS_UI_ROUTE',
      value: '/',
      type: 'string',
      cliName: 'uiRoute',
      description: 'The route to attach the UI to.'
    }
  },
  other: {
    noLogo: {
      envLink: 'HIGHCHARTS_NO_LOGO',
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
const promptsConfig = {
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
      name: 'height',
      message: 'The default fallback height of the exported chart',
      initial: defaultConfig.export.height.value
    },
    {
      type: 'number',
      name: 'width',
      message: 'The default fallback width of the exported chart',
      initial: defaultConfig.export.width.value
    },
    {
      type: 'number',
      name: 'scale',
      message: 'The default fallback scale of the exported chart',
      initial: defaultConfig.export.scale.value,
      min: 0.1,
      max: 5
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
    },
    {
      type: 'toggle',
      name: 'allowForceInject',
      message: 'Allow injecting code directly',
      initial: defaultConfig.customCode.allowForceInject.value
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
      name: 'initialWorkers',
      message: 'The number of initial workers to spawn',
      initial: defaultConfig.pool.initialWorkers.value
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
      name: 'queueSize',
      message: 'The size of the request overflow queue',
      initial: defaultConfig.pool.queueSize.value
    },
    {
      type: 'number',
      name: 'timeoutThreshold',
      message: 'The number of seconds before timing out',
      initial: defaultConfig.pool.timeoutThreshold.value
    },
    {
      type: 'toggle',
      name: 'reaper',
      message: 'The reaper to remove hanging processes',
      initial: defaultConfig.pool.reaper.value
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

// Argument nesting level of all export server options
// TODO: Move to main config like for envLink
const nestedArgs = {
  // Export section
  infile: 'export.infile',
  instr: 'export.instr',
  options: 'export.options',
  outfile: 'export.outfile',
  type: 'export.type',
  constr: 'export.constr',
  scale: 'export.scale',
  height: 'export.height',
  width: 'export.width',
  globalOptions: 'export.globalOptions',
  themeOptions: 'export.themeOptions',
  batch: 'export.batch',

  // Resources section
  allowCodeExecution: 'customCode.allowCodeExecution',
  allowFileResources: 'customCode.allowFileResources',
  allowForceInject: 'customCode.allowForceInject',
  resources: 'customCode.resources',
  callback: 'customCode.callback',
  loadConfig: 'customCode.loadConfig',
  createConfig: 'customCode.createConfig',

  // Server section
  enableServer: 'server.enable',
  host: 'server.host',
  port: 'server.port',
  enableSsl: 'server.ssl.enable',
  sslForced: 'server.ssl.force',
  sslPort: 'server.ssl.port',
  certPath: 'server.ssl.certPath',
  enableRateLimiting: 'server.rateLimiting.enable',
  maxRequests: 'server.rateLimiting.maxRequests',
  skipKey: 'server.rateLimiting.skipKey',
  skipToken: 'server.rateLimiting.skipToken',

  // Pool section
  initialWorkers: 'pool.initialWorkers',
  maxWorkers: 'pool.maxWorkers',
  workLimit: 'pool.workLimit',
  queueSize: 'pool.queueSize',
  timeoutThreshold: 'pool.timeoutThreshold',
  reaper: 'pool.reaper',
  benchmarking: 'pool.benchmarking',
  listenToProcessExits: 'pool.listenToProcessExits',

  // Logging section
  logLevel: 'logging.level',
  logFile: 'logging.file',
  logDest: 'logging.dest',

  // UI section
  enableUi: 'ui.enable',
  uiRoute: 'ui.route',

  // Other section
  noLogo: 'other.noLogo'
};

const envVars = [];

// Build maps and load env vars
const initConfig = (obj) => {
  Object.keys(obj).forEach((k) => {
    const entry = obj[k];

    if (typeof entry.value === 'undefined') {
      initConfig(entry);
    } else {
      if (entry.envLink) {
        // Load the env var
        if (entry.type === 'boolean') {
          entry.value = toBoolean(process.env[entry.envLink]) || entry.value;
        } else if (entry.type === 'number') {
          entry.value = +process.env[entry.envLink] || entry.value;
        } else if (entry.type.indexOf(']') >= 0 && process.env[entry.envLink]) {
          entry.value = process.env[entry.envLink].split(',');
        } else {
          entry.value = process.env[entry.envLink] || entry.value;
        }

        // Add to list of env vars
        envVars.push({
          name: entry.envLink,
          description: entry.description,
          type: entry.type
        });
      }
    }
  });
};

initConfig(defaultConfig);

module.exports = {
  defaultConfig,
  promptsConfig,
  envVars,
  nestedArgs
};
