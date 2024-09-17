import { describe } from '@jest/globals';

import { configTests } from './shared.js';
import { StrictConfigSchema } from '../../../lib/validate.js';

describe('Configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.partial(), true);

  // puppeteer
  tests.puppeteer('puppeteer', {
    args: [
      '--disable-sync',
      '--enable-unsafe-webgpu',
      '--hide-crash-restore-bubble',
      '--hide-scrollbars',
      '--metrics-recording-only'
    ]
  });

  // highcharts
  tests.highcharts('highcharts', {
    version: 'latest',
    cdnUrl: 'https://code.highcharts.com',
    forceFetch: false,
    cachePath: '.cache',
    coreScripts: ['highcharts'],
    moduleScripts: ['stock'],
    indicatorScripts: ['indicators-all'],
    customScripts: ['https://example.js']
  });

  // export
  tests.export('export', {
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
  tests.customLogic('customLogic', {
    allowCodeExecution: false,
    allowFileResources: false,
    customCode: null,
    callback: null,
    resources: null,
    loadConfig: null,
    createConfig: null
  });

  // server
  tests.server('server', {
    enable: false,
    host: '0.0.0.0',
    port: 7801,
    benchmarking: false,
    proxy: {},
    rateLimiting: {},
    ssl: {}
  });

  // pool
  tests.pool('pool', {
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
  tests.logging('logging', {
    level: 4,
    file: 'highcharts-export-server.log',
    dest: 'log',
    toConsole: true,
    toFile: true
  });

  // ui
  tests.ui('ui', {
    enable: false,
    route: '/'
  });

  // other
  tests.other('other', {
    nodeEnv: 'production',
    listenToProcessExits: true,
    noLogo: false,
    hardResetPage: false,
    browserShellMode: true
  });

  // debug
  tests.debug('debug', {
    enable: false,
    headless: true,
    devtools: false,
    listenToConsole: false,
    dumpio: false,
    slowMo: 0,
    debuggingPort: 9222
  });

  // webSocket
  tests.webSocket('webSocket', {
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

  // payload
  tests.payload('payload', {
    svg: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
    b64: false,
    noDownload: false,
    requestId: 'd4faa416-0e85-433a-9f84-e735567d8fa5'
  });
});

describe('Puppeteer configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.puppeteer, true);

  // puppeteer.args
  tests.puppeteerArgs(
    'args',
    [
      '--disable-sync',
      '--enable-unsafe-webgpu',
      '--hide-crash-restore-bubble',
      '--hide-scrollbars',
      '--metrics-recording-only'
    ],
    [
      '--disable-sync',
      '--enable-unsafe-webgpu',
      '--hide-crash-restore-bubble',
      '--hide-scrollbars',
      '--metrics-recording-only'
    ]
  );
});

describe('Highcharts configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.highcharts, true);

  // highcharts.version
  tests.highchartsVersion('version');

  // highcharts.cdnUrl
  tests.highchartsCdnUrl(
    'cdnUrl',
    ['http://example.com', 'https://example.com'],
    ['http:a.com', 'http:/b.com', 'https:c.com', 'https:/d.com']
  );

  // highcharts.forceFetch
  tests.highchartsForceFetch('forceFetch');

  // highcharts.cachePath
  tests.highchartsCachePath('cachePath');

  // highcharts.coreScripts
  tests.highchartsCoreScripts(
    'coreScripts',
    ['highcharts', 'highcharts-more', 'text1', 'highcharts-3d', 'text2'],
    ['highcharts', 'highcharts-more', 'highcharts-3d']
  );

  // highcharts.moduleScripts
  tests.highchartsModuleScripts(
    'moduleScripts',
    ['data', 'text1', 'data-tools', 'text2'],
    ['data', 'data-tools']
  );

  // highcharts.indicatorScripts
  tests.highchartsIndicatorScripts(
    'indicatorScripts',
    ['text1', 'indicators-all', 'text2'],
    ['indicators-all']
  );

  // highcharts.customScripts
  tests.highchartsCustomScripts(
    'customScripts',
    [
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
      'text1',
      'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js',
      'text2'
    ],
    [
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
    ]
  );
});

describe('Export configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.export, true);

  // export.infile
  tests.exportInfile('infile');

  // export.instr
  tests.exportInstr('instr');

  // export.options
  tests.exportOptions('options');

  // export.outfile
  tests.exportOutfile('outfile');

  // export.type
  tests.exportType(
    'type',
    ['jpeg', 'jpg', 'png', 'pdf', 'svg'],
    ['json', 'txt']
  );

  // export.constr
  tests.exportConstr(
    'constr',
    ['chart', 'stockChart', 'mapChart', 'ganttChart'],
    ['stock', 'map', 'gantt']
  );

  // export.defaultHeight
  tests.exportDefaultHeight('defaultHeight');

  // export.defaultWidth
  tests.exportDefaultWidth('defaultWidth');

  // export.defaultScale
  tests.exportDefaultScale('defaultScale');

  // export.height
  tests.exportHeight('height');

  // export.width
  tests.exportWidth('width');

  // export.scale
  tests.exportScale('scale');

  // export.globalOptions
  tests.exportGlobalOptions('globalOptions');

  // export.themeOptions
  tests.exportThemeOptions('themeOptions');

  // export.batch
  tests.exportBatch('batch');

  // export.rasterizationTimeout
  tests.exportRasterizationTimeout('rasterizationTimeout');
});

describe('Custom Logic configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.customLogic, true);

  // customLogic.allowCodeExecution
  tests.customLogicAllowCodeExecution('allowCodeExecution');

  // customLogic.allowFileResources
  tests.customLogicAllowFileResources('allowFileResources');

  // customLogic.customCode
  tests.customLogicCustomCode('customCode');

  // customLogic.callback
  tests.customLogicCallback('callback');

  // customLogic.resources
  tests.customLogicResources('resources');

  // customLogic.loadConfig
  tests.customLogicLoadConfig('loadConfig');

  // customLogic.createConfig
  tests.customLogicCreateConfig('createConfig');
});

describe('Server configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.server, true);

  // server.enable
  tests.serverEnable('enable');

  // server.host
  tests.serverHost('host');

  // server.port
  tests.serverPort('port');

  // server.benchmarking
  tests.serverBenchmarking('benchmarking');

  // server.proxy
  tests.serverProxy('proxy', {
    host: null,
    port: null,
    timeout: 5000
  });

  // server.rateLimiting
  tests.serverRateLimiting('rateLimiting', {
    enable: false,
    maxRequests: 10,
    window: 1,
    delay: 0,
    trustProxy: false,
    skipKey: null,
    skipToken: null
  });

  // server.ssl
  tests.serverSsl('ssl', {
    enable: false,
    force: false,
    port: 443,
    certPath: null
  });
});

describe('Server Proxy configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.server.shape.proxy, true);

  // server.proxy.host
  tests.serverProxyHost('host');

  // server.proxy.port
  tests.serverProxyPort('port');

  // server.proxy.timeout
  tests.serverProxyTimeout('timeout');
});

describe('Server Rate Limiting configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(
    StrictConfigSchema.shape.server.shape.rateLimiting,
    true
  );

  // server.rateLimiting.enable
  tests.serverRateLimitingEnable('enable');

  // server.rateLimiting.maxRequests
  tests.serverRateLimitingMaxRequests('maxRequests');

  // server.rateLimiting.window
  tests.serverRateLimitingWindow('window');

  // server.rateLimiting.delay
  tests.serverRateLimitingDelay('delay');

  // server.rateLimiting.trustProxy
  tests.serverRateLimitingTrustProxy('trustProxy');

  // server.rateLimiting.skipKey
  tests.serverRateLimitingSkipKey('skipKey');

  // server.rateLimiting.skipToken
  tests.serverRateLimitingSkipToken('skipToken');
});

describe('Server SSL configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.server.shape.ssl, true);

  // server.ssl.enable
  tests.serverSslEnable('enable');

  // server.ssl.force
  tests.serverSslForce('force');

  // server.ssl.port
  tests.serverSslPort('port');

  // server.ssl.certPath
  tests.serverSslCertPath('certPath');
});

describe('Pool configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.pool, true);

  // pool.minWorkers
  tests.poolMinWorkers('minWorkers');

  // pool.maxWorkers
  tests.poolMaxWorkers('maxWorkers');

  // pool.workLimit
  tests.poolWorkLimit('workLimit');

  // pool.acquireTimeout
  tests.poolAcquireTimeout('acquireTimeout');

  // pool.createTimeout
  tests.poolCreateTimeout('createTimeout');

  // pool.destroyTimeout
  tests.poolDestroyTimeout('destroyTimeout');

  // pool.idleTimeout
  tests.poolIdleTimeout('idleTimeout');

  // pool.createRetryInterval
  tests.poolCreateRetryInterval('createRetryInterval');

  // pool.reaperInterval
  tests.poolReaperInterval('reaperInterval');

  // pool.benchmarking
  tests.poolBenchmarking('benchmarking');
});

describe('Logging configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.logging, true);

  // logging.level
  tests.loggingLevel('level');

  // logging.file
  tests.loggingFile('file');

  // logging.dest
  tests.loggingDest('dest');

  // logging.toConsole
  tests.loggingToConsole('toConsole');

  // logging.toFile
  tests.loggingToFile('toFile');
});

describe('UI configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.ui, true);

  // ui.enable
  tests.uiEnable('enable');

  // ui.route
  tests.uiRoute('route', ['/', '/ui'], ['ui', 'example/ui/']);
});

describe('Other configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.other, true);

  // other.nodeEnv
  tests.otherNodeEnv(
    'nodeEnv',
    ['development', 'production', 'test'],
    ['dev-env', 'prod-env', 'test-env']
  );

  // other.listenToProcessExits
  tests.otherListenToProcessExits('listenToProcessExits');

  // other.noLogo
  tests.otherNoLogo('noLogo');

  // other.hardResetPage
  tests.otherHardResetPage('hardResetPage');

  // other.browserShellMode
  tests.otherBrowserShellMode('browserShellMode');
});

describe('Debug configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.debug, true);

  // debug.enable
  tests.debugEnable('enable');

  // debug.headless
  tests.debugHeadless('headless');

  // debug.devtools
  tests.debugDevtools('devtools');

  // debug.listenToConsole
  tests.debugListenToConsole('listenToConsole');

  // debug.dumpio
  tests.debugDumpio('dumpio');

  // debug.slowMo
  tests.debugSlowMo('slowMo');

  // debug.debuggingPort
  tests.debugDebuggingPort('debuggingPort');
});

describe('WebSocket configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.webSocket, true);

  // webSocket.enable
  tests.webSocketEnable('enable');

  // webSocket.reconnect
  tests.webSocketReconnect('reconnect');

  // webSocket.rejectUnauthorized
  tests.webSocketRejectUnauthorized('rejectUnauthorized');

  // webSocket.pingTimeout
  tests.webSocketPingTimeout('pingTimeout');

  // webSocket.reconnectInterval
  tests.webSocketReconnectInterval('reconnectInterval');

  // webSocket.reconnectAttempts
  tests.webSocketReconnectAttempts('reconnectAttempts');

  // webSocket.messageInterval
  tests.webSocketMessageInterval('messageInterval');

  // webSocket.gatherAllOptions
  tests.webSocketGatherAllOptions('gatherAllOptions');

  // webSocket.url
  tests.webSocketUrl(
    'url',
    ['ws://example.com', 'wss://example.com'],
    ['ws:a.com', 'ws:/b.com', 'wss:c.com', 'wss:/d.com']
  );

  // webSocket.secret
  tests.webSocketSecret('secret');
});

describe('Payload configuration options should be correctly parsed and validated', () => {
  // Return config tests with a specific schema and strictCheck flag injected
  const tests = configTests(StrictConfigSchema.shape.payload, true);

  // payload.svg
  tests.payloadSvg('svg');

  // payload.b64
  tests.payloadB64('b64');

  // payload.noDownload
  tests.payloadNoDownload('noDownload');

  // payload.requestId
  tests.payloadRequestId('requestId');
});
