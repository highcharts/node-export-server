import { describe } from '@jest/globals';

import { configTests } from './shared';
import { EnvSchema } from '../../../lib/envs';

// Return config tests with a specific schema and strictCheck flag injected
const tests = configTests(EnvSchema.partial(), false);

describe('PUPPETEER environment variables should be correctly parsed and validated', () => {
  // PUPPETEER_ARGS
  tests.puppeteerArgs(
    'PUPPETEER_ARGS',
    '--disable-sync, --enable-unsafe-webgpu, --hide-crash-restore-bubble, --hide-scrollbars, --metrics-recording-only',
    [
      '--disable-sync',
      '--enable-unsafe-webgpu',
      '--hide-crash-restore-bubble',
      '--hide-scrollbars',
      '--metrics-recording-only'
    ]
  );
});

describe('HIGHCHARTS environment variables should be correctly parsed and validated', () => {
  // HIGHCHARTS_VERSION
  tests.highchartsVersion('HIGHCHARTS_VERSION');

  // HIGHCHARTS_CDN_URL
  tests.highchartsCdnUrl(
    'HIGHCHARTS_CDN_URL',
    ['http://example.com', 'https://example.com'],
    ['http:a.com', 'http:/b.com', 'https:c.com', 'https:/d.com']
  );

  // HIGHCHARTS_FORCE_FETCH
  tests.highchartsForceFetch('HIGHCHARTS_FORCE_FETCH');

  // HIGHCHARTS_CACHE_PATH
  tests.highchartsCachePath('HIGHCHARTS_CACHE_PATH');

  // HIGHCHARTS_ADMIN_TOKEN
  tests.highchartsAdminToken('HIGHCHARTS_ADMIN_TOKEN');

  // HIGHCHARTS_CORE_SCRIPTS
  tests.highchartsCoreScripts(
    'HIGHCHARTS_CORE_SCRIPTS',
    'highcharts, highcharts-more, text1, highcharts-3d, text2',
    ['highcharts', 'highcharts-more', 'highcharts-3d']
  );

  // HIGHCHARTS_MODULE_SCRIPTS
  tests.highchartsModuleScripts(
    'HIGHCHARTS_MODULE_SCRIPTS',
    'data, text1, data-tools, text2',
    ['data', 'data-tools']
  );

  // HIGHCHARTS_INDICATOR_SCRIPTS
  tests.highchartsIndicatorScripts(
    'HIGHCHARTS_INDICATOR_SCRIPTS',
    'text1, indicators-all, text2',
    ['indicators-all']
  );

  // HIGHCHARTS_CUSTOM_SCRIPTS
  tests.highchartsCustomScripts(
    'HIGHCHARTS_CUSTOM_SCRIPTS',
    'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js, text1, https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js, text2',
    [
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
    ]
  );
});

describe('EXPORT environment variables should be correctly parsed and validated', () => {
  // EXPORT_TYPE
  tests.exportType(
    'EXPORT_TYPE',
    ['jpeg', 'jpg', 'png', 'pdf', 'svg'],
    ['json', 'txt']
  );

  // EXPORT_CONSTR
  tests.exportConstr(
    'EXPORT_CONSTR',
    ['chart', 'stockChart', 'mapChart', 'ganttChart'],
    ['stock', 'map', 'gantt']
  );

  // EXPORT_DEFAULT_HEIGHT
  tests.exportDefaultHeight('EXPORT_DEFAULT_HEIGHT');

  // EXPORT_DEFAULT_WIDTH
  tests.exportDefaultWidth('EXPORT_DEFAULT_WIDTH');

  // EXPORT_DEFAULT_SCALE
  tests.exportDefaultScale('EXPORT_DEFAULT_SCALE');

  // EXPORT_RASTERIZATION_TIMEOUT
  tests.exportRasterizationTimeout('EXPORT_RASTERIZATION_TIMEOUT');
});

describe('CUSTOM_LOGIC environment variables should be correctly parsed and validated', () => {
  // CUSTOM_LOGIC_ALLOW_CODE_EXECUTION
  tests.customLogicAllowCodeExecution('CUSTOM_LOGIC_ALLOW_CODE_EXECUTION');

  // CUSTOM_LOGIC_ALLOW_FILE_RESOURCES
  tests.customLogicAllowFileResources('CUSTOM_LOGIC_ALLOW_FILE_RESOURCES');
});

describe('SERVER environment variables should be correctly parsed and validated', () => {
  // SERVER_ENABLE
  tests.serverEnable('SERVER_ENABLE');

  // SERVER_HOST
  tests.serverHost('SERVER_HOST');

  // SERVER_PORT
  tests.serverPort('SERVER_PORT');

  // SERVER_BENCHMARKING
  tests.serverBenchmarking('SERVER_BENCHMARKING');
});

describe('SERVER_PROXY environment variables should be correctly parsed and validated', () => {
  // SERVER_PROXY_HOST
  tests.serverProxyHost('SERVER_PROXY_HOST');

  // SERVER_PROXY_PORT
  tests.serverProxyPort('SERVER_PROXY_PORT');

  // SERVER_PROXY_TIMEOUT
  tests.serverProxyTimeout('SERVER_PROXY_TIMEOUT');
});

describe('SERVER_RATE_LIMITING environment variables should be correctly parsed and validated', () => {
  // SERVER_RATE_LIMITING_ENABLE
  tests.serverRateLimitingEnable('SERVER_RATE_LIMITING_ENABLE');

  // SERVER_RATE_LIMITING_MAX_REQUESTS
  tests.serverRateLimitingMaxRequests('SERVER_RATE_LIMITING_MAX_REQUESTS');

  // SERVER_RATE_LIMITING_WINDOW
  tests.serverRateLimitingWindow('SERVER_RATE_LIMITING_WINDOW');

  // SERVER_RATE_LIMITING_DELAY
  tests.serverRateLimitingDelay('SERVER_RATE_LIMITING_DELAY');

  // SERVER_RATE_LIMITING_TRUST_PROXY
  tests.serverRateLimitingTrustProxy('SERVER_RATE_LIMITING_TRUST_PROXY');

  // SERVER_RATE_LIMITING_SKIP_KEY
  tests.serverRateLimitingSkipKey('SERVER_RATE_LIMITING_SKIP_KEY');

  // SERVER_RATE_LIMITING_SKIP_TOKEN
  tests.serverRateLimitingSkipToken('SERVER_RATE_LIMITING_SKIP_TOKEN');
});

describe('SERVER_SSL environment variables should be correctly parsed and validated', () => {
  // SERVER_SSL_ENABLE
  tests.serverSslEnable('SERVER_SSL_ENABLE');

  // SERVER_SSL_FORCE
  tests.serverSslForce('SERVER_SSL_FORCE');

  // SERVER_SSL_PORT
  tests.serverSslPort('SERVER_SSL_PORT');

  // SERVER_SSL_CERT_PATH
  tests.serverSslCertPath('SERVER_SSL_CERT_PATH');
});

describe('POOL environment variables should be correctly parsed and validated', () => {
  // POOL_MIN_WORKERS
  tests.poolMinWorkers('POOL_MIN_WORKERS');

  // POOL_MAX_WORKERS
  tests.poolMaxWorkers('POOL_MAX_WORKERS');

  // POOL_WORK_LIMIT
  tests.poolWorkLimit('POOL_WORK_LIMIT');

  // POOL_ACQUIRE_TIMEOUT
  tests.poolAcquireTimeout('POOL_ACQUIRE_TIMEOUT');

  // POOL_CREATE_TIMEOUT
  tests.poolCreateTimeout('POOL_CREATE_TIMEOUT');

  // POOL_DESTROY_TIMEOUT
  tests.poolDestroyTimeout('POOL_DESTROY_TIMEOUT');

  // POOL_IDLE_TIMEOUT
  tests.poolIdleTimeout('POOL_IDLE_TIMEOUT');

  // POOL_CREATE_RETRY_INTERVAL
  tests.poolCreateRetryInterval('POOL_CREATE_RETRY_INTERVAL');

  // POOL_REAPER_INTERVAL
  tests.poolReaperInterval('POOL_REAPER_INTERVAL');

  // POOL_BENCHMARKING
  tests.poolBenchmarking('POOL_BENCHMARKING');
});

describe('LOGGING environment variables should be correctly parsed and validated', () => {
  // LOGGING_LEVEL
  tests.loggingLevel('LOGGING_LEVEL');

  // LOGGING_FILE
  tests.loggingFile('LOGGING_FILE');

  // LOGGING_DEST
  tests.loggingDest('LOGGING_DEST');

  // LOGGING_TO_CONSOLE
  tests.loggingToConsole('LOGGING_TO_CONSOLE');

  // LOGGING_TO_FILE
  tests.loggingToFile('LOGGING_TO_FILE');
});

describe('UI environment variables should be correctly parsed and validated', () => {
  // UI_ENABLE
  tests.uiEnable('UI_ENABLE');

  // UI_ROUTE
  tests.uiRoute('UI_ROUTE', ['/', '/ui'], ['ui', 'example/ui/']);
});

describe('OTHER environment variables should be correctly parsed and validated', () => {
  // OTHER_NODE_ENV
  tests.otherNodeEnv(
    'OTHER_NODE_ENV',
    ['development', 'production', 'test'],
    ['dev-env', 'prod-env', 'test-env']
  );

  // OTHER_LISTEN_TO_PROCESS_EXITS
  tests.otherListenToProcessExits('OTHER_LISTEN_TO_PROCESS_EXITS');

  // OTHER_NO_LOGO
  tests.otherNoLogo('OTHER_NO_LOGO');

  // OTHER_HARD_RESET_PAGE
  tests.otherHardResetPage('OTHER_HARD_RESET_PAGE');

  // OTHER_BROWSER_SHELL_MODE
  tests.otherBrowserShellMode('OTHER_BROWSER_SHELL_MODE');
});

describe('DEBUG environment variables should be correctly parsed and validated', () => {
  // DEBUG_ENABLE
  tests.debugEnable('DEBUG_ENABLE');

  // DEBUG_HEADLESS
  tests.debugHeadless('DEBUG_HEADLESS');

  // DEBUG_DEVTOOLS
  tests.debugDevtools('DEBUG_DEVTOOLS');

  // DEBUG_LISTEN_TO_CONSOLE
  tests.debugListenToConsole('DEBUG_LISTEN_TO_CONSOLE');

  // DEBUG_DUMPIO
  tests.debugDumpio('DEBUG_DUMPIO');

  // DEBUG_SLOW_MO
  tests.debugSlowMo('DEBUG_SLOW_MO');

  // DEBUG_DEBUGGING_PORT
  tests.debugDebuggingPort('DEBUG_DEBUGGING_PORT');
});

describe('WEB_SOCKET environment variables should be correctly parsed and validated', () => {
  // WEB_SOCKET_ENABLE
  tests.webSocketEnable('WEB_SOCKET_ENABLE');

  // WEB_SOCKET_RECONNECT
  tests.webSocketReconnect('WEB_SOCKET_RECONNECT');

  // WEB_SOCKET_REJECT_UNAUTHORIZED
  tests.webSocketRejectUnauthorized('WEB_SOCKET_REJECT_UNAUTHORIZED');

  // WEB_SOCKET_PING_TIMEOUT
  tests.webSocketPingTimeout('WEB_SOCKET_PING_TIMEOUT');

  // WEB_SOCKET_RECONNECT_INTERVAL
  tests.webSocketReconnectInterval('WEB_SOCKET_RECONNECT_INTERVAL');

  // WEB_SOCKET_RECONNECT_ATTEMPTS
  tests.webSocketReconnectAttempts('WEB_SOCKET_RECONNECT_ATTEMPTS');

  // WEB_SOCKET_MESSAGE_INTERVAL
  tests.webSocketMessageInterval('WEB_SOCKET_MESSAGE_INTERVAL');

  // WEB_SOCKET_GATHER_ALL_OPTIONS
  tests.webSocketGatherAllOptions('WEB_SOCKET_GATHER_ALL_OPTIONS');

  // WEB_SOCKET_URL
  tests.webSocketUrl(
    'WEB_SOCKET_URL',
    ['ws://example.com/socket', 'wss://example.com/socket'],
    ['example.com', 'ws:a.com', 'ws:/b.com', 'wss:c.com', 'wss:/d.com']
  );

  // WEB_SOCKET_SECRET
  tests.webSocketSecret('WEB_SOCKET_SECRET');
});
