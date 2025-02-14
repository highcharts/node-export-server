/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Configuration management module for the Highcharts Export Server.
 * It provides a default configuration object with predefined default values,
 * descriptions, and characteristics for each option used in the Export Server.
 */

/**
 * The default configuration object containing all available options, organized
 * by sections.
 *
 * This object includes:
 * - Default values for each option.
 * - Data types for validation.
 * - Names of corresponding environment variables.
 * - Descriptions of each property.
 * - Information used for prompts in interactive configuration.
 * - [Optional] Corresponding CLI argument names for CLI usage.
 * - [Optional] Legacy names from the previous PhantomJS-based server.
 */
const defaultConfig = {
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
      types: ['string[]'],
      envLink: 'PUPPETEER_ARGS',
      cliName: 'puppeteerArgs',
      description: 'Array of Puppeteer arguments',
      promptOptions: {
        type: 'list',
        separator: ';'
      }
    }
  },
  highcharts: {
    version: {
      value: 'latest',
      types: ['string'],
      envLink: 'HIGHCHARTS_VERSION',
      description: 'Highcharts version',
      promptOptions: {
        type: 'text'
      }
    },
    cdnUrl: {
      value: 'https://code.highcharts.com',
      types: ['string'],
      envLink: 'HIGHCHARTS_CDN_URL',
      description: 'CDN URL for Highcharts scripts',
      promptOptions: {
        type: 'text'
      }
    },
    forceFetch: {
      value: false,
      types: ['boolean'],
      envLink: 'HIGHCHARTS_FORCE_FETCH',
      description: 'Flag to refetch scripts after each server rerun',
      promptOptions: {
        type: 'toggle'
      }
    },
    cachePath: {
      value: '.cache',
      types: ['string'],
      envLink: 'HIGHCHARTS_CACHE_PATH',
      description: 'Directory path for cached Highcharts scripts',
      promptOptions: {
        type: 'text'
      }
    },
    coreScripts: {
      value: ['highcharts', 'highcharts-more', 'highcharts-3d'],
      types: ['string[]'],
      envLink: 'HIGHCHARTS_CORE_SCRIPTS',
      description: 'Highcharts core scripts to fetch',
      promptOptions: {
        type: 'multiselect',
        instructions: 'Space: Select specific, A: Select all, Enter: Confirm'
      }
    },
    moduleScripts: {
      value: [
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
      types: ['string[]'],
      envLink: 'HIGHCHARTS_MODULE_SCRIPTS',
      description: 'Highcharts module scripts to fetch',
      promptOptions: {
        type: 'multiselect',
        instructions: 'Space: Select specific, A: Select all, Enter: Confirm'
      }
    },
    indicatorScripts: {
      value: ['indicators-all'],
      types: ['string[]'],
      envLink: 'HIGHCHARTS_INDICATOR_SCRIPTS',
      description: 'Highcharts indicator scripts to fetch',
      promptOptions: {
        type: 'multiselect',
        instructions: 'Space: Select specific, A: Select all, Enter: Confirm'
      }
    },
    customScripts: {
      value: [
        'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
      ],
      types: ['string[]'],
      envLink: 'HIGHCHARTS_CUSTOM_SCRIPTS',
      description: 'Additional custom scripts or dependencies to fetch',
      promptOptions: {
        type: 'list',
        separator: ';'
      }
    }
  },
  export: {
    infile: {
      value: null,
      types: ['string', 'null'],
      envLink: 'EXPORT_INFILE',
      description:
        'Input filename with type, formatted correctly as JSON or SVG',
      promptOptions: {
        type: 'text'
      }
    },
    instr: {
      value: null,
      types: ['Object', 'string', 'null'],
      envLink: 'EXPORT_INSTR',
      description:
        'Overrides the `infile` with JSON, stringified JSON, or SVG input',
      promptOptions: {
        type: 'text'
      }
    },
    options: {
      value: null,
      types: ['Object', 'string', 'null'],
      envLink: 'EXPORT_OPTIONS',
      description: 'Alias for the `instr` option',
      promptOptions: {
        type: 'text'
      }
    },
    svg: {
      value: null,
      types: ['string', 'null'],
      envLink: 'EXPORT_SVG',
      description: 'SVG string representation of the chart to render',
      promptOptions: {
        type: 'text'
      }
    },
    batch: {
      value: null,
      types: ['string', 'null'],
      envLink: 'EXPORT_BATCH',
      description:
        'Batch job string with input/output pairs: "in=out;in=out;..."',
      promptOptions: {
        type: 'text'
      }
    },
    outfile: {
      value: null,
      types: ['string', 'null'],
      envLink: 'EXPORT_OUTFILE',
      description:
        'Output filename with type. Can be jpeg, png, pdf, or svg and ignores `type` option',
      promptOptions: {
        type: 'text'
      }
    },
    type: {
      value: 'png',
      types: ['string'],
      envLink: 'EXPORT_TYPE',
      description: 'File export format. Can be jpeg, png, pdf, or svg',
      promptOptions: {
        type: 'select',
        hint: 'Default: png',
        choices: ['png', 'jpeg', 'pdf', 'svg']
      }
    },
    constr: {
      value: 'chart',
      types: ['string'],
      envLink: 'EXPORT_CONSTR',
      description:
        'Chart constructor. Can be chart, stockChart, mapChart, or ganttChart',
      promptOptions: {
        type: 'select',
        hint: 'Default: chart',
        choices: ['chart', 'stockChart', 'mapChart', 'ganttChart']
      }
    },
    b64: {
      value: false,
      types: ['boolean'],
      envLink: 'EXPORT_B64',
      description:
        'Whether or not to the chart should be received in Base64 format instead of binary',
      promptOptions: {
        type: 'toggle'
      }
    },
    noDownload: {
      value: false,
      types: ['boolean'],
      envLink: 'EXPORT_NO_DOWNLOAD',
      description:
        'Whether or not to include or exclude attachment headers in the response',
      promptOptions: {
        type: 'toggle'
      }
    },
    height: {
      value: null,
      types: ['number', 'null'],
      envLink: 'EXPORT_HEIGHT',
      description: 'Height of the exported chart, overrides chart settings',
      promptOptions: {
        type: 'number'
      }
    },
    width: {
      value: null,
      types: ['number', 'null'],
      envLink: 'EXPORT_WIDTH',
      description: 'Width of the exported chart, overrides chart settings',
      promptOptions: {
        type: 'number'
      }
    },
    scale: {
      value: null,
      types: ['number', 'null'],
      envLink: 'EXPORT_SCALE',
      description:
        'Scale of the exported chart, overrides chart settings. Ranges from 0.1 to 5.0',
      promptOptions: {
        type: 'number'
      }
    },
    defaultHeight: {
      value: 400,
      types: ['number'],
      envLink: 'EXPORT_DEFAULT_HEIGHT',
      description: 'Default height of the exported chart if not set',
      promptOptions: {
        type: 'number'
      }
    },
    defaultWidth: {
      value: 600,
      types: ['number'],
      envLink: 'EXPORT_DEFAULT_WIDTH',
      description: 'Default width of the exported chart if not set',
      promptOptions: {
        type: 'number'
      }
    },
    defaultScale: {
      value: 1,
      types: ['number'],
      envLink: 'EXPORT_DEFAULT_SCALE',
      description:
        'Default scale of the exported chart if not set. Ranges from 0.1 to 5.0',
      promptOptions: {
        type: 'number',
        min: 0.1,
        max: 5
      }
    },
    globalOptions: {
      value: null,
      types: ['Object', 'string', 'null'],
      envLink: 'EXPORT_GLOBAL_OPTIONS',
      description:
        'JSON, stringified JSON or filename with global options for Highcharts.setOptions',
      promptOptions: {
        type: 'text'
      }
    },
    themeOptions: {
      value: null,
      types: ['Object', 'string', 'null'],
      envLink: 'EXPORT_THEME_OPTIONS',
      description:
        'JSON, stringified JSON or filename with theme options for Highcharts.setOptions',
      promptOptions: {
        type: 'text'
      }
    },
    rasterizationTimeout: {
      value: 1500,
      types: ['number'],
      envLink: 'EXPORT_RASTERIZATION_TIMEOUT',
      description: 'Milliseconds to wait for webpage rendering',
      promptOptions: {
        type: 'number'
      }
    }
  },
  customLogic: {
    allowCodeExecution: {
      value: false,
      types: ['boolean'],
      envLink: 'CUSTOM_LOGIC_ALLOW_CODE_EXECUTION',
      description:
        'Allows or disallows execution of arbitrary code during exporting',
      promptOptions: {
        type: 'toggle'
      }
    },
    allowFileResources: {
      value: false,
      types: ['boolean'],
      envLink: 'CUSTOM_LOGIC_ALLOW_FILE_RESOURCES',
      description:
        'Allows or disallows injection of filesystem resources (disabled in server mode)',
      promptOptions: {
        type: 'toggle'
      }
    },
    customCode: {
      value: null,
      types: ['string', 'null'],
      envLink: 'CUSTOM_LOGIC_CUSTOM_CODE',
      description:
        'Custom code to execute before chart initialization. Can be a function, code wrapped in a function, or a .js filename',
      promptOptions: {
        type: 'text'
      }
    },
    callback: {
      value: null,
      types: ['string', 'null'],
      envLink: 'CUSTOM_LOGIC_CALLBACK',
      description:
        'JavaScript code to run during construction. Can be a function or a .js filename',
      promptOptions: {
        type: 'text'
      }
    },
    resources: {
      value: null,
      types: ['Object', 'string', 'null'],
      envLink: 'CUSTOM_LOGIC_RESOURCES',
      description:
        'Additional resources as JSON, stringified JSON, or filename, containing files, js, and css sections',
      promptOptions: {
        type: 'text'
      }
    },
    loadConfig: {
      value: null,
      types: ['string', 'null'],
      envLink: 'CUSTOM_LOGIC_LOAD_CONFIG',
      legacyName: 'fromFile',
      description: 'File with a pre-defined configuration to use',
      promptOptions: {
        type: 'text'
      }
    },
    createConfig: {
      value: null,
      types: ['string', 'null'],
      envLink: 'CUSTOM_LOGIC_CREATE_CONFIG',
      description:
        'Prompt-based option setting, saved to a provided config file',
      promptOptions: {
        type: 'text'
      }
    }
  },
  server: {
    enable: {
      value: false,
      types: ['boolean'],
      envLink: 'SERVER_ENABLE',
      cliName: 'enableServer',
      description: 'Starts the server when true',
      promptOptions: {
        type: 'toggle'
      }
    },
    host: {
      value: '0.0.0.0',
      types: ['string'],
      envLink: 'SERVER_HOST',
      description: 'Hostname of the server',
      promptOptions: {
        type: 'text'
      }
    },
    port: {
      value: 7801,
      types: ['number'],
      envLink: 'SERVER_PORT',
      description: 'Port number for the server',
      promptOptions: {
        type: 'number'
      }
    },
    uploadLimit: {
      value: 3,
      types: ['number'],
      envLink: 'SERVER_UPLOAD_LIMIT',
      description: 'Maximum request body size in MB',
      promptOptions: {
        type: 'number'
      }
    },
    benchmarking: {
      value: false,
      types: ['boolean'],
      envLink: 'SERVER_BENCHMARKING',
      cliName: 'serverBenchmarking',
      description:
        'Displays or not action durations in milliseconds during server requests',
      promptOptions: {
        type: 'toggle'
      }
    },
    proxy: {
      host: {
        value: null,
        types: ['string', 'null'],
        envLink: 'SERVER_PROXY_HOST',
        cliName: 'proxyHost',
        description: 'Host of the proxy server, if applicable',
        promptOptions: {
          type: 'text'
        }
      },
      port: {
        value: null,
        types: ['number', 'null'],
        envLink: 'SERVER_PROXY_PORT',
        cliName: 'proxyPort',
        description: 'Port of the proxy server, if applicable',
        promptOptions: {
          type: 'number'
        }
      },
      timeout: {
        value: 5000,
        types: ['number'],
        envLink: 'SERVER_PROXY_TIMEOUT',
        cliName: 'proxyTimeout',
        description:
          'Timeout in milliseconds for the proxy server, if applicable',
        promptOptions: {
          type: 'number'
        }
      }
    },
    rateLimiting: {
      enable: {
        value: false,
        types: ['boolean'],
        envLink: 'SERVER_RATE_LIMITING_ENABLE',
        cliName: 'enableRateLimiting',
        description: 'Enables or disables rate limiting on the server',
        promptOptions: {
          type: 'toggle'
        }
      },
      maxRequests: {
        value: 10,
        types: ['number'],
        envLink: 'SERVER_RATE_LIMITING_MAX_REQUESTS',
        legacyName: 'rateLimit',
        description: 'Maximum number of requests allowed per minute',
        promptOptions: {
          type: 'number'
        }
      },
      window: {
        value: 1,
        types: ['number'],
        envLink: 'SERVER_RATE_LIMITING_WINDOW',
        description: 'Time window in minutes for rate limiting',
        promptOptions: {
          type: 'number'
        }
      },
      delay: {
        value: 0,
        types: ['number'],
        envLink: 'SERVER_RATE_LIMITING_DELAY',
        description:
          'Delay duration between successive requests before reaching the limit',
        promptOptions: {
          type: 'number'
        }
      },
      trustProxy: {
        value: false,
        types: ['boolean'],
        envLink: 'SERVER_RATE_LIMITING_TRUST_PROXY',
        description: 'Set to true if the server is behind a load balancer',
        promptOptions: {
          type: 'toggle'
        }
      },
      skipKey: {
        value: null,
        types: ['string', 'null'],
        envLink: 'SERVER_RATE_LIMITING_SKIP_KEY',
        description: 'Key to bypass the rate limiter, used with `skipToken`',
        promptOptions: {
          type: 'text'
        }
      },
      skipToken: {
        value: null,
        types: ['string', 'null'],
        envLink: 'SERVER_RATE_LIMITING_SKIP_TOKEN',
        description: 'Token to bypass the rate limiter, used with `skipKey`',
        promptOptions: {
          type: 'text'
        }
      }
    },
    ssl: {
      enable: {
        value: false,
        types: ['boolean'],
        envLink: 'SERVER_SSL_ENABLE',
        cliName: 'enableSsl',
        description: 'Enables or disables SSL protocol',
        promptOptions: {
          type: 'toggle'
        }
      },
      force: {
        value: false,
        types: ['boolean'],
        envLink: 'SERVER_SSL_FORCE',
        cliName: 'sslForce',
        legacyName: 'sslOnly',
        description: 'Forces the server to use HTTPS only when true',
        promptOptions: {
          type: 'toggle'
        }
      },
      port: {
        value: 443,
        types: ['number'],
        envLink: 'SERVER_SSL_PORT',
        cliName: 'sslPort',
        description: 'Port for the SSL server',
        promptOptions: {
          type: 'number'
        }
      },
      certPath: {
        value: null,
        types: ['string', 'null'],
        envLink: 'SERVER_SSL_CERT_PATH',
        cliName: 'sslCertPath',
        legacyName: 'sslPath',
        description: 'Path to the SSL certificate/key file',
        promptOptions: {
          type: 'text'
        }
      }
    }
  },
  pool: {
    minWorkers: {
      value: 4,
      types: ['number'],
      envLink: 'POOL_MIN_WORKERS',
      description: 'Minimum and initial number of pool workers to spawn',
      promptOptions: {
        type: 'number'
      }
    },
    maxWorkers: {
      value: 8,
      types: ['number'],
      envLink: 'POOL_MAX_WORKERS',
      legacyName: 'workers',
      description: 'Maximum number of pool workers to spawn',
      promptOptions: {
        type: 'number'
      }
    },
    workLimit: {
      value: 40,
      types: ['number'],
      envLink: 'POOL_WORK_LIMIT',
      description: 'Number of tasks a worker can handle before restarting',
      promptOptions: {
        type: 'number'
      }
    },
    acquireTimeout: {
      value: 5000,
      types: ['number'],
      envLink: 'POOL_ACQUIRE_TIMEOUT',
      description: 'Timeout in milliseconds for acquiring a resource',
      promptOptions: {
        type: 'number'
      }
    },
    createTimeout: {
      value: 5000,
      types: ['number'],
      envLink: 'POOL_CREATE_TIMEOUT',
      description: 'Timeout in milliseconds for creating a resource',
      promptOptions: {
        type: 'number'
      }
    },
    destroyTimeout: {
      value: 5000,
      types: ['number'],
      envLink: 'POOL_DESTROY_TIMEOUT',
      description: 'Timeout in milliseconds for destroying a resource',
      promptOptions: {
        type: 'number'
      }
    },
    idleTimeout: {
      value: 30000,
      types: ['number'],
      envLink: 'POOL_IDLE_TIMEOUT',
      description: 'Timeout in milliseconds for destroying idle resources',
      promptOptions: {
        type: 'number'
      }
    },
    createRetryInterval: {
      value: 200,
      types: ['number'],
      envLink: 'POOL_CREATE_RETRY_INTERVAL',
      description:
        'Interval in milliseconds before retrying resource creation on failure',
      promptOptions: {
        type: 'number'
      }
    },
    reaperInterval: {
      value: 1000,
      types: ['number'],
      envLink: 'POOL_REAPER_INTERVAL',
      description:
        'Interval in milliseconds to check and destroy idle resources',
      promptOptions: {
        type: 'number'
      }
    },
    benchmarking: {
      value: false,
      types: ['boolean'],
      envLink: 'POOL_BENCHMARKING',
      cliName: 'poolBenchmarking',
      description: 'Shows statistics for the pool of resources',
      promptOptions: {
        type: 'toggle'
      }
    }
  },
  logging: {
    level: {
      value: 4,
      types: ['number'],
      envLink: 'LOGGING_LEVEL',
      cliName: 'logLevel',
      description: 'Logging verbosity level',
      promptOptions: {
        type: 'number',
        round: 0,
        min: 0,
        max: 5
      }
    },
    file: {
      value: 'highcharts-export-server.log',
      types: ['string'],
      envLink: 'LOGGING_FILE',
      cliName: 'logFile',
      description:
        'Log file name. Requires `logToFile` and `logDest` to be set',
      promptOptions: {
        type: 'text'
      }
    },
    dest: {
      value: 'log',
      types: ['string'],
      envLink: 'LOGGING_DEST',
      cliName: 'logDest',
      description: 'Path to store log files. Requires `logToFile` to be set',
      promptOptions: {
        type: 'text'
      }
    },
    toConsole: {
      value: true,
      types: ['boolean'],
      envLink: 'LOGGING_TO_CONSOLE',
      cliName: 'logToConsole',
      description: 'Enables or disables console logging',
      promptOptions: {
        type: 'toggle'
      }
    },
    toFile: {
      value: true,
      types: ['boolean'],
      envLink: 'LOGGING_TO_FILE',
      cliName: 'logToFile',
      description: 'Enables or disables logging to a file',
      promptOptions: {
        type: 'toggle'
      }
    }
  },
  ui: {
    enable: {
      value: false,
      types: ['boolean'],
      envLink: 'UI_ENABLE',
      cliName: 'enableUi',
      description: 'Enables or disables the UI for the Export Server',
      promptOptions: {
        type: 'toggle'
      }
    },
    route: {
      value: '/',
      types: ['string'],
      envLink: 'UI_ROUTE',
      cliName: 'uiRoute',
      description: 'The endpoint route for the UI',
      promptOptions: {
        type: 'text'
      }
    }
  },
  other: {
    nodeEnv: {
      value: 'production',
      types: ['string'],
      envLink: 'OTHER_NODE_ENV',
      description: 'The Node.js environment type',
      promptOptions: {
        type: 'text'
      }
    },
    listenToProcessExits: {
      value: true,
      types: ['boolean'],
      envLink: 'OTHER_LISTEN_TO_PROCESS_EXITS',
      description: 'Whether or not to attach process.exit handlers',
      promptOptions: {
        type: 'toggle'
      }
    },
    noLogo: {
      value: false,
      types: ['boolean'],
      envLink: 'OTHER_NO_LOGO',
      description: 'Display or skip printing the logo on startup',
      promptOptions: {
        type: 'toggle'
      }
    },
    hardResetPage: {
      value: false,
      types: ['boolean'],
      envLink: 'OTHER_HARD_RESET_PAGE',
      description: 'Whether or not to reset the page content entirely',
      promptOptions: {
        type: 'toggle'
      }
    },
    browserShellMode: {
      value: true,
      types: ['boolean'],
      envLink: 'OTHER_BROWSER_SHELL_MODE',
      description: 'Whether or not to set the browser to run in shell mode',
      promptOptions: {
        type: 'toggle'
      }
    }
  },
  debug: {
    enable: {
      value: false,
      types: ['boolean'],
      envLink: 'DEBUG_ENABLE',
      cliName: 'enableDebug',
      description: 'Enables or disables debug mode for the underlying browser',
      promptOptions: {
        type: 'toggle'
      }
    },
    headless: {
      value: false,
      types: ['boolean'],
      envLink: 'DEBUG_HEADLESS',
      description:
        'Whether or not to set the browser to run in headless mode during debugging',
      promptOptions: {
        type: 'toggle'
      }
    },
    devtools: {
      value: false,
      types: ['boolean'],
      envLink: 'DEBUG_DEVTOOLS',
      description: 'Enables or disables DevTools in headful mode',
      promptOptions: {
        type: 'toggle'
      }
    },
    listenToConsole: {
      value: false,
      types: ['boolean'],
      envLink: 'DEBUG_LISTEN_TO_CONSOLE',
      description:
        'Enables or disables listening to console messages from the browser',
      promptOptions: {
        type: 'toggle'
      }
    },
    dumpio: {
      value: false,
      types: ['boolean'],
      envLink: 'DEBUG_DUMPIO',
      description:
        'Redirects or not browser stdout and stderr to process.stdout and process.stderr',
      promptOptions: {
        type: 'toggle'
      }
    },
    slowMo: {
      value: 0,
      types: ['number'],
      envLink: 'DEBUG_SLOW_MO',
      description: 'Delays Puppeteer operations by the specified milliseconds',
      promptOptions: {
        type: 'number'
      }
    },
    debuggingPort: {
      value: 9222,
      types: ['number'],
      envLink: 'DEBUG_DEBUGGING_PORT',
      description: 'Port used for debugging',
      promptOptions: {
        type: 'number'
      }
    }
  }
};

export default defaultConfig;
