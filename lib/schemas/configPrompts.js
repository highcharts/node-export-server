const config = require('./config.js');

// The config descriptions object. It contains information like:
// * Type of a prompt
// * Name of an option
// * Short description of a chosen option
// * Initial value
module.exports = {
  puppeteer: [
    {
      type: 'list',
      name: 'args',
      message: 'Puppeteer arguments',
      initial: config.puppeteer.args.join(','),
      separator: ','
    }
  ],
  highcharts: [
    {
      type: 'text',
      name: 'version',
      message: 'Highcharts version',
      initial: config.highcharts.version
    },
    {
      type: 'text',
      name: 'cdnURL',
      message: 'The url of CDN',
      initial: config.highcharts.cdnURL
    },
    {
      type: 'toggle',
      name: 'allowCodeExecution',
      message: 'Allow to execute custom code',
      initial: config.highcharts.allowCodeExecution
    },
    {
      type: 'toggle',
      name: 'allowFileResources',
      message: 'Allow file resources',
      initial: config.highcharts.allowFileResources
    },
    {
      type: 'number',
      name: 'defaultHeight',
      message: 'The default height',
      initial: config.highcharts.defaultHeight
    },
    {
      type: 'number',
      name: 'defaultWidth',
      message: 'The default width',
      initial: config.highcharts.defaultWidth
    },
    {
      type: 'number',
      name: 'defaultScale',
      message: 'The default scale (0.1 - 5):',
      initial: config.highcharts.defaultScale,
      min: 0.1,
      max: 5
    },
    {
      type: 'multiselect',
      name: 'modules',
      message: 'Available modules',
      instructions: 'Space: Select specific, A: Select all, Enter: Confirm.',
      choices: config.highcharts.modules
    }
  ],
  server: [
    {
      type: 'toggle',
      name: 'enable',
      message: 'Starts a server on 0.0.0.0',
      initial: config.server.enable
    },
    {
      type: 'text',
      name: 'host',
      message: 'A hostname of a server',
      initial: config.server.host
    },
    {
      type: 'number',
      name: 'port',
      message: 'A port of a server',
      initial: config.server.port
    },
    {
      type: 'toggle',
      name: 'ssl.enable',
      message: 'Enable SSL protocol',
      initial: config.server.ssl.enable
    },
    {
      type: 'toggle',
      name: 'ssl.force',
      message: 'Force to only serve over HTTPS',
      initial: config.server.ssl.force
    },
    {
      type: 'number',
      name: 'ssl.port',
      message: 'Port on which to run the SSL server',
      initial: config.server.ssl.port
    },
    {
      type: 'text',
      name: 'ssl.certPath',
      message: 'A path where to find the SSL certificate/key',
      initial: config.server.ssl.certPath
    },
    {
      type: 'toggle',
      name: 'rateLimiting.enable',
      message: 'Enable rate limiting',
      initial: config.server.rateLimiting.enable
    },
    {
      type: 'number',
      name: 'rateLimiting.maxRequests',
      message: 'Max requests allowed in a one minute',
      initial: config.server.rateLimiting.maxRequests
    },
    {
      type: 'text',
      name: 'rateLimiting.skipKey',
      message:
        'Allows bypassing the rate limiter and should be provided with skipToken argument',
      initial: config.server.rateLimiting.skipKey
    },
    {
      type: 'text',
      name: 'rateLimiting.skipToken',
      message:
        'Allows bypassing the rate limiter and should be provided with skipKey argument',
      initial: config.server.rateLimiting.skipToken
    }
  ],
  pool: [
    {
      type: 'number',
      name: 'initialWorkers',
      message: 'The number of initial workers to spawn',
      initial: config.pool.initialWorkers
    },
    {
      type: 'number',
      name: 'maxWorkers',
      message: 'The number of max workers to spawn',
      initial: config.pool.maxWorkers
    },
    {
      type: 'number',
      name: 'workLimit',
      message:
        'The pieces of work that can be performed before restarting a puppeteer process',
      initial: config.pool.workLimit
    },
    {
      type: 'number',
      name: 'queueSize',
      message: 'The size of the request overflow queue',
      initial: config.pool.queueSize
    },
    {
      type: 'number',
      name: 'timeoutThreshold',
      message: 'The number of seconds before timing out',
      initial: config.pool.timeoutThreshold
    },
    {
      type: 'toggle',
      name: 'reaper',
      message: 'The reaper to remove hanging processes',
      initial: config.pool.reaper
    },
    {
      type: 'toggle',
      name: 'listenToProcessExits',
      message: 'Set to false in order to skip attaching process.exit handlers',
      initial: config.pool.listenToProcessExits
    },
    {
      type: 'toggle',
      name: 'benchmarking',
      message: 'Set benchmarking',
      initial: config.pool.benchmarking
    }
  ],
  logging: [
    {
      type: 'number',
      name: 'level',
      message:
        'The log level (0: silent, 1: error, 2: warning, 3: notice, 4: verbose)',
      initial: config.logging.level,
      min: 0,
      max: 4
    },
    {
      type: 'text',
      name: 'file',
      message:
        'A name of a log file. The --logDest also needs to be set to enable file logging',
      initial: config.logging.file
    },
    {
      type: 'text',
      name: 'dest',
      message: 'A path to log files. It enables file logging',
      initial: config.logging.dest
    }
  ],
  ui: [
    {
      type: 'toggle',
      name: 'enable',
      message: 'Enable UI for the export server',
      initial: config.ui.enable
    },
    {
      type: 'text',
      name: 'route',
      message: 'A route to attach the UI to',
      initial: config.ui.route
    }
  ],
  other: [
    {
      type: 'toggle',
      name: 'nologo',
      message:
        'Skip printing the logo on a startup. Will be replaced by a simple text',
      initial: config.other.nologo
    },
    {
      type: 'text',
      name: 'tmpdir',
      message: 'A path to temporary files',
      initial: config.other.tmpdir
    }
  ]
};
