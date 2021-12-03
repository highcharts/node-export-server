module.exports = {
  // The default values and descriptions of the CLI options
  cli: {
    export: {
      infile: {
        value: false,
        type: 'string',
        description:
          'The input file name along with a type (jpg, jpeg, png, pdf or svg). It can be a correct JSON or SVG file.'
      },
      instr: {
        value: false,
        type: 'string',
        description:
          'An input in a form of stringified JSON or SVG file. Overrides the --infile.'
      },
      /// TO DO: Check how it's different from the instr
      // options: {
      //   value: false,
      //   type: 'string',
      //   description: 'An alias for the --instr.'
      // },
      ///
      outfile: {
        value: false,
        type: 'string',
        description:
          'The output file name along with a type (jpg, jpeg, png, pdf or svg). Ignores the --type.'
      },
      /// TO DO: Check if the type is required
      // type: {
      //   value: 'png',
      //   type: 'string',
      //   description: 'The format of a file to export to. Can be jpg, jpeg, png, pdf or svg.'
      // },
      ///
      constr: {
        value: 'Chart',
        type: 'string',
        description:
          'The constructor to use. Can be Chart, StockChart or MapChart.'
      },
      scale: {
        value: 1,
        type: 'number',
        description: 'The scale of the exported chart. Ranges between 1 and 5.'
      },
      width: {
        value: false,
        type: 'number',
        description:
          'The width of the exported chart. Overrides the option in the chart settings.'
      },
      globalOptions: {
        value: false,
        type: 'string',
        description:
          'A JSON string with options to be passed to the Highcharts.setOptions.'
      },
      batch: {
        value: false,
        type: 'string',
        description:
          'Starts a batch job. A string that contains input/output pairs: "in=out;in=out;..".'
      }
    },
    resources: {
      allowCodeExecution: {
        value: false,
        type: 'boolean',
        description:
          'If set to true, allow for the execution of arbitrary code when exporting.'
      },
      /// TO DO: Check how it's different from the allowCodeExecution
      // allowFileResources: {
      //   value: true,
      //   type: 'boolean',
      //   description: 'Allow injecting resources from the filesystem. Has no effect when running as a server.'
      // },
      ///
      resources: {
        value: false,
        type: 'string',
        description:
          'An additional resource in a form of stringified JSON. It can contains files, js and css sections.'
      },
      callback: {
        value: false,
        type: 'string',
        description: 'A JavaScript file with a function to run on construction.'
      },
      fromFile: {
        value: false,
        type: 'string',
        description: 'A file that contains predefined config to use.'
      },
      config: {
        value: false,
        type: 'string',
        description:
          'Allows to set options through a prompt and save in the provided config file.'
      }
    },
    server: {
      enable: {
        value: false,
        type: 'boolean',
        cliName: 'enableServer',
        description: 'Starts a server on 0.0.0.0.'
      },
      host: {
        value: false,
        type: 'string',
        description:
          'A hostname of a server. Also starts a server listening on the supplied hostname.'
      },
      port: {
        value: 7801,
        type: 'number',
        description: 'A port of a server. Defaults to 7801.'
      },
      ssl: {
        enable: {
          value: false,
          type: 'boolean',
          cliName: 'enableSsl',
          description: 'Enables SSL protocol.'
        },
        force: {
          value: false,
          type: 'boolean',
          cliName: 'sslForced',
          description: 'Allows to force to only serve over HTTPS.'
        },
        port: {
          value: 443,
          type: 'number',
          cliName: 'sslPort',
          description: 'A port on which to run the SSL server.'
        },
        certPath: {
          value: false,
          type: 'string',
          description: 'A path where to find the SSL certificate/key.'
        }
      },
      rateLimiting: {
        enable: {
          value: false,
          type: 'boolean',
          cliName: 'enableRateLimiting',
          description: 'Enables rate limiting.'
        },
        maxRequests: {
          value: false,
          type: 'number',
          description: 'Max requests allowed in a one minute.'
        },
        skipKey: {
          value: false,
          type: 'number|string',
          description:
            'Allows bypassing the rate limiter and should be provided with skipToken argument.'
        },
        skipToken: {
          value: false,
          type: 'number|string',
          description:
            'Allows bypassing the rate limiter and should be provided with skipKey argument.'
        }
      }
    },
    pool: {
      initialWorkers: {
        value: 8,
        type: 'number',
        description: 'The number of initial workers to spawn.'
      },
      /// TO DO: Check if should be passed to CLI
      // maxWorkers: {
      //   value: 8,
      //   type: 'number',
      //   description: 'The number of max workers to spawn.'
      // },
      ///
      workLimit: {
        value: 60,
        type: 'number',
        description:
          'The pieces of work that can be performed before restarting a puppeteer process.'
      },
      queueSize: {
        value: 5,
        type: 'number',
        description: 'The size of the request overflow queue.'
      },
      timeoutThreshold: {
        value: 8,
        type: 'number',
        description: 'The number of seconds before timing out.'
      },
      /// TO DO: Check if should be passed to CLI
      // reaper: {
      //   value: true,
      //   type: 'boolean',
      //   description: 'The reaper to remove hanging processes.'
      // },
      ///
      listenToProcessExits: {
        value: true,
        type: 'boolean',
        description:
          'Set to false in order to skip attaching process.exit handlers.'
      }
      /// TO DO: Check if should be passed to CLI
      // benchmarking: {
      //   value: true,
      //   type: 'boolean',
      //   description: 'Set benchmarking.'
      // }
      ///
    },
    logging: {
      level: {
        value: 2,
        type: 'number',
        cliName: 'logLevel',
        description:
          'The log level (0: silent, 1: error, 2: warning, 3: notice, 4: verbose).'
      },
      file: {
        value: 'highcharts-export-server.log',
        type: 'string',
        cliName: 'logFile',
        description:
          'A name of a log file. The --logDest also needs to be set to enable file logging.'
      },
      dest: {
        value: false,
        type: 'string',
        cliName: 'logDest',
        description: 'A path to log files. It enables file logging.'
      }
    },
    ui: {
      enable: {
        value: false,
        type: 'boolean',
        cliName: 'enableUi',
        description: 'Enables UI for the export server.'
      },
      route: {
        value: '/',
        type: 'string',
        cliName: 'uiRoute',
        description: 'A route to attach the UI to.'
      }
    },
    other: {
      nologo: {
        value: false,
        type: 'boolean',
        description:
          'Skip printing the logo on a startup. Will be replaced by a simple text.'
      },
      tmpdir: {
        value: 'tmp/',
        type: 'string',
        description: 'A path to temporary files.'
      }
    }
  },
  // Argument nesting of all export server options
  nestedArgs: {
    // Export section
    infile: 'export.infile',
    instr: 'export.instr',
    options: 'export.options',
    outfile: 'export.outfile',
    type: 'export.type',
    constr: 'export.constr',
    scale: 'export.scale',
    width: 'export.width',
    globalOptions: 'export.globalOptions',
    batch: 'export.batch',

    // Resources section
    allowCodeExecution: 'resources.allowCodeExecution',
    allowFileResources: 'resources.allowFileResources',
    resources: 'resources.resources',
    callback: 'resources.callback',
    fromFile: 'resources.fromFile',
    config: 'resources.config',

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
    listenToProcessExits: 'pool.listenToProcessExits',
    benchmarking: 'pool.benchmarking',

    // Logging section
    logLevel: 'logging.level',
    logFile: 'logging.file',
    logDest: 'logging.dest',

    // UI section
    enableUi: 'ui.enable',
    uiRoute: 'ui.route',

    // Other section
    noLogo: 'other.noLogo',
    tmpdir: 'other.tmpdir'
  }
};
