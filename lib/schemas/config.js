/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// Possible names for Highcharts scripts
export const scriptsNames = {
  core: ['highcharts', 'highcharts-more', 'highcharts-3d'],
  modules: [
    'stock',
    'map',
    'gantt',
    'exporting',
    'parallel-coordinates',
    'accessibility',
    // 'annotations-advanced',
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
    'series-on-point',
    'solid-gauge',
    'sonification',
    // 'stock-tools',
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
    'flowmap',
    'export-data',
    'navigator',
    'textpath'
  ],
  indicators: ['indicators-all'],
  custom: [
    'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
  ]
};

// This is the configuration object with all options and their default values,
// also from the .env file if one exists
export const defaultConfig = {
  puppeteer: {
    args: {
      value: [
        '--allow-running-insecure-content',
        '--ash-no-nudges',
        '--autoplay-policy=user-gesture-required',
        '--block-new-web-contents',
        '--disable-accelerated-2d-canvas',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-checker-imaging',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-dev-shm-usage',
        '--disable-domain-reliability',
        '--disable-extensions',
        '--disable-features=CalculateNativeWinOcclusion,InterestFeedContentSuggestions,WebOTP',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-logging',
        '--disable-notifications',
        '--disable-offer-store-unmasked-wallet-cards',
        '--disable-popup-blocking',
        '--disable-print-preview',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-search-engine-choice-screen',
        '--disable-session-crashed-bubble',
        '--disable-setuid-sandbox',
        '--disable-site-isolation-trials',
        '--disable-speech-api',
        '--disable-sync',
        '--enable-unsafe-webgpu',
        '--hide-crash-restore-bubble',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-first-run',
        '--no-pings',
        '--no-sandbox',
        '--no-startup-window',
        '--no-zygote',
        '--password-store=basic',
        '--process-per-tab',
        '--use-mock-keychain'
      ],
      type: 'string[]',
      description: 'Arguments array to send to Puppeteer.'
    }
  },
  highcharts: {
    version: {
      value: 'latest',
      type: 'string',
      envLink: 'HIGHCHARTS_VERSION',
      description: 'The Highcharts version to be used.'
    },
    cdnURL: {
      value: 'https://code.highcharts.com/',
      type: 'string',
      envLink: 'HIGHCHARTS_CDN_URL',
      description: 'The CDN URL for Highcharts scripts to be used.'
    },
    coreScripts: {
      value: scriptsNames.core,
      type: 'string[]',
      envLink: 'HIGHCHARTS_CORE_SCRIPTS',
      description: 'The core Highcharts scripts to fetch.'
    },
    moduleScripts: {
      value: scriptsNames.modules,
      type: 'string[]',
      envLink: 'HIGHCHARTS_MODULE_SCRIPTS',
      description: 'The modules of Highcharts to fetch.'
    },
    indicatorScripts: {
      value: scriptsNames.indicators,
      type: 'string[]',
      envLink: 'HIGHCHARTS_INDICATOR_SCRIPTS',
      description: 'The indicators of Highcharts to fetch.'
    },
    customScripts: {
      value: scriptsNames.custom,
      type: 'string[]',
      description: 'Additional custom scripts or dependencies to fetch.'
    },
    forceFetch: {
      value: false,
      type: 'boolean',
      envLink: 'HIGHCHARTS_FORCE_FETCH',
      description:
        'The flag to determine whether to refetch all scripts after each server rerun.'
    },
    cachePath: {
      value: '.cache',
      type: 'string',
      envLink: 'HIGHCHARTS_CACHE_PATH',
      description:
        'The path to the cache directory. It is used to store the Highcharts scripts and custom scripts.'
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
      value: 'png',
      type: 'string',
      envLink: 'EXPORT_TYPE',
      description: 'The file export format. It can be jpeg, png, pdf, or svg.'
    },
    constr: {
      value: 'chart',
      type: 'string',
      envLink: 'EXPORT_CONSTR',
      description:
        'The constructor to use. Can be chart, stockChart, mapChart, or ganttChart.'
    },
    defaultHeight: {
      value: 400,
      type: 'number',
      envLink: 'EXPORT_DEFAULT_HEIGHT',
      description:
        'the default height of the exported chart. Used when no value is set.'
    },
    defaultWidth: {
      value: 600,
      type: 'number',
      envLink: 'EXPORT_DEFAULT_WIDTH',
      description:
        'The default width of the exported chart. Used when no value is set.'
    },
    defaultScale: {
      value: 1,
      type: 'number',
      envLink: 'EXPORT_DEFAULT_SCALE',
      description:
        'The default scale of the exported chart. Used when no value is set.'
    },
    height: {
      value: false,
      type: 'number',
      description:
        'The height of the exported chart, overriding the option in the chart settings.'
    },
    width: {
      value: false,
      type: 'number',
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
      value: 1500,
      type: 'number',
      envLink: 'EXPORT_RASTERIZATION_TIMEOUT',
      description:
        'The duration in milliseconds to wait for rendering a webpage.'
    }
  },
  customLogic: {
    allowCodeExecution: {
      value: false,
      type: 'boolean',
      envLink: 'CUSTOM_LOGIC_ALLOW_CODE_EXECUTION',
      description:
        'Controls whether the execution of arbitrary code is allowed during the exporting process.'
    },
    allowFileResources: {
      value: false,
      type: 'boolean',
      envLink: 'CUSTOM_LOGIC_ALLOW_FILE_RESOURCES',
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
      value: false,
      type: 'boolean',
      envLink: 'SERVER_ENABLE',
      cliName: 'enableServer',
      description:
        'When set to true, the server starts on the local IP address 0.0.0.0.'
    },
    host: {
      value: '0.0.0.0',
      type: 'string',
      envLink: 'SERVER_HOST',
      description:
        'The hostname of the server. Additionally, it starts a server on the provided hostname.'
    },
    port: {
      value: 7801,
      type: 'number',
      envLink: 'SERVER_PORT',
      description: 'The server port when enabled.'
    },
    benchmarking: {
      value: false,
      type: 'boolean',
      envLink: 'SERVER_BENCHMARKING',
      cliName: 'serverBenchmarking',
      description:
        'Indicates whether to display the duration, in milliseconds, of specific actions that occur on the server while serving a request.'
    },
    proxy: {
      host: {
        value: false,
        type: 'string',
        envLink: 'SERVER_PROXY_HOST',
        cliName: 'proxyHost',
        description: 'The host of the proxy server to use, if it exists.'
      },
      port: {
        value: 8080,
        type: 'number',
        envLink: 'SERVER_PROXY_PORT',
        cliName: 'proxyPort',
        description: 'The port of the proxy server to use, if it exists.'
      },
      timeout: {
        value: 5000,
        type: 'number',
        envLink: 'SERVER_PROXY_TIMEOUT',
        cliName: 'proxyTimeout',
        description: 'The timeout for the proxy server to use, if it exists.'
      }
    },
    rateLimiting: {
      enable: {
        value: false,
        type: 'boolean',
        envLink: 'SERVER_RATE_LIMITING_ENABLE',
        cliName: 'enableRateLimiting',
        description: 'Enables rate limiting for the server.'
      },
      maxRequests: {
        value: 10,
        type: 'number',
        envLink: 'SERVER_RATE_LIMITING_MAX_REQUESTS',
        legacyName: 'rateLimit',
        description: 'The maximum number of requests allowed in one minute.'
      },
      window: {
        value: 1,
        type: 'number',
        envLink: 'SERVER_RATE_LIMITING_WINDOW',
        description: 'The time window, in minutes, for the rate limiting.'
      },
      delay: {
        value: 0,
        type: 'number',
        envLink: 'SERVER_RATE_LIMITING_DELAY',
        description:
          'The delay duration for each successive request before reaching the maximum limit.'
      },
      trustProxy: {
        value: false,
        type: 'boolean',
        envLink: 'SERVER_RATE_LIMITING_TRUST_PROXY',
        description: 'Set this to true if the server is behind a load balancer.'
      },
      skipKey: {
        value: false,
        type: 'string',
        envLink: 'SERVER_RATE_LIMITING_SKIP_KEY',
        description:
          'Allows bypassing the rate limiter and should be provided with the skipToken argument.'
      },
      skipToken: {
        value: false,
        type: 'string',
        envLink: 'SERVER_RATE_LIMITING_SKIP_TOKEN',
        description:
          'Allows bypassing the rate limiter and should be provided with the skipKey argument.'
      }
    },
    ssl: {
      enable: {
        value: false,
        type: 'boolean',
        envLink: 'SERVER_SSL_ENABLE',
        cliName: 'enableSsl',
        description: 'Enables or disables the SSL protocol.'
      },
      force: {
        value: false,
        type: 'boolean',
        envLink: 'SERVER_SSL_FORCE',
        cliName: 'sslForce',
        legacyName: 'sslOnly',
        description:
          'When set to true, the server is forced to serve only over HTTPS.'
      },
      port: {
        value: 443,
        type: 'number',
        envLink: 'SERVER_SSL_PORT',
        cliName: 'sslPort',
        description: 'The port on which to run the SSL server.'
      },
      certPath: {
        value: false,
        type: 'string',
        envLink: 'SERVER_SSL_CERT_PATH',
        legacyName: 'sslPath',
        description: 'The path to the SSL certificate/key file.'
      }
    }
  },
  pool: {
    minWorkers: {
      value: 4,
      type: 'number',
      envLink: 'POOL_MIN_WORKERS',
      description: 'The number of minimum and initial pool workers to spawn.'
    },
    maxWorkers: {
      value: 8,
      type: 'number',
      envLink: 'POOL_MAX_WORKERS',
      legacyName: 'workers',
      description: 'The number of maximum pool workers to spawn.'
    },
    workLimit: {
      value: 40,
      type: 'number',
      envLink: 'POOL_WORK_LIMIT',
      description:
        'The number of work pieces that can be performed before restarting the worker process.'
    },
    acquireTimeout: {
      value: 5000,
      type: 'number',
      envLink: 'POOL_ACQUIRE_TIMEOUT',
      description:
        'The duration, in milliseconds, to wait for acquiring a resource.'
    },
    createTimeout: {
      value: 5000,
      type: 'number',
      envLink: 'POOL_CREATE_TIMEOUT',
      description:
        'The duration, in milliseconds, to wait for creating a resource.'
    },
    destroyTimeout: {
      value: 5000,
      type: 'number',
      envLink: 'POOL_DESTROY_TIMEOUT',
      description:
        'The duration, in milliseconds, to wait for destroying a resource.'
    },
    idleTimeout: {
      value: 30000,
      type: 'number',
      envLink: 'POOL_IDLE_TIMEOUT',
      description:
        'The duration, in milliseconds, after which an idle resource is destroyed.'
    },
    createRetryInterval: {
      value: 200,
      type: 'number',
      envLink: 'POOL_CREATE_RETRY_INTERVAL',
      description:
        'The duration, in milliseconds, to wait before retrying the create process in case of a failure.'
    },
    reaperInterval: {
      value: 1000,
      type: 'number',
      envLink: 'POOL_REAPER_INTERVAL',
      description:
        'The duration, in milliseconds, after which the check for idle resources to destroy is triggered.'
    },
    benchmarking: {
      value: false,
      type: 'boolean',
      envLink: 'POOL_BENCHMARKING',
      cliName: 'poolBenchmarking',
      description:
        'Indicate whether to show statistics for the pool of resources or not.'
    }
  },
  logging: {
    level: {
      value: 4,
      type: 'number',
      envLink: 'LOGGING_LEVEL',
      cliName: 'logLevel',
      description: 'The logging level to be used.'
    },
    file: {
      value: 'highcharts-export-server.log',
      type: 'string',
      envLink: 'LOGGING_FILE',
      cliName: 'logFile',
      description:
        'The name of a log file. The `logToFile` and `logDest` options also need to be set to enable file logging.'
    },
    dest: {
      value: 'log/',
      type: 'string',
      envLink: 'LOGGING_DEST',
      cliName: 'logDest',
      description:
        'The path to store log files. The `logToFile` option also needs to be set to enable file logging.'
    },
    toConsole: {
      value: true,
      type: 'boolean',
      envLink: 'LOGGING_TO_CONSOLE',
      cliName: 'logToConsole',
      description: 'Enables or disables showing logs in the console.'
    },
    toFile: {
      value: true,
      type: 'boolean',
      envLink: 'LOGGING_TO_FILE',
      cliName: 'logToFile',
      description:
        'Enables or disables creation of the log directory and saving the log into a .log file.'
    }
  },
  ui: {
    enable: {
      value: false,
      type: 'boolean',
      envLink: 'UI_ENABLE',
      cliName: 'enableUi',
      description:
        'Enables or disables the user interface (UI) for the export server.'
    },
    route: {
      value: '/',
      type: 'string',
      envLink: 'UI_ROUTE',
      cliName: 'uiRoute',
      description:
        'The endpoint route to which the user interface (UI) should be attached.'
    }
  },
  other: {
    nodeEnv: {
      value: 'production',
      type: 'string',
      envLink: 'OTHER_NODE_ENV',
      description: 'The type of Node.js environment.'
    },
    listenToProcessExits: {
      value: true,
      type: 'boolean',
      envLink: 'OTHER_LISTEN_TO_PROCESS_EXITS',
      description: 'Decides whether or not to attach process.exit handlers.'
    },
    noLogo: {
      value: false,
      type: 'boolean',
      envLink: 'OTHER_NO_LOGO',
      description:
        'Skip printing the logo on a startup. Will be replaced by a simple text.'
    },
    hardResetPage: {
      value: false,
      type: 'boolean',
      envLink: 'OTHER_HARD_RESET_PAGE',
      description: 'Decides if the page content should be reset entirely.'
    },
    browserShellMode: {
      value: true,
      type: 'boolean',
      envLink: 'OTHER_BROWSER_SHELL_MODE',
      description: 'Decides if the browser runs in the shell mode.'
    }
  },
  debug: {
    enable: {
      value: false,
      type: 'boolean',
      envLink: 'DEBUG_ENABLE',
      cliName: 'enableDebug',
      description: 'Enables or disables debug mode for the underlying browser.'
    },
    headless: {
      value: true,
      type: 'boolean',
      envLink: 'DEBUG_HEADLESS',
      description:
        'Controls the mode in which the browser is launched when in the debug mode.'
    },
    devtools: {
      value: false,
      type: 'boolean',
      envLink: 'DEBUG_DEVTOOLS',
      description:
        'Decides whether to enable DevTools when the browser is in a headful state.'
    },
    listenToConsole: {
      value: false,
      type: 'boolean',
      envLink: 'DEBUG_LISTEN_TO_CONSOLE',
      description:
        'Decides whether to enable a listener for console messages sent from the browser.'
    },
    dumpio: {
      value: false,
      type: 'boolean',
      envLink: 'DEBUG_DUMPIO',
      description:
        'Redirects browser process stdout and stderr to process.stdout and process.stderr.'
    },
    slowMo: {
      value: 0,
      type: 'number',
      envLink: 'DEBUG_SLOW_MO',
      description:
        'Slows down Puppeteer operations by the specified number of milliseconds.'
    },
    debuggingPort: {
      value: 9222,
      type: 'number',
      envLink: 'DEBUG_DEBUGGING_PORT',
      description: 'Specifies the debugging port.'
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
      name: 'coreScripts',
      message: 'Available core scripts',
      instructions: 'Space: Select specific, A: Select all, Enter: Confirm.',
      choices: defaultConfig.highcharts.coreScripts.value
    },
    {
      type: 'multiselect',
      name: 'moduleScripts',
      message: 'Available module scripts',
      instructions: 'Space: Select specific, A: Select all, Enter: Confirm.',
      choices: defaultConfig.highcharts.moduleScripts.value
    },
    {
      type: 'multiselect',
      name: 'indicatorScripts',
      message: 'Available indicator scripts',
      instructions: 'Space: Select specific, A: Select all, Enter: Confirm.',
      choices: defaultConfig.highcharts.indicatorScripts.value
    },
    {
      type: 'list',
      name: 'customScripts',
      message: 'Custom scripts',
      initial: defaultConfig.highcharts.customScripts.value.join(','),
      separator: ','
    },
    {
      type: 'toggle',
      name: 'forceFetch',
      message: 'Force re-fetch the scripts',
      initial: defaultConfig.highcharts.forceFetch.value
    },
    {
      type: 'text',
      name: 'cachePath',
      message: 'The path to the cache directory',
      initial: defaultConfig.highcharts.cachePath.value
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
      type: 'text',
      name: 'proxy.host',
      message: 'The host of the proxy server to use',
      initial: defaultConfig.server.proxy.host.value
    },
    {
      type: 'number',
      name: 'proxy.port',
      message: 'The port of the proxy server to use',
      initial: defaultConfig.server.proxy.port.value
    },
    {
      type: 'number',
      name: 'proxy.timeout',
      message: 'The timeout for the proxy server to use',
      initial: defaultConfig.server.proxy.timeout.value
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
      message:
        'A log file name. Set with --toFile and --logDest to enable file logging',
      initial: defaultConfig.logging.file.value
    },
    {
      type: 'text',
      name: 'dest',
      message: 'The path to a log file when the file logging is enabled',
      initial: defaultConfig.logging.dest.value
    },
    {
      type: 'toggle',
      name: 'toConsole',
      message: 'Enable logging to the console',
      initial: defaultConfig.logging.toConsole.value
    },
    {
      type: 'toggle',
      name: 'toFile',
      message: 'Enables logging to a file',
      initial: defaultConfig.logging.toFile.value
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
      type: 'text',
      name: 'nodeEnv',
      message: 'The type of Node.js environment',
      initial: defaultConfig.other.nodeEnv.value
    },
    {
      type: 'toggle',
      name: 'listenToProcessExits',
      message: 'Set to false to skip attaching process.exit handlers',
      initial: defaultConfig.other.listenToProcessExits.value
    },
    {
      type: 'toggle',
      name: 'noLogo',
      message: 'Skip printing the logo on startup. Replaced by simple text',
      initial: defaultConfig.other.noLogo.value
    },
    {
      type: 'toggle',
      name: 'hardResetPage',
      message: 'Decides if the page content should be reset entirely',
      initial: defaultConfig.other.hardResetPage.value
    },
    {
      type: 'toggle',
      name: 'browserShellMode',
      message: 'Decides if the browser runs in the shell mode',
      initial: defaultConfig.other.browserShellMode.value
    }
  ],
  debug: [
    {
      type: 'toggle',
      name: 'enable',
      message: 'Enables debug mode for the browser instance',
      initial: defaultConfig.debug.enable.value
    },
    {
      type: 'toggle',
      name: 'headless',
      message: 'The mode setting for the browser',
      initial: defaultConfig.debug.headless.value
    },
    {
      type: 'toggle',
      name: 'devtools',
      message: 'The DevTools for the headful browser',
      initial: defaultConfig.debug.devtools.value
    },
    {
      type: 'toggle',
      name: 'listenToConsole',
      message: 'The event listener for console messages from the browser',
      initial: defaultConfig.debug.listenToConsole.value
    },
    {
      type: 'toggle',
      name: 'dumpio',
      message: 'Redirects the browser stdout and stderr to NodeJS process',
      initial: defaultConfig.debug.dumpio.value
    },
    {
      type: 'number',
      name: 'slowMo',
      message: 'Puppeteer operations slow down in milliseconds',
      initial: defaultConfig.debug.slowMo.value
    },
    {
      type: 'number',
      name: 'debuggingPort',
      message: 'The port number for debugging',
      initial: defaultConfig.debug.debuggingPort.value
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
