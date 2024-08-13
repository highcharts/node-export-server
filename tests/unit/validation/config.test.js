import { describe } from '@jest/globals';

import { sharedTests } from './shared';
import {
  PuppeteerSchema,
  HighchartsSchema,
  ExportSchema,
  CustomLogicSchema,
  ProxySchema,
  RateLimitingSchema,
  SslSchema,
  ServerSchema,
  PoolSchema,
  LoggingSchema,
  UiSchema,
  OtherSchema,
  DebugSchema,
  WebSocketSchema
} from '../../../lib/envs';
import { excludeFromValues, possibleValues } from '../../utils/tests_utils';

/**
 * Shared tests for the configuration validators and parsers
 */
const configTests = {
  puppeteerArgs: (tests, values) => {
    describe('puppeteer.args', () => tests.stringArray('args', values));
  },
  highchartsVersion: (tests) => {
    describe('highcharts.version', () => tests.version('version'));
  },
  highchartsCdnUrl: (tests, correctValues, incorrectValues) => {
    describe('highcharts.cdnUrl', () =>
      tests.startsWith('cdnUrl', correctValues, incorrectValues));
  },
  highchartsForceFetch: (tests) => {
    describe('highcharts.forceFetch', () => tests.boolean('forceFetch'));
  },
  highchartsCachePath: (tests) => {
    describe('highcharts.cachePath', () => tests.strictString('cachePath'));
  },
  highchartsCoreScripts: (tests, values, filteredValues) => {
    describe('highcharts.coreScripts', () =>
      tests.scriptsArray('coreScripts', values, filteredValues));
  },
  highchartsModuleScripts: (tests, values, filteredValues) => {
    describe('highcharts.moduleScripts', () =>
      tests.scriptsArray('moduleScripts', values, filteredValues));
  },
  highchartsIndicatorScripts: (tests, values, filteredValues) => {
    describe('highcharts.indicatorScripts', () =>
      tests.scriptsArray('indicatorScripts', values, filteredValues));
  },
  highchartsCustomScripts: (tests, values, filteredValues) => {
    describe('highcharts.customScripts', () =>
      tests.scriptsArray('customScripts', values, filteredValues));
  },
  exportInfile: (tests) => {
    describe('export.infile', () => tests.infile('infile'));
  },
  exportInstr: (tests) => {
    describe('export.instr', () => tests.nullishString('instr'));
  },
  exportOptions: (tests) => {
    describe('export.options', () => tests.nullishString('options'));
  },
  exportOutfile: (tests) => {
    describe('export.outfile', () => tests.outfile('outfile'));
  },
  exportType: (tests, correctValues, incorrectValues) => {
    describe('export.type', () =>
      tests.enum('type', correctValues, incorrectValues));
  },
  exportConstr: (tests, correctValues, incorrectValues) => {
    describe('export.constr', () =>
      tests.enum('constr', correctValues, incorrectValues));
  },
  exportDefaultHeight: (tests) => {
    describe('export.defaultHeight', () => tests.positiveNum('defaultHeight'));
  },
  exportDefaultWidth: (tests) => {
    describe('export.defaultWidth', () => tests.positiveNum('defaultWidth'));
  },
  exportDefaultScale: (tests) => {
    describe('export.defaultScale', () => tests.scale('defaultScale'));
  },
  exportHeight: (tests) => {
    describe('export.height', () => tests.nullablePositiveNum('height'));
  },
  exportWidth: (tests) => {
    describe('export.width', () => tests.nullablePositiveNum('width'));
  },
  exportScale: (tests) => {
    describe('export.scale', () => tests.nullableScale('scale'));
  },
  exportGlobalOptions: (tests) => {
    describe('export.globalOptions', () => tests.object('globalOptions'));
  },
  exportThemeOptions: (tests) => {
    describe('export.themeOptions', () => tests.object('themeOptions'));
  },
  exportBatch: (tests) => {
    describe('export.batch', () => tests.nullishString('batch'));
  },
  exportRasterizationTimeout: (tests) => {
    describe('export.rasterizationTimeout', () =>
      tests.nonNegativeNum('rasterizationTimeout'));
  },
  customLogicAllowCodeExecution: (tests) => {
    describe('customLogic.allowCodeExecution', () =>
      tests.boolean('allowCodeExecution'));
  },
  customLogicAllowFileResources: (tests) => {
    describe('customLogic.allowFileResources', () =>
      tests.boolean('allowFileResources'));
  },
  customLogicCustomCode: (tests) => {
    describe('customLogic.customCode', () => tests.nullishString('customCode'));
  },
  customLogicCallback: (tests) => {
    describe('customLogic.callback', () => tests.nullishString('callback'));
  },
  customLogicResources: (tests) => {
    describe('customLogic.resources', () => tests.resources('resources'));
  },
  customLogicLoadConfig: (tests) => {
    describe('customLogic.loadConfig', () => tests.customConfig('loadConfig'));
  },
  customLogicCreateConfig: (tests) => {
    describe('customLogic.createConfig', () =>
      tests.customConfig('createConfig'));
  },
  serverProxyHost: (tests) => {
    describe('server.proxy.host', () => tests.nullishString('host'));
  },
  serverProxyPort: (tests) => {
    describe('server.proxy.port', () => tests.nullableNonNegativeNum('port'));
  },
  serverProxyTimeout: (tests) => {
    describe('server.proxy.timeout', () => tests.nonNegativeNum('timeout'));
  },
  serverRateLimitingEnable: (tests) => {
    describe('server.rateLimiting.enable', () => tests.boolean('enable'));
  },
  serverRateLimitingMaxRequests: (tests) => {
    describe('server.rateLimiting.maxRequests', () =>
      tests.nonNegativeNum('maxRequests'));
  },
  serverRateLimitingWindow: (tests) => {
    describe('server.rateLimiting.window', () =>
      tests.nonNegativeNum('window'));
  },
  serverRateLimitingDelay: (tests) => {
    describe('server.rateLimiting.delay', () => tests.nonNegativeNum('delay'));
  },
  serverRateLimitingTrustProxy: (tests) => {
    describe('server.rateLimiting.trustProxy', () =>
      tests.boolean('trustProxy'));
  },
  serverRateLimitingSkipKey: (tests) => {
    describe('server.rateLimiting.skipKey', () =>
      tests.nullishString('skipKey'));
  },
  serverRateLimitingSkipToken: (tests) => {
    describe('server.rateLimiting.skipToken', () =>
      tests.nullishString('skipToken'));
  },
  serverSslEnable: (tests) => {
    describe('server.ssl.enable', () => tests.boolean('enable'));
  },
  serverSslForce: (tests) => {
    describe('server.ssl.force', () => tests.boolean('force'));
  },
  serverSslPort: (tests) => {
    describe('server.ssl.port', () => tests.nonNegativeNum('port'));
  },
  serverSslCertPath: (tests) => {
    describe('server.ssl.certPath', () => tests.nullishString('certPath'));
  },
  serverEnable: (tests) => {
    describe('server.enable', () => tests.boolean('enable'));
  },
  serverHost: (tests) => {
    describe('server.host', () => tests.strictString('host'));
  },
  serverPort: (tests) => {
    describe('server.port', () => tests.nonNegativeNum('port'));
  },
  serverBenchmarking: (tests) => {
    describe('server.benchmarking', () => tests.boolean('benchmarking'));
  },
  poolMinWorkers: (tests) => {
    describe('pool.minWorkers', () => tests.positiveNum('minWorkers'));
  },
  poolMaxWorkers: (tests) => {
    describe('pool.maxWorkers', () => tests.positiveNum('maxWorkers'));
  },
  poolWorkLimit: (tests) => {
    describe('pool.workLimit', () => tests.positiveNum('workLimit'));
  },
  poolAcquireTimeout: (tests) => {
    describe('pool.acquireTimeout', () =>
      tests.nonNegativeNum('acquireTimeout'));
  },
  poolCreateTimeout: (tests) => {
    describe('pool.createTimeout', () => tests.nonNegativeNum('createTimeout'));
  },
  poolDestroyTimeout: (tests) => {
    describe('pool.destroyTimeout', () =>
      tests.nonNegativeNum('destroyTimeout'));
  },
  poolIdleTimeout: (tests) => {
    describe('pool.idleTimeout', () => tests.nonNegativeNum('idleTimeout'));
  },
  poolCreateRetryInterval: (tests) => {
    describe('pool.createRetryInterval', () =>
      tests.nonNegativeNum('createRetryInterval'));
  },
  poolReaperInterval: (tests) => {
    describe('pool.reaperInterval', () =>
      tests.nonNegativeNum('reaperInterval'));
  },
  poolBenchmarking: (tests) => {
    describe('pool.benchmarking', () => tests.boolean('benchmarking'));
  },
  loggingLevel: (tests) => {
    describe('logging.level', () => tests.logLevel('level'));
  },
  loggingFile: (tests) => {
    describe('logging.file', () => tests.strictString('file'));
  },
  loggingDest: (tests) => {
    describe('logging.dest', () => tests.strictString('dest'));
  },
  loggingToConsole: (tests) => {
    describe('logging.toConsole', () => tests.boolean('toConsole'));
  },
  loggingToFile: (tests) => {
    describe('logging.toFile', () => tests.boolean('toFile'));
  },
  uiEnable: (tests) => {
    describe('ui.enable', () => tests.boolean('enable'));
  },
  uiRoute: (tests, correctValues, incorrectValues) => {
    describe('ui.route', () =>
      tests.startsWith('route', correctValues, incorrectValues));
  },
  otherNodeEnv: (tests, correctValues, incorrectValues) => {
    describe('other.nodeEnv', () =>
      tests.enum('nodeEnv', correctValues, incorrectValues));
  },
  otherListenToProcessExits: (tests) => {
    describe('other.listenToProcessExits', () =>
      tests.boolean('listenToProcessExits'));
  },
  otherNoLogo: (tests) => {
    describe('other.noLogo', () => tests.boolean('noLogo'));
  },
  otherHardResetPage: (tests) => {
    describe('other.hardResetPage', () => tests.boolean('hardResetPage'));
  },
  otherBrowserShellMode: (tests) => {
    describe('other.browserShellMode', () => tests.boolean('browserShellMode'));
  },
  debugEnable: (tests) => {
    describe('debug.enable', () => tests.boolean('enable'));
  },
  debugHeadless: (tests) => {
    describe('debug.headless', () => tests.boolean('headless'));
  },
  debugDevtools: (tests) => {
    describe('debug.devtools', () => tests.boolean('devtools'));
  },
  debugListenToConsole: (tests) => {
    describe('debug.listenToConsole', () => tests.boolean('listenToConsole'));
  },
  debugDumpio: (tests) => {
    describe('debug.dumpio', () => tests.boolean('dumpio'));
  },
  debugSlowMo: (tests) => {
    describe('debug.slowMo', () => tests.nonNegativeNum('slowMo'));
  },
  debugDebuggingPort: (tests) => {
    describe('debug.debuggingPort', () =>
      tests.nonNegativeNum('debuggingPort'));
  },
  webSocketEnable: (tests) => {
    describe('webSocket.enable', () => tests.boolean('enable'));
  },
  webSocketReconnect: (tests) => {
    describe('webSocket.reconnect', () => tests.boolean('reconnect'));
  },
  webSocketRejectUnauthorized: (tests) => {
    describe('webSocket.rejectUnauthorized', () =>
      tests.boolean('rejectUnauthorized'));
  },
  webSocketPingTimeout: (tests) => {
    describe('webSocket.pingTimeout', () =>
      tests.nonNegativeNum('pingTimeout'));
  },
  webSocketReconnectInterval: (tests) => {
    describe('webSocket.reconnectInterval', () =>
      tests.nonNegativeNum('reconnectInterval'));
  },
  webSocketReconnectAttempts: (tests) => {
    describe('webSocket.reconnectAttempts', () =>
      tests.nonNegativeNum('reconnectAttempts'));
  },
  webSocketMessageInterval: (tests) => {
    describe('webSocket.messageInterval', () =>
      tests.nonNegativeNum('messageInterval'));
  },
  webSocketGatherAllOptions: (tests) => {
    describe('webSocket.gatherAllOptions', () =>
      tests.boolean('gatherAllOptions'));
  },
  webSocketUrl: (tests, correctValues, incorrectValues) => {
    describe('webSocket.url', () =>
      tests.startsWith('url', correctValues, incorrectValues));
  },
  webSocketSecret: (tests) => {
    describe('webSocket.secret', () => tests.nullishString('secret'));
  }
};

describe('Puppeteer configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(PuppeteerSchema.partial());

  // puppeteer.args
  configTests.puppeteerArgs(generalTests, ['a', 'b', 'c']);
});

describe('Highcharts configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(HighchartsSchema.partial());

  // Get all possibile values to check
  const allTypesValues = excludeFromValues(possibleValues);

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
    ['highcharts', 'highcharts-more', ...allTypesValues, 'highcharts-3d'],
    ['highcharts', 'highcharts-more', 'highcharts-3d']
  );

  // highcharts.moduleScripts
  configTests.highchartsModuleScripts(
    generalTests,
    ['data', ...allTypesValues, 'data-tools'],
    ['data', 'data-tools']
  );

  // highcharts.indicatorScripts
  configTests.highchartsIndicatorScripts(
    generalTests,
    [...allTypesValues, 'indicators-all'],
    ['indicators-all']
  );

  // highcharts.customScripts
  configTests.highchartsCustomScripts(
    generalTests,
    [
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
      ...allTypesValues,
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
  const generalTests = sharedTests(ExportSchema.partial());

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
  const generalTests = sharedTests(CustomLogicSchema.partial());

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
  const generalTests = sharedTests(ServerSchema.partial());

  // server.enable
  configTests.serverEnable(generalTests);

  // server.host
  configTests.serverHost(generalTests);

  // server.port
  configTests.serverPort(generalTests);

  // server.benchmarking
  configTests.serverBenchmarking(generalTests);
});

describe('Server Proxy configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(ProxySchema.partial());

  // server.proxy.host
  configTests.serverProxyHost(generalTests);

  // server.proxy.port
  configTests.serverProxyPort(generalTests);

  // server.proxy.timeout
  configTests.serverProxyTimeout(generalTests);
});

describe('Server Rate Limiting configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(RateLimitingSchema.partial());

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
  const generalTests = sharedTests(SslSchema.partial());

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
  const generalTests = sharedTests(PoolSchema.partial());

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
  const generalTests = sharedTests(LoggingSchema.partial());

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
  const generalTests = sharedTests(UiSchema.partial());

  // ui.enable
  configTests.uiEnable(generalTests);

  // ui.route
  configTests.uiRoute(generalTests, ['/', '/ui'], ['ui', 'example/ui/']);
});

describe('Other configuration options should be correctly parsed and validated', () => {
  // Return general tests with a specific schema injected
  const generalTests = sharedTests(OtherSchema.partial());

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
  const generalTests = sharedTests(DebugSchema.partial());

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
  const generalTests = sharedTests(WebSocketSchema.partial());

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
