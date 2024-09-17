/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * The configuration object containing all available options, organized by
 * sections.
 *
 * This object includes:
 * - Default values for each option.
 * - Data types for validation.
 * - Names of corresponding environment variables.
 * - Descriptions of each property.
 * - [Optional] Corresponding CLI argument names for CLI usage.
 * - [Optional] Legacy names from the previous PhantomJS-based server.
 * - [Optional] Information used for prompts in interactive configuration.
 */
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
      type: ['string[]'],
      envLink: 'PUPPETEER_ARGS',
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
      type: ['string'],
      envLink: 'HIGHCHARTS_VERSION',
      description: 'Highcharts version',
      promptOptions: {
        type: 'text'
      }
    },
    cdnUrl: {
      value: 'https://code.highcharts.com',
      type: ['string'],
      envLink: 'HIGHCHARTS_CDN_URL',
      description: 'CDN URL for Highcharts scripts',
      promptOptions: {
        type: 'text'
      }
    },
    forceFetch: {
      value: false,
      type: ['boolean'],
      envLink: 'HIGHCHARTS_FORCE_FETCH',
      description: 'Flag to refetch scripts after each server rerun',
      promptOptions: {
        type: 'toggle'
      }
    },
    cachePath: {
      value: '.cache',
      type: ['string'],
      envLink: 'HIGHCHARTS_CACHE_PATH',
      description: 'Directory path for cached Highcharts scripts',
      promptOptions: {
        type: 'text'
      }
    },
    coreScripts: {
      value: ['highcharts', 'highcharts-more', 'highcharts-3d'],
      type: ['string[]'],
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
      type: ['string[]'],
      envLink: 'HIGHCHARTS_MODULE_SCRIPTS',
      description: 'Highcharts module scripts to fetch',
      promptOptions: {
        type: 'multiselect',
        instructions: 'Space: Select specific, A: Select all, Enter: Confirm'
      }
    },
    indicatorScripts: {
      value: ['indicators-all'],
      type: ['string[]'],
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
      type: ['string[]'],
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
      type: ['string', 'null'],
      description:
        'Input filename with type, formatted correctly as JSON or SVG'
    },
    instr: {
      value: null,
      type: ['object', 'string', 'null'],
      description:
        'Overrides the `infile` with JSON, stringified JSON, or SVG input'
    },
    options: {
      value: null,
      type: ['object', 'string', 'null'],
      description: 'Alias for the `instr` option'
    },
    outfile: {
      value: 'chart.png',
      type: ['string', 'null'],
      description:
        'Output filename with type. Can be jpeg, png, pdf, or svg and ignores `type` option',
      promptOptions: {
        type: 'text'
      }
    },
    type: {
      value: 'png',
      type: ['string'],
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
      type: ['string'],
      envLink: 'EXPORT_CONSTR',
      description:
        'Chart constructor. Can be chart, stockChart, mapChart, or ganttChart',
      promptOptions: {
        type: 'select',
        hint: 'Default: chart',
        choices: ['chart', 'stockChart', 'mapChart', 'ganttChart']
      }
    },
    defaultHeight: {
      value: 400,
      type: ['number'],
      envLink: 'EXPORT_DEFAULT_HEIGHT',
      description: 'Default height of the exported chart if not set',
      promptOptions: {
        type: 'number'
      }
    },
    defaultWidth: {
      value: 600,
      type: ['number'],
      envLink: 'EXPORT_DEFAULT_WIDTH',
      description: 'Default width of the exported chart if not set',
      promptOptions: {
        type: 'number'
      }
    },
    defaultScale: {
      value: 1,
      type: ['number'],
      envLink: 'EXPORT_DEFAULT_SCALE',
      description:
        'Default scale of the exported chart if not set. Ranges from 0.1 to 5.0',
      promptOptions: {
        type: 'number',
        min: 0.1,
        max: 5
      }
    },
    height: {
      value: null,
      type: ['number', 'null'],
      description: 'Height of the exported chart, overrides chart settings'
    },
    width: {
      value: null,
      type: ['number', 'null'],
      description: 'Width of the exported chart, overrides chart settings'
    },
    scale: {
      value: null,
      type: ['number', 'null'],
      description:
        'Scale of the exported chart, overrides chart settings. Ranges from 0.1 to 5.0'
    },
    globalOptions: {
      value: null,
      type: ['object', 'string', 'null'],
      description:
        'JSON, stringified JSON or filename with global options for Highcharts.setOptions'
    },
    themeOptions: {
      value: null,
      type: ['object', 'string', 'null'],
      description:
        'JSON, stringified JSON or filename with theme options for Highcharts.setOptions'
    },
    batch: {
      value: null,
      type: ['string', 'null'],
      description:
        'Batch job string with input/output pairs: "in=out;in=out;..."'
    },
    rasterizationTimeout: {
      value: 1500,
      type: ['number'],
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
      type: ['boolean'],
      envLink: 'CUSTOM_LOGIC_ALLOW_CODE_EXECUTION',
      description:
        'Allows or disallows execution of arbitrary code during exporting',
      promptOptions: {
        type: 'toggle'
      }
    },
    allowFileResources: {
      value: false,
      type: ['boolean'],
      envLink: 'CUSTOM_LOGIC_ALLOW_FILE_RESOURCES',
      description:
        'Allows or disallows injection of filesystem resources (disabled in server mode)',
      promptOptions: {
        type: 'toggle'
      }
    },
    customCode: {
      value: null,
      type: ['string', 'null'],
      description:
        'Custom code to execute before chart initialization. Can be a function, code wrapped in a function, or a .js filename'
    },
    callback: {
      value: null,
      type: ['string', 'null'],
      description:
        'JavaScript code to run during construction. Can be a function or a .js filename'
    },
    resources: {
      value: null,
      type: ['object', 'string', 'null'],
      description:
        'Additional resources as JSON, stringified JSON, or filename, containing files, js, and css sections'
    },
    loadConfig: {
      value: null,
      type: ['string', 'null'],
      legacyName: 'fromFile',
      description: 'File with a pre-defined configuration to use'
    },
    createConfig: {
      value: null,
      type: ['string', 'null'],
      description:
        'Prompt-based option setting, saved to a provided config file'
    }
  },
  server: {
    enable: {
      value: false,
      type: ['boolean'],
      envLink: 'SERVER_ENABLE',
      cliName: 'enableServer',
      description: 'Starts the server when true',
      promptOptions: {
        type: 'toggle'
      }
    },
    host: {
      value: '0.0.0.0',
      type: ['string'],
      envLink: 'SERVER_HOST',
      description: 'Hostname of the server',
      promptOptions: {
        type: 'text'
      }
    },
    port: {
      value: 7801,
      type: ['number'],
      envLink: 'SERVER_PORT',
      description: 'Port number for the server',
      promptOptions: {
        type: 'number'
      }
    },
    benchmarking: {
      value: false,
      type: ['boolean'],
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
        type: ['string', 'null'],
        envLink: 'SERVER_PROXY_HOST',
        cliName: 'proxyHost',
        description: 'Host of the proxy server, if applicable',
        promptOptions: {
          type: 'text'
        }
      },
      port: {
        value: null,
        type: ['number', 'null'],
        envLink: 'SERVER_PROXY_PORT',
        cliName: 'proxyPort',
        description: 'Port of the proxy server, if applicable',
        promptOptions: {
          type: 'number'
        }
      },
      timeout: {
        value: 5000,
        type: ['number'],
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
        type: ['boolean'],
        envLink: 'SERVER_RATE_LIMITING_ENABLE',
        cliName: 'enableRateLimiting',
        description: 'Enables or disables rate limiting on the server',
        promptOptions: {
          type: 'toggle'
        }
      },
      maxRequests: {
        value: 10,
        type: ['number'],
        envLink: 'SERVER_RATE_LIMITING_MAX_REQUESTS',
        legacyName: 'rateLimit',
        description: 'Maximum number of requests allowed per minute',
        promptOptions: {
          type: 'number'
        }
      },
      window: {
        value: 1,
        type: ['number'],
        envLink: 'SERVER_RATE_LIMITING_WINDOW',
        description: 'Time window in minutes for rate limiting',
        promptOptions: {
          type: 'number'
        }
      },
      delay: {
        value: 0,
        type: ['number'],
        envLink: 'SERVER_RATE_LIMITING_DELAY',
        description:
          'Delay duration between successive requests before reaching the limit',
        promptOptions: {
          type: 'number'
        }
      },
      trustProxy: {
        value: false,
        type: ['boolean'],
        envLink: 'SERVER_RATE_LIMITING_TRUST_PROXY',
        description: 'Set to true if the server is behind a load balancer',
        promptOptions: {
          type: 'toggle'
        }
      },
      skipKey: {
        value: null,
        type: ['string', 'null'],
        envLink: 'SERVER_RATE_LIMITING_SKIP_KEY',
        description: 'Key to bypass the rate limiter, used with `skipToken`',
        promptOptions: {
          type: 'text'
        }
      },
      skipToken: {
        value: null,
        type: ['string', 'null'],
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
        type: ['boolean'],
        envLink: 'SERVER_SSL_ENABLE',
        cliName: 'enableSsl',
        description: 'Enables or disables SSL protocol',
        promptOptions: {
          type: 'toggle'
        }
      },
      force: {
        value: false,
        type: ['boolean'],
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
        type: ['number'],
        envLink: 'SERVER_SSL_PORT',
        cliName: 'sslPort',
        description: 'Port for the SSL server',
        promptOptions: {
          type: 'number'
        }
      },
      certPath: {
        value: null,
        type: ['string', 'null'],
        envLink: 'SERVER_SSL_CERT_PATH',
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
      type: ['number'],
      envLink: 'POOL_MIN_WORKERS',
      description: 'Minimum and initial number of pool workers to spawn',
      promptOptions: {
        type: 'number'
      }
    },
    maxWorkers: {
      value: 8,
      type: ['number'],
      envLink: 'POOL_MAX_WORKERS',
      legacyName: 'workers',
      description: 'Maximum number of pool workers to spawn',
      promptOptions: {
        type: 'number'
      }
    },
    workLimit: {
      value: 40,
      type: ['number'],
      envLink: 'POOL_WORK_LIMIT',
      description: 'Number of tasks a worker can handle before restarting',
      promptOptions: {
        type: 'number'
      }
    },
    acquireTimeout: {
      value: 5000,
      type: ['number'],
      envLink: 'POOL_ACQUIRE_TIMEOUT',
      description: 'Timeout in milliseconds for acquiring a resource',
      promptOptions: {
        type: 'number'
      }
    },
    createTimeout: {
      value: 5000,
      type: ['number'],
      envLink: 'POOL_CREATE_TIMEOUT',
      description: 'Timeout in milliseconds for creating a resource',
      promptOptions: {
        type: 'number'
      }
    },
    destroyTimeout: {
      value: 5000,
      type: ['number'],
      envLink: 'POOL_DESTROY_TIMEOUT',
      description: 'Timeout in milliseconds for destroying a resource',
      promptOptions: {
        type: 'number'
      }
    },
    idleTimeout: {
      value: 30000,
      type: ['number'],
      envLink: 'POOL_IDLE_TIMEOUT',
      description: 'Timeout in milliseconds for destroying idle resources',
      promptOptions: {
        type: 'number'
      }
    },
    createRetryInterval: {
      value: 200,
      type: ['number'],
      envLink: 'POOL_CREATE_RETRY_INTERVAL',
      description:
        'Interval in milliseconds before retrying resource creation on failure',
      promptOptions: {
        type: 'number'
      }
    },
    reaperInterval: {
      value: 1000,
      type: ['number'],
      envLink: 'POOL_REAPER_INTERVAL',
      description:
        'Interval in milliseconds to check and destroy idle resources',
      promptOptions: {
        type: 'number'
      }
    },
    benchmarking: {
      value: false,
      type: ['boolean'],
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
      type: ['number'],
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
      type: ['string'],
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
      type: ['string'],
      envLink: 'LOGGING_DEST',
      cliName: 'logDest',
      description: 'Path to store log files. Requires `logToFile` to be set',
      promptOptions: {
        type: 'text'
      }
    },
    toConsole: {
      value: true,
      type: ['boolean'],
      envLink: 'LOGGING_TO_CONSOLE',
      cliName: 'logToConsole',
      description: 'Enables or disables console logging',
      promptOptions: {
        type: 'toggle'
      }
    },
    toFile: {
      value: true,
      type: ['boolean'],
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
      type: ['boolean'],
      envLink: 'UI_ENABLE',
      cliName: 'enableUi',
      description: 'Enables or disables the UI for the export server',
      promptOptions: {
        type: 'toggle'
      }
    },
    route: {
      value: '/',
      type: ['string'],
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
      type: ['string'],
      envLink: 'OTHER_NODE_ENV',
      description: 'The Node.js environment type',
      promptOptions: {
        type: 'text'
      }
    },
    listenToProcessExits: {
      value: true,
      type: ['boolean'],
      envLink: 'OTHER_LISTEN_TO_PROCESS_EXITS',
      description: 'Whether or not to attach process.exit handlers',
      promptOptions: {
        type: 'toggle'
      }
    },
    noLogo: {
      value: false,
      type: ['boolean'],
      envLink: 'OTHER_NO_LOGO',
      description: 'Display or skip printing the logo on startup',
      promptOptions: {
        type: 'toggle'
      }
    },
    hardResetPage: {
      value: false,
      type: ['boolean'],
      envLink: 'OTHER_HARD_RESET_PAGE',
      description: 'Whether or not to reset the page content entirely',
      promptOptions: {
        type: 'toggle'
      }
    },
    browserShellMode: {
      value: true,
      type: ['boolean'],
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
      type: ['boolean'],
      envLink: 'DEBUG_ENABLE',
      cliName: 'enableDebug',
      description: 'Enables or disables debug mode for the underlying browser',
      promptOptions: {
        type: 'toggle'
      }
    },
    headless: {
      value: true,
      type: ['boolean'],
      envLink: 'DEBUG_HEADLESS',
      description:
        'Whether or not to set the browser to run in headless mode during debugging',
      promptOptions: {
        type: 'toggle'
      }
    },
    devtools: {
      value: false,
      type: ['boolean'],
      envLink: 'DEBUG_DEVTOOLS',
      description: 'Enables or disables DevTools in headful mode',
      promptOptions: {
        type: 'toggle'
      }
    },
    listenToConsole: {
      value: false,
      type: ['boolean'],
      envLink: 'DEBUG_LISTEN_TO_CONSOLE',
      description:
        'Enables or disables listening to console messages from the browser',
      promptOptions: {
        type: 'toggle'
      }
    },
    dumpio: {
      value: false,
      type: ['boolean'],
      envLink: 'DEBUG_DUMPIO',
      description:
        'Redirects or not browser stdout and stderr to process.stdout and process.stderr',
      promptOptions: {
        type: 'toggle'
      }
    },
    slowMo: {
      value: 0,
      type: ['number'],
      envLink: 'DEBUG_SLOW_MO',
      description: 'Delays Puppeteer operations by the specified milliseconds',
      promptOptions: {
        type: 'number'
      }
    },
    debuggingPort: {
      value: 9222,
      type: ['number'],
      envLink: 'DEBUG_DEBUGGING_PORT',
      description: 'Port used for debugging',
      promptOptions: {
        type: 'number'
      }
    }
  },
  webSocket: {
    enable: {
      value: false,
      type: ['boolean'],
      envLink: 'WEB_SOCKET_ENABLE',
      cliName: 'enableWs',
      description: 'Enables or disables the WebSocket connection',
      promptOptions: {
        type: 'toggle'
      }
    },
    reconnect: {
      value: false,
      type: ['boolean'],
      envLink: 'WEB_SOCKET_RECONNECT',
      cliName: 'wsReconnect',
      description:
        'Whether or not to attempt to reconnect to the WebSocket server if disconnected',
      promptOptions: {
        type: 'toggle'
      }
    },
    rejectUnauthorized: {
      value: false,
      type: ['boolean'],
      envLink: 'WEB_SOCKET_REJECT_UNAUTHORIZED',
      cliName: 'wsRejectUnauthorized',
      description:
        "Whether or not to client should verify the server's SSL/TLS certificate during the handshake",
      promptOptions: {
        type: 'toggle'
      }
    },
    pingTimeout: {
      value: 16000,
      type: ['number'],
      envLink: 'WEB_SOCKET_PING_TIMEOUT',
      cliName: 'wsPingTimeout',
      description:
        'Timeout in milliseconds for the heartbeat mechanism between client and server',
      promptOptions: {
        type: 'number'
      }
    },
    reconnectInterval: {
      value: 3000,
      type: ['number'],
      envLink: 'WEB_SOCKET_RECONNECT_INTERVAL',
      cliName: 'wsReconnectInterval',
      description: 'Interval in milliseconds between reconnect attempts',
      promptOptions: {
        type: 'number'
      }
    },
    reconnectAttempts: {
      value: 3,
      type: ['number'],
      envLink: 'WEB_SOCKET_RECONNECT_ATTEMPTS',
      cliName: 'wsReconnectAttempts',
      description: 'Number of attempts to reconnect before reporting an error',
      promptOptions: {
        type: 'number'
      }
    },
    messageInterval: {
      value: 3600000,
      type: ['number'],
      envLink: 'WEB_SOCKET_MESSAGE_INTERVAL',
      cliName: 'wsMessageInterval',
      description:
        'Interval in milliseconds for automatically sending data through the WebSocket connection',
      promptOptions: {
        type: 'number'
      }
    },
    gatherAllOptions: {
      value: false,
      type: ['boolean'],
      envLink: 'WEB_SOCKET_GATHER_ALL_OPTIONS',
      cliName: 'wsGatherAllOptions',
      description:
        'Whether or not to gather all chart options or only those defined in the telemetry.json file',
      promptOptions: {
        type: 'toggle'
      }
    },
    url: {
      value: null,
      type: ['string', 'null'],
      envLink: 'WEB_SOCKET_URL',
      cliName: 'wsUrl',
      description: 'URL of the WebSocket server',
      promptOptions: {
        type: 'text'
      }
    },
    secret: {
      value: null,
      type: ['string', 'null'],
      envLink: 'WEB_SOCKET_SECRET',
      cliName: 'wsSecret',
      description:
        'Secret used to create a JSON Web Token for the WebSocket server',
      promptOptions: {
        type: 'text'
      }
    }
  },
  payload: {
    svg: {
      value: null,
      type: ['string', 'null'],
      description: 'SVG string representation of the chart to render'
    },
    b64: {
      value: false,
      type: ['boolean'],
      description:
        'Whether or not to the chart should be received in base64 format instead of binary',
      promptOptions: {
        type: 'toggle'
      }
    },
    noDownload: {
      value: false,
      type: ['boolean'],
      description:
        'Whether or not to include or exclude attachment headers in the response',
      promptOptions: {
        type: 'toggle'
      }
    },
    requestId: {
      value: null,
      type: ['string', 'null'],
      description: 'Unique identifier for each request served by the server'
    }
  }
};

// Argument nesting level of all export server options
export const nestedArgs = _createNestedArgs(defaultConfig);

/**
 * Maps old-structured configuration options (PhantomJS) to a new format
 * (Puppeteer).
 *
 * This function converts flat, old-structured options into a new, nested
 * configuration format based on a predefined mapping (`nestedArgs`). The new
 * format is used for Puppeteer, while the old format was used for PhantomJS.
 *
 * @param {Object} oldOptions - The old, flat configuration options to be
 * converted.
 *
 * @returns {Object} A new object containing options structured according to
 * the mapping defined in `nestedArgs`.
 */
export function mapToNewConfig(oldOptions) {
  // An object for the new structured options
  const newOptions = {};

  // Iterate over each key-value pair in the old-structured options
  for (const [key, value] of Object.entries(oldOptions)) {
    // If there is a nested mapping, split it into a properties chain
    const propertiesChain = nestedArgs[key] ? nestedArgs[key].split('.') : [];

    // If it is the last property in the chain, assign the value, otherwise,
    // create or reuse the nested object
    propertiesChain.reduce(
      (obj, prop, index) =>
        (obj[prop] =
          propertiesChain.length - 1 === index ? value : obj[prop] || {}),
      newOptions
    );
  }

  // Return the new, structured options object
  return newOptions;
}

/**
 * Prints usage information for CLI arguments, displaying available options and
 * their descriptions. It can list properties recursively if categories contain
 * nested options.
 */
export function printUsage() {
  // Display README and general usage information
  console.log(
    '\nUsage of CLI arguments:'.bold,
    '\n-----',
    `\nFor more detailed information, visit the README file at: ${'https://github.com/highcharts/node-export-server#readme'.green}`,
    '\n'
  );

  // Iterate through each category in the `defaultConfig` and display usage info
  Object.keys(defaultConfig).forEach((category) => {
    console.log(`${category.toUpperCase()}`.red);
    _cycleCategories(defaultConfig[category]);
  });
}

/**
 * Recursively generates a mapping of nested argument chains from a nested
 * config object.
 *
 * This function traverses a nested object and creates a mapping where each key
 * is an argument name (either from `cliName`, `legacyName`, or the original
 * key) and each value is a string representing the chain of nested properties
 * leading to that argument.
 *
 * @param {Object} config - The nested configuration object containing argument.
 * @param {Object} [nestedArgs={}] - The accumulator object for storing the
 * resulting argument chains.
 * @param {string} [propChain=''] - The current chain of nested properties, used
 * internally during recursion.
 *
 * @returns {Object} An object mapping argument names to their corresponding
 * nested property chains.
 */
function _createNestedArgs(config, nestedArgs = {}, propChain = '') {
  Object.keys(config).forEach((key) => {
    // Get the specific section
    const entry = config[key];

    // Check if there is still more depth to traverse
    if (typeof entry.value === 'undefined') {
      // Recurse into deeper levels of nested arguments
      _createNestedArgs(entry, nestedArgs, `${propChain}.${key}`);
    } else {
      // Create the chain of nested arguments
      nestedArgs[entry.cliName || key] = `${propChain}.${key}`.substring(1);

      // Support for the legacy, PhantomJS properties names
      if (entry.legacyName !== undefined) {
        nestedArgs[entry.legacyName] = `${propChain}.${key}`.substring(1);
      }
    }
  });

  // Return the object with nested argument chains
  return nestedArgs;
}

/**
 * Recursively traverses the options object to print the usage information for
 * each option category and individual option.
 *
 * @param {Object} options - The options object containing CLI options. It may
 * include nested categories and individual options.
 */
function _cycleCategories(options) {
  for (const [name, option] of Object.entries(options)) {
    // If the current entry is a category and not a leaf option, recurse into it
    if (!Object.prototype.hasOwnProperty.call(option, 'value')) {
      _cycleCategories(option);
    } else {
      const descName = `  --${option.cliName || name} ${
        ('<' + option.type.join('|') + '>').green
      }\n`;

      // Display correctly aligned messages
      console.log(
        descName,
        `[Default: ${String(option.value).bold}]`.blue,
        '-',
        `${option.description}.`,
        '\n'
      );
    }
  }
}

export default {
  defaultConfig,
  nestedArgs,
  mapToNewConfig,
  printUsage
};
