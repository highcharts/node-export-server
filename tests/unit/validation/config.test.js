import { describe } from '@jest/globals';

import { sharedTests } from './shared';
import { ConfigSchema } from '../../../lib/envs';

/**
 * Shared tests for the configuration validators and parsers
 */
const configTests = {
  puppeteer: (tests, config) => {
    describe('puppeteer', () => tests.configObject('puppeteer', config));
  },
  puppeteerArgs: (tests, values) => {
    describe('puppeteer.args', () =>
      tests.stringArray('args', values, values, true));
  },
  highcharts: (tests, config) => {
    describe('highcharts', () => tests.configObject('highcharts', config));
  },
  highchartsVersion: (tests) => {
    describe('highcharts.version', () => tests.version('version', true));
  },
  highchartsCdnUrl: (tests, correctValues, incorrectValues) => {
    describe('highcharts.cdnUrl', () =>
      tests.startsWith('cdnUrl', correctValues, incorrectValues, true));
  },
  highchartsForceFetch: (tests) => {
    describe('highcharts.forceFetch', () => tests.boolean('forceFetch', true));
  },
  highchartsCachePath: (tests) => {
    describe('highcharts.cachePath', () => tests.string('cachePath', true));
  },
  highchartsCoreScripts: (tests, values, filteredValues) => {
    describe('highcharts.coreScripts', () =>
      tests.scriptsArray('coreScripts', values, filteredValues, true));
  },
  highchartsModuleScripts: (tests, values, filteredValues) => {
    describe('highcharts.moduleScripts', () =>
      tests.scriptsArray('moduleScripts', values, filteredValues, true));
  },
  highchartsIndicatorScripts: (tests, values, filteredValues) => {
    describe('highcharts.indicatorScripts', () =>
      tests.scriptsArray('indicatorScripts', values, filteredValues, true));
  },
  highchartsCustomScripts: (tests, values, filteredValues) => {
    describe('highcharts.customScripts', () =>
      tests.scriptsArray('customScripts', values, filteredValues, true));
  },
  export: (tests, config) => {
    describe('export', () => tests.configObject('export', config));
  },
  exportInfile: (tests) => {
    describe('export.infile', () => tests.infile('infile', true));
  },
  exportInstr: (tests) => {
    describe('export.instr', () => tests.object('instr', true));
  },
  exportOptions: (tests) => {
    describe('export.options', () => tests.object('options', true));
  },
  exportOutfile: (tests) => {
    describe('export.outfile', () => tests.outfile('outfile', true));
  },
  exportType: (tests, correctValues, incorrectValues) => {
    describe('export.type', () =>
      tests.enum('type', correctValues, incorrectValues, true));
  },
  exportConstr: (tests, correctValues, incorrectValues) => {
    describe('export.constr', () =>
      tests.enum('constr', correctValues, incorrectValues, true));
  },
  exportDefaultHeight: (tests) => {
    describe('export.defaultHeight', () =>
      tests.positiveNum('defaultHeight', true));
  },
  exportDefaultWidth: (tests) => {
    describe('export.defaultWidth', () =>
      tests.positiveNum('defaultWidth', true));
  },
  exportDefaultScale: (tests) => {
    describe('export.defaultScale', () => tests.scale('defaultScale', true));
  },
  exportHeight: (tests) => {
    describe('export.height', () => tests.nullablePositiveNum('height', true));
  },
  exportWidth: (tests) => {
    describe('export.width', () => tests.nullablePositiveNum('width', true));
  },
  exportScale: (tests) => {
    describe('export.scale', () => tests.nullableScale('scale', true));
  },
  exportGlobalOptions: (tests) => {
    describe('export.globalOptions', () => tests.object('globalOptions', true));
  },
  exportThemeOptions: (tests) => {
    describe('export.themeOptions', () => tests.object('themeOptions', true));
  },
  exportBatch: (tests) => {
    describe('export.batch', () => tests.string('batch', false));
  },
  exportRasterizationTimeout: (tests) => {
    describe('export.rasterizationTimeout', () =>
      tests.nonNegativeNum('rasterizationTimeout', true));
  },
  customLogic: (tests, config) => {
    describe('customLogic', () => tests.configObject('customLogic', config));
  },
  customLogicAllowCodeExecution: (tests) => {
    describe('customLogic.allowCodeExecution', () =>
      tests.boolean('allowCodeExecution', true));
  },
  customLogicAllowFileResources: (tests) => {
    describe('customLogic.allowFileResources', () =>
      tests.boolean('allowFileResources', true));
  },
  customLogicCustomCode: (tests) => {
    describe('customLogic.customCode', () => tests.string('customCode', false));
  },
  customLogicCallback: (tests) => {
    describe('customLogic.callback', () => tests.string('callback', false));
  },
  customLogicResources: (tests) => {
    describe('customLogic.resources', () => tests.resources('resources', true));
  },
  customLogicLoadConfig: (tests) => {
    describe('customLogic.loadConfig', () => tests.string('loadConfig', false));
  },
  customLogicCreateConfig: (tests) => {
    describe('customLogic.createConfig', () =>
      tests.string('createConfig', false));
  },
  server: (tests, config) => {
    describe('server', () => tests.configObject('server', config));
  },
  serverEnable: (tests) => {
    describe('server.enable', () => tests.boolean('enable', true));
  },
  serverHost: (tests) => {
    describe('server.host', () => tests.string('host', true));
  },
  serverPort: (tests) => {
    describe('server.port', () => tests.nonNegativeNum('port', true));
  },
  serverBenchmarking: (tests) => {
    describe('server.benchmarking', () => tests.boolean('benchmarking', true));
  },
  serverProxy: (tests, config) => {
    describe('server.proxy', () => tests.configObject('proxy', config));
  },
  serverProxyHost: (tests) => {
    describe('server.proxy.host', () => tests.string('host', false));
  },
  serverProxyPort: (tests) => {
    describe('server.proxy.port', () =>
      tests.nullableNonNegativeNum('port', true));
  },
  serverProxyTimeout: (tests) => {
    describe('server.proxy.timeout', () =>
      tests.nonNegativeNum('timeout', true));
  },
  serverRateLimiting: (tests, config) => {
    describe('server.rateLimiting', () =>
      tests.configObject('rateLimiting', config));
  },
  serverRateLimitingEnable: (tests) => {
    describe('server.rateLimiting.enable', () => tests.boolean('enable', true));
  },
  serverRateLimitingMaxRequests: (tests) => {
    describe('server.rateLimiting.maxRequests', () =>
      tests.nonNegativeNum('maxRequests', true));
  },
  serverRateLimitingWindow: (tests) => {
    describe('server.rateLimiting.window', () =>
      tests.nonNegativeNum('window', true));
  },
  serverRateLimitingDelay: (tests) => {
    describe('server.rateLimiting.delay', () =>
      tests.nonNegativeNum('delay', true));
  },
  serverRateLimitingTrustProxy: (tests) => {
    describe('server.rateLimiting.trustProxy', () =>
      tests.boolean('trustProxy', true));
  },
  serverRateLimitingSkipKey: (tests) => {
    describe('server.rateLimiting.skipKey', () =>
      tests.string('skipKey', false));
  },
  serverRateLimitingSkipToken: (tests) => {
    describe('server.rateLimiting.skipToken', () =>
      tests.string('skipToken', false));
  },
  serverSsl: (tests, config) => {
    describe('server.ssl', () => tests.configObject('ssl', config));
  },
  serverSslEnable: (tests) => {
    describe('server.ssl.enable', () => tests.boolean('enable', true));
  },
  serverSslForce: (tests) => {
    describe('server.ssl.force', () => tests.boolean('force', true));
  },
  serverSslPort: (tests) => {
    describe('server.ssl.port', () => tests.nonNegativeNum('port', true));
  },
  serverSslCertPath: (tests) => {
    describe('server.ssl.certPath', () => tests.string('certPath', false));
  },
  pool: (tests, config) => {
    describe('pool', () => tests.configObject('pool', config));
  },
  poolMinWorkers: (tests) => {
    describe('pool.minWorkers', () => tests.positiveNum('minWorkers', true));
  },
  poolMaxWorkers: (tests) => {
    describe('pool.maxWorkers', () => tests.positiveNum('maxWorkers', true));
  },
  poolWorkLimit: (tests) => {
    describe('pool.workLimit', () => tests.positiveNum('workLimit', true));
  },
  poolAcquireTimeout: (tests) => {
    describe('pool.acquireTimeout', () =>
      tests.nonNegativeNum('acquireTimeout', true));
  },
  poolCreateTimeout: (tests) => {
    describe('pool.createTimeout', () =>
      tests.nonNegativeNum('createTimeout', true));
  },
  poolDestroyTimeout: (tests) => {
    describe('pool.destroyTimeout', () =>
      tests.nonNegativeNum('destroyTimeout', true));
  },
  poolIdleTimeout: (tests) => {
    describe('pool.idleTimeout', () =>
      tests.nonNegativeNum('idleTimeout', true));
  },
  poolCreateRetryInterval: (tests) => {
    describe('pool.createRetryInterval', () =>
      tests.nonNegativeNum('createRetryInterval', true));
  },
  poolReaperInterval: (tests) => {
    describe('pool.reaperInterval', () =>
      tests.nonNegativeNum('reaperInterval', true));
  },
  poolBenchmarking: (tests) => {
    describe('pool.benchmarking', () => tests.boolean('benchmarking', true));
  },
  logging: (tests, config) => {
    describe('logging', () => tests.configObject('logging', config));
  },
  loggingLevel: (tests) => {
    describe('logging.level', () => tests.logLevel('level', true));
  },
  loggingFile: (tests) => {
    describe('logging.file', () => tests.string('file', true));
  },
  loggingDest: (tests) => {
    describe('logging.dest', () => tests.string('dest', true));
  },
  loggingToConsole: (tests) => {
    describe('logging.toConsole', () => tests.boolean('toConsole', true));
  },
  loggingToFile: (tests) => {
    describe('logging.toFile', () => tests.boolean('toFile', true));
  },
  ui: (tests, config) => {
    describe('ui', () => tests.configObject('ui', config));
  },
  uiEnable: (tests) => {
    describe('ui.enable', () => tests.boolean('enable', true));
  },
  uiRoute: (tests, correctValues, incorrectValues) => {
    describe('ui.route', () =>
      tests.startsWith('route', correctValues, incorrectValues, true));
  },
  other: (tests, config) => {
    describe('other', () => tests.configObject('other', config));
  },
  otherNodeEnv: (tests, correctValues, incorrectValues) => {
    describe('other.nodeEnv', () =>
      tests.enum('nodeEnv', correctValues, incorrectValues, true));
  },
  otherListenToProcessExits: (tests) => {
    describe('other.listenToProcessExits', () =>
      tests.boolean('listenToProcessExits', true));
  },
  otherNoLogo: (tests) => {
    describe('other.noLogo', () => tests.boolean('noLogo', true));
  },
  otherHardResetPage: (tests) => {
    describe('other.hardResetPage', () => tests.boolean('hardResetPage', true));
  },
  otherBrowserShellMode: (tests) => {
    describe('other.browserShellMode', () =>
      tests.boolean('browserShellMode', true));
  },
  debug: (tests, config) => {
    describe('debug', () => tests.configObject('debug', config));
  },
  debugEnable: (tests) => {
    describe('debug.enable', () => tests.boolean('enable', true));
  },
  debugHeadless: (tests) => {
    describe('debug.headless', () => tests.boolean('headless', true));
  },
  debugDevtools: (tests) => {
    describe('debug.devtools', () => tests.boolean('devtools', true));
  },
  debugListenToConsole: (tests) => {
    describe('debug.listenToConsole', () =>
      tests.boolean('listenToConsole', true));
  },
  debugDumpio: (tests) => {
    describe('debug.dumpio', () => tests.boolean('dumpio', true));
  },
  debugSlowMo: (tests) => {
    describe('debug.slowMo', () => tests.nonNegativeNum('slowMo', true));
  },
  debugDebuggingPort: (tests) => {
    describe('debug.debuggingPort', () =>
      tests.nonNegativeNum('debuggingPort', true));
  },
  webSocket: (tests, config) => {
    describe('webSocket', () => tests.configObject('webSocket', config));
  },
  webSocketEnable: (tests) => {
    describe('webSocket.enable', () => tests.boolean('enable', true));
  },
  webSocketReconnect: (tests) => {
    describe('webSocket.reconnect', () => tests.boolean('reconnect', true));
  },
  webSocketRejectUnauthorized: (tests) => {
    describe('webSocket.rejectUnauthorized', () =>
      tests.boolean('rejectUnauthorized', true));
  },
  webSocketPingTimeout: (tests) => {
    describe('webSocket.pingTimeout', () =>
      tests.nonNegativeNum('pingTimeout', true));
  },
  webSocketReconnectInterval: (tests) => {
    describe('webSocket.reconnectInterval', () =>
      tests.nonNegativeNum('reconnectInterval', true));
  },
  webSocketReconnectAttempts: (tests) => {
    describe('webSocket.reconnectAttempts', () =>
      tests.nonNegativeNum('reconnectAttempts', true));
  },
  webSocketMessageInterval: (tests) => {
    describe('webSocket.messageInterval', () =>
      tests.nonNegativeNum('messageInterval', true));
  },
  webSocketGatherAllOptions: (tests) => {
    describe('webSocket.gatherAllOptions', () =>
      tests.boolean('gatherAllOptions', true));
  },
  webSocketUrl: (tests, correctValues, incorrectValues) => {
    describe('webSocket.url', () =>
      tests.nullableStartsWith('url', correctValues, incorrectValues, true));
  },
  webSocketSecret: (tests) => {
    describe('webSocket.secret', () => tests.string('secret', false));
  }
};

describe('Overall configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.partial());

  // puppeteer
  configTests.puppeteer(generalTests, {
    args: []
  });

  // highcharts
  configTests.highcharts(generalTests, {
    version: 'latest',
    cdnUrl: 'https://code.highcharts.com/',
    forceFetch: false,
    cachePath: '.cache',
    coreScripts: ['highcharts'],
    moduleScripts: ['stock'],
    indicatorScripts: ['indicators-all'],
    customScripts: ['https://example.js']
  });

  // export
  configTests.export(generalTests, {
    infile: null,
    instr: null,
    options: null,
    outfile: null,
    type: 'png',
    constr: 'chart',
    defaultHeight: 400,
    defaultWidth: 600,
    defaultScale: 1,
    height: null,
    width: null,
    scale: null,
    globalOptions: null,
    themeOptions: null,
    batch: null,
    rasterizationTimeout: 1500
  });

  // customLogic
  configTests.customLogic(generalTests, {
    allowCodeExecution: false,
    allowFileResources: false,
    customCode: null,
    callback: null,
    resources: null,
    loadConfig: null,
    createConfig: null
  });

  // server
  configTests.server(generalTests, {
    enable: false,
    host: '0.0.0.0',
    port: 7801,
    benchmarking: false,
    proxy: {},
    rateLimiting: {},
    ssl: {}
  });

  // pool
  configTests.pool(generalTests, {
    minWorkers: 4,
    maxWorkers: 8,
    workLimit: 40,
    acquireTimeout: 5000,
    createTimeout: 5000,
    destroyTimeout: 5000,
    idleTimeout: 30000,
    createRetryInterval: 200,
    reaperInterval: 1000,
    benchmarking: false
  });

  // logging
  configTests.logging(generalTests, {
    level: 4,
    file: 'highcharts-export-server.log',
    dest: 'log',
    toConsole: true,
    toFile: true
  });

  // ui
  configTests.ui(generalTests, {
    enable: false,
    route: '/'
  });

  // other
  configTests.other(generalTests, {
    nodeEnv: 'production',
    listenToProcessExits: true,
    noLogo: false,
    hardResetPage: false,
    browserShellMode: true
  });

  // debug
  configTests.debug(generalTests, {
    enable: false,
    headless: true,
    devtools: false,
    listenToConsole: false,
    dumpio: false,
    slowMo: 0,
    debuggingPort: 9222
  });

  // webSocket
  configTests.webSocket(generalTests, {
    enable: false,
    reconnect: false,
    rejectUnauthorized: false,
    pingTimeout: 16000,
    reconnectInterval: 3000,
    reconnectAttempts: 3,
    messageInterval: 3600000,
    gatherAllOptions: false,
    url: null,
    secret: null
  });
});

describe('Puppeteer configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.puppeteer);

  // puppeteer.args
  configTests.puppeteerArgs(generalTests, [
    '--disable-sync',
    '--enable-unsafe-webgpu',
    '--hide-crash-restore-bubble',
    '--hide-scrollbars',
    '--metrics-recording-only'
  ]);
});

describe('Highcharts configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.highcharts);

  // highcharts.version
  configTests.highchartsVersion(generalTests);

  // highcharts.cdnUrl
  configTests.highchartsCdnUrl(
    generalTests,
    ['http://example.com', 'https://example.com'],
    ['http:a.com', 'http:/b.com', 'https:c.com', 'https:/d.com']
  );

  // highcharts.forceFetch
  configTests.highchartsForceFetch(generalTests);

  // highcharts.cachePath
  configTests.highchartsCachePath(generalTests);

  // highcharts.coreScripts
  configTests.highchartsCoreScripts(
    generalTests,
    ['highcharts', 'highcharts-more', 'text1', 'highcharts-3d', 'text2'],
    ['highcharts', 'highcharts-more', 'highcharts-3d']
  );

  // highcharts.moduleScripts
  configTests.highchartsModuleScripts(
    generalTests,
    ['data', 'text1', 'data-tools', 'text2'],
    ['data', 'data-tools']
  );

  // highcharts.indicatorScripts
  configTests.highchartsIndicatorScripts(
    generalTests,
    ['text1', 'indicators-all', 'text2'],
    ['indicators-all']
  );

  // highcharts.customScripts
  configTests.highchartsCustomScripts(
    generalTests,
    [
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
    ],
    [
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
    ]
  );
});

describe('Export configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.export);

  // export.infile
  configTests.exportInfile(generalTests);

  // export.instr
  configTests.exportInstr(generalTests);

  // export.options
  configTests.exportOptions(generalTests);

  // export.outfile
  configTests.exportOutfile(generalTests);

  // export.type
  configTests.exportType(
    generalTests,
    ['jpeg', 'jpg', 'png', 'pdf', 'svg'],
    ['json', 'txt']
  );

  // export.constr
  configTests.exportConstr(
    generalTests,
    ['chart', 'stockChart', 'mapChart', 'ganttChart'],
    ['stock', 'map', 'gantt']
  );

  // export.defaultHeight
  configTests.exportDefaultHeight(generalTests);

  // export.defaultWidth
  configTests.exportDefaultWidth(generalTests);

  // export.defaultScale
  configTests.exportDefaultScale(generalTests);

  // export.height
  configTests.exportHeight(generalTests);

  // export.width
  configTests.exportWidth(generalTests);

  // export.scale
  configTests.exportScale(generalTests);

  // export.globalOptions
  configTests.exportGlobalOptions(generalTests);

  // export.themeOptions
  configTests.exportThemeOptions(generalTests);

  // export.batch
  configTests.exportBatch(generalTests);

  // export.rasterizationTimeout
  configTests.exportRasterizationTimeout(generalTests);
});

describe('Custom Logic configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.customLogic);

  // customLogic.allowCodeExecution
  configTests.customLogicAllowCodeExecution(generalTests);

  // customLogic.allowFileResources
  configTests.customLogicAllowFileResources(generalTests);

  // customLogic.customCode
  configTests.customLogicCustomCode(generalTests);

  // customLogic.callback
  configTests.customLogicCallback(generalTests);

  // customLogic.resources
  configTests.customLogicResources(generalTests);

  // customLogic.loadConfig
  configTests.customLogicLoadConfig(generalTests);

  // customLogic.createConfig
  configTests.customLogicCreateConfig(generalTests);
});

describe('Server configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.server);

  // server.enable
  configTests.serverEnable(generalTests);

  // server.host
  configTests.serverHost(generalTests);

  // server.port
  configTests.serverPort(generalTests);

  // server.benchmarking
  configTests.serverBenchmarking(generalTests);

  // server.proxy
  configTests.serverProxy(generalTests, {
    host: null,
    port: null,
    timeout: 5000
  });

  // server.rateLimiting
  configTests.serverRateLimiting(generalTests, {
    enable: false,
    maxRequests: 10,
    window: 1,
    delay: 0,
    trustProxy: false,
    skipKey: null,
    skipToken: null
  });

  // server.ssl
  configTests.serverSsl(generalTests, {
    enable: false,
    force: false,
    port: 443,
    certPath: null
  });
});

describe('Server Proxy configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.server.shape.proxy);

  // server.proxy.host
  configTests.serverProxyHost(generalTests);

  // server.proxy.port
  configTests.serverProxyPort(generalTests);

  // server.proxy.timeout
  configTests.serverProxyTimeout(generalTests);
});

describe('Server Rate Limiting configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(
    ConfigSchema.shape.server.shape.rateLimiting
  );

  // server.rateLimiting.enable
  configTests.serverRateLimitingEnable(generalTests);

  // server.rateLimiting.maxRequests
  configTests.serverRateLimitingMaxRequests(generalTests);

  // server.rateLimiting.window
  configTests.serverRateLimitingWindow(generalTests);

  // server.rateLimiting.delay
  configTests.serverRateLimitingDelay(generalTests);

  // server.rateLimiting.trustProxy
  configTests.serverRateLimitingTrustProxy(generalTests);

  // server.rateLimiting.skipKey
  configTests.serverRateLimitingSkipKey(generalTests);

  // server.rateLimiting.skipToken
  configTests.serverRateLimitingSkipToken(generalTests);
});

describe('Server SSL configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.server.shape.ssl);

  // server.ssl.enable
  configTests.serverSslEnable(generalTests);

  // server.ssl.force
  configTests.serverSslForce(generalTests);

  // server.ssl.port
  configTests.serverSslPort(generalTests);

  // server.ssl.certPath
  configTests.serverSslCertPath(generalTests);
});

describe('Pool configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.pool);

  // pool.minWorkers
  configTests.poolMinWorkers(generalTests);

  // pool.maxWorkers
  configTests.poolMaxWorkers(generalTests);

  // pool.workLimit
  configTests.poolWorkLimit(generalTests);

  // pool.acquireTimeout
  configTests.poolAcquireTimeout(generalTests);

  // pool.createTimeout
  configTests.poolCreateTimeout(generalTests);

  // pool.destroyTimeout
  configTests.poolDestroyTimeout(generalTests);

  // pool.idleTimeout
  configTests.poolIdleTimeout(generalTests);

  // pool.createRetryInterval
  configTests.poolCreateRetryInterval(generalTests);

  // pool.reaperInterval
  configTests.poolReaperInterval(generalTests);

  // pool.benchmarking
  configTests.poolBenchmarking(generalTests);
});

describe('Logging configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.logging);

  // logging.level
  configTests.loggingLevel(generalTests);

  // logging.file
  configTests.loggingFile(generalTests);

  // logging.dest
  configTests.loggingDest(generalTests);

  // logging.toConsole
  configTests.loggingToConsole(generalTests);

  // logging.toFile
  configTests.loggingToFile(generalTests);
});

describe('UI configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.ui);

  // ui.enable
  configTests.uiEnable(generalTests);

  // ui.route
  configTests.uiRoute(generalTests, ['/', '/ui'], ['ui', 'example/ui/']);
});

describe('Other configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.other);

  // other.nodeEnv
  configTests.otherNodeEnv(
    generalTests,
    ['development', 'production', 'test'],
    ['dev-env', 'prod-env', 'test-env']
  );

  // other.listenToProcessExits
  configTests.otherListenToProcessExits(generalTests);

  // other.noLogo
  configTests.otherNoLogo(generalTests);

  // other.hardResetPage
  configTests.otherHardResetPage(generalTests);

  // other.browserShellMode
  configTests.otherBrowserShellMode(generalTests);
});

describe('Debug configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.debug);

  // debug.enable
  configTests.debugEnable(generalTests);

  // debug.headless
  configTests.debugHeadless(generalTests);

  // debug.devtools
  configTests.debugDevtools(generalTests);

  // debug.listenToConsole
  configTests.debugListenToConsole(generalTests);

  // debug.dumpio
  configTests.debugDumpio(generalTests);

  // debug.slowMo
  configTests.debugSlowMo(generalTests);

  // debug.debuggingPort
  configTests.debugDebuggingPort(generalTests);
});

describe('WebSocket configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ConfigSchema.shape.webSocket);

  // webSocket.enable
  configTests.webSocketEnable(generalTests);

  // webSocket.reconnect
  configTests.webSocketReconnect(generalTests);

  // webSocket.rejectUnauthorized
  configTests.webSocketRejectUnauthorized(generalTests);

  // webSocket.pingTimeout
  configTests.webSocketPingTimeout(generalTests);

  // webSocket.reconnectInterval
  configTests.webSocketReconnectInterval(generalTests);

  // webSocket.reconnectAttempts
  configTests.webSocketReconnectAttempts(generalTests);

  // webSocket.messageInterval
  configTests.webSocketMessageInterval(generalTests);

  // webSocket.gatherAllOptions
  configTests.webSocketGatherAllOptions(generalTests);

  // webSocket.url
  configTests.webSocketUrl(
    generalTests,
    ['ws://example.com', 'wss://example.com'],
    ['ws:a.com', 'ws:/b.com', 'wss:c.com', 'wss:/d.com']
  );

  // webSocket.secret
  configTests.webSocketSecret(generalTests);
});
