import { describe } from '@jest/globals';

import { sharedTests } from './shared';
import { EnvSchema } from '../../../lib/envs';

const generalTests = sharedTests(EnvSchema.partial());

/**
 * Shared tests for the environment variables validators and parsers
 */
const envTests = {
  puppeteerArgs: (values, filteredArray) => {
    describe('PUPPETEER_ARGS', () =>
      generalTests.stringArray('PUPPETEER_ARGS', values, filteredArray, false));
  },
  highchartsVersion: () => {
    describe('HIGHCHARTS_VERSION', () =>
      generalTests.version('HIGHCHARTS_VERSION', false));
  },
  highchartsCdnUrl: (correctValues, incorrectValues) => {
    describe('HIGHCHARTS_CDN_URL', () =>
      generalTests.startsWith(
        'HIGHCHARTS_CDN_URL',
        correctValues,
        incorrectValues,
        false
      ));
  },
  highchartsForceFetch: () => {
    describe('HIGHCHARTS_FORCE_FETCH', () =>
      generalTests.boolean('HIGHCHARTS_FORCE_FETCH', false));
  },
  highchartsCachePath: () => {
    describe('HIGHCHARTS_CACHE_PATH', () =>
      generalTests.string('HIGHCHARTS_CACHE_PATH', false));
  },
  highchartsAdminToken: () => {
    describe('HIGHCHARTS_ADMIN_TOKEN', () =>
      generalTests.string('HIGHCHARTS_ADMIN_TOKEN', false));
  },
  highchartsCoreScripts: (values, filteredValues) => {
    describe('HIGHCHARTS_CORE_SCRIPTS', () =>
      generalTests.scriptsArray(
        'HIGHCHARTS_CORE_SCRIPTS',
        values,
        filteredValues,
        false
      ));
  },
  highchartsModuleScripts: (values, filteredValues) => {
    describe('HIGHCHARTS_MODULE_SCRIPTS', () =>
      generalTests.scriptsArray(
        'HIGHCHARTS_MODULE_SCRIPTS',
        values,
        filteredValues,
        false
      ));
  },
  highchartsIndicatorScripts: (values, filteredValues) => {
    describe('HIGHCHARTS_INDICATOR_SCRIPTS', () =>
      generalTests.scriptsArray(
        'HIGHCHARTS_INDICATOR_SCRIPTS',
        values,
        filteredValues,
        false
      ));
  },
  highchartsCustomScripts: (values, filteredValues) => {
    describe('HIGHCHARTS_CUSTOM_SCRIPTS', () =>
      generalTests.scriptsArray(
        'HIGHCHARTS_CUSTOM_SCRIPTS',
        values,
        filteredValues,
        false
      ));
  },
  exportType: (correctValues, incorrectValues) => {
    describe('EXPORT_TYPE', () =>
      generalTests.enum('EXPORT_TYPE', correctValues, incorrectValues, false));
  },
  exportConstr: (correctValues, incorrectValues) => {
    describe('EXPORT_CONSTR', () =>
      generalTests.enum(
        'EXPORT_CONSTR',
        correctValues,
        incorrectValues,
        false
      ));
  },
  exportDefaultHeight: () => {
    describe('EXPORT_DEFAULT_HEIGHT', () =>
      generalTests.positiveNum('EXPORT_DEFAULT_HEIGHT', false));
  },
  exportDefaultWidth: () => {
    describe('EXPORT_DEFAULT_WIDTH', () =>
      generalTests.positiveNum('EXPORT_DEFAULT_WIDTH', false));
  },
  exportDefaultScale: () => {
    describe('EXPORT_DEFAULT_SCALE', () =>
      generalTests.scale('EXPORT_DEFAULT_SCALE', false));
  },
  exportRasterizationTimeout: () => {
    describe('EXPORT_RASTERIZATION_TIMEOUT', () =>
      generalTests.nonNegativeNum('EXPORT_RASTERIZATION_TIMEOUT', false));
  },
  customLogicAllowCodeExecution: () => {
    describe('CUSTOM_LOGIC_ALLOW_CODE_EXECUTION', () =>
      generalTests.boolean('CUSTOM_LOGIC_ALLOW_CODE_EXECUTION', false));
  },
  customLogicAllowFileResources: () => {
    describe('CUSTOM_LOGIC_ALLOW_FILE_RESOURCES', () =>
      generalTests.boolean('CUSTOM_LOGIC_ALLOW_FILE_RESOURCES', false));
  },
  serverEnable: () => {
    describe('SERVER_ENABLE', () =>
      generalTests.boolean('SERVER_ENABLE', false));
  },
  serverHost: () => {
    describe('SERVER_HOST', () => generalTests.string('SERVER_HOST', false));
  },
  serverPort: () => {
    describe('SERVER_PORT', () =>
      generalTests.nonNegativeNum('SERVER_PORT', false));
  },
  serverBenchmarking: () => {
    describe('SERVER_BENCHMARKING', () =>
      generalTests.boolean('SERVER_BENCHMARKING', false));
  },
  serverProxyHost: () => {
    describe('SERVER_PROXY_HOST', () =>
      generalTests.string('SERVER_PROXY_HOST', false));
  },
  serverProxyPort: () => {
    describe('SERVER_PROXY_PORT', () =>
      generalTests.nonNegativeNum('SERVER_PROXY_PORT', false));
  },
  serverProxyTimeout: () => {
    describe('SERVER_PROXY_TIMEOUT', () =>
      generalTests.nonNegativeNum('SERVER_PROXY_TIMEOUT', false));
  },
  serverRateLimitingEnable: () => {
    describe('SERVER_RATE_LIMITING_ENABLE', () =>
      generalTests.boolean('SERVER_RATE_LIMITING_ENABLE', false));
  },
  serverRateLimitingMaxRequests: () => {
    describe('SERVER_RATE_LIMITING_MAX_REQUESTS', () =>
      generalTests.nonNegativeNum('SERVER_RATE_LIMITING_MAX_REQUESTS', false));
  },
  serverRateLimitingWindow: () => {
    describe('SERVER_RATE_LIMITING_WINDOW', () =>
      generalTests.nonNegativeNum('SERVER_RATE_LIMITING_WINDOW', false));
  },
  serverRateLimitingDelay: () => {
    describe('SERVER_RATE_LIMITING_DELAY', () =>
      generalTests.nonNegativeNum('SERVER_RATE_LIMITING_DELAY', false));
  },
  serverRateLimitingTrustProxy: () => {
    describe('SERVER_RATE_LIMITING_TRUST_PROXY', () =>
      generalTests.boolean('SERVER_RATE_LIMITING_TRUST_PROXY', false));
  },
  serverRateLimitingSkipKey: () => {
    describe('SERVER_RATE_LIMITING_SKIP_KEY', () =>
      generalTests.string('SERVER_RATE_LIMITING_SKIP_KEY', false));
  },
  serverRateLimitingSkipToken: () => {
    describe('SERVER_RATE_LIMITING_SKIP_TOKEN', () =>
      generalTests.string('SERVER_RATE_LIMITING_SKIP_TOKEN', false));
  },
  serverSslEnable: () => {
    describe('SERVER_SSL_ENABLE', () =>
      generalTests.boolean('SERVER_SSL_ENABLE', false));
  },
  serverSslForce: () => {
    describe('SERVER_SSL_FORCE', () =>
      generalTests.boolean('SERVER_SSL_FORCE', false));
  },
  serverSslPort: () => {
    describe('SERVER_SSL_PORT', () =>
      generalTests.nonNegativeNum('SERVER_SSL_PORT', false));
  },
  serverSslCertPath: () => {
    describe('SERVER_SSL_CERT_PATH', () =>
      generalTests.string('SERVER_SSL_CERT_PATH', false));
  },
  poolMinWorkers: () => {
    describe('POOL_MIN_WORKERS', () =>
      generalTests.positiveNum('POOL_MIN_WORKERS', false));
  },
  poolMaxWorkers: () => {
    describe('POOL_MAX_WORKERS', () =>
      generalTests.positiveNum('POOL_MAX_WORKERS', false));
  },
  poolWorkLimit: () => {
    describe('POOL_WORK_LIMIT', () =>
      generalTests.positiveNum('POOL_WORK_LIMIT', false));
  },
  poolAcquireTimeout: () => {
    describe('POOL_ACQUIRE_TIMEOUT', () =>
      generalTests.nonNegativeNum('POOL_ACQUIRE_TIMEOUT', false));
  },
  poolCreateTimeout: () => {
    describe('POOL_CREATE_TIMEOUT', () =>
      generalTests.nonNegativeNum('POOL_CREATE_TIMEOUT', false));
  },
  poolDestroyTimeout: () => {
    describe('POOL_DESTROY_TIMEOUT', () =>
      generalTests.nonNegativeNum('POOL_DESTROY_TIMEOUT', false));
  },
  poolIdleTimeout: () => {
    describe('POOL_IDLE_TIMEOUT', () =>
      generalTests.nonNegativeNum('POOL_IDLE_TIMEOUT', false));
  },
  poolCreateRetryInterval: () => {
    describe('POOL_CREATE_RETRY_INTERVAL', () =>
      generalTests.nonNegativeNum('POOL_CREATE_RETRY_INTERVAL', false));
  },
  poolReaperInterval: () => {
    describe('POOL_REAPER_INTERVAL', () =>
      generalTests.nonNegativeNum('POOL_REAPER_INTERVAL', false));
  },
  poolBenchmarking: () => {
    describe('POOL_BENCHMARKING', () =>
      generalTests.boolean('POOL_BENCHMARKING', false));
  },
  loggingLevel: () => {
    describe('LOGGING_LEVEL', () =>
      generalTests.logLevel('LOGGING_LEVEL', false));
  },
  loggingFile: () => {
    describe('LOGGING_FILE', () => generalTests.string('LOGGING_FILE', false));
  },
  loggingDest: () => {
    describe('LOGGING_DEST', () => generalTests.string('LOGGING_DEST', false));
  },
  loggingToConsole: () => {
    describe('LOGGING_TO_CONSOLE', () =>
      generalTests.boolean('LOGGING_TO_CONSOLE', false));
  },
  loggingToFile: () => {
    describe('LOGGING_TO_FILE', () =>
      generalTests.boolean('LOGGING_TO_FILE', false));
  },
  uiEnable: () => {
    describe('UI_ENABLE', () => generalTests.boolean('UI_ENABLE', false));
  },
  uiRoute: (correctValues, incorrectValues) => {
    describe('UI_ROUTE', () =>
      generalTests.startsWith(
        'UI_ROUTE',
        correctValues,
        incorrectValues,
        false
      ));
  },
  otherNodeEnv: (correctValues, incorrectValues) => {
    describe('OTHER_NODE_ENV', () =>
      generalTests.enum(
        'OTHER_NODE_ENV',
        correctValues,
        incorrectValues,
        false
      ));
  },
  otherListenToProcessExits: () => {
    describe('OTHER_LISTEN_TO_PROCESS_EXITS', () =>
      generalTests.boolean('OTHER_LISTEN_TO_PROCESS_EXITS', false));
  },
  otherNoLogo: () => {
    describe('OTHER_NO_LOGO', () =>
      generalTests.boolean('OTHER_NO_LOGO', false));
  },
  otherHardResetPage: () => {
    describe('OTHER_HARD_RESET_PAGE', () =>
      generalTests.boolean('OTHER_HARD_RESET_PAGE', false));
  },
  otherBrowserShellMode: () => {
    describe('OTHER_BROWSER_SHELL_MODE', () =>
      generalTests.boolean('OTHER_BROWSER_SHELL_MODE', false));
  },
  debugEnable: () => {
    describe('DEBUG_ENABLE', () => generalTests.boolean('DEBUG_ENABLE', false));
  },
  debugHeadless: () => {
    describe('DEBUG_HEADLESS', () =>
      generalTests.boolean('DEBUG_HEADLESS', false));
  },
  debugDevtools: () => {
    describe('DEBUG_DEVTOOLS', () =>
      generalTests.boolean('DEBUG_DEVTOOLS', false));
  },
  debugListenToConsole: () => {
    describe('DEBUG_LISTEN_TO_CONSOLE', () =>
      generalTests.boolean('DEBUG_LISTEN_TO_CONSOLE', false));
  },
  debugDumpio: () => {
    describe('DEBUG_DUMPIO', () => generalTests.boolean('DEBUG_DUMPIO', false));
  },
  debugSlowMo: () => {
    describe('DEBUG_SLOW_MO', () =>
      generalTests.nonNegativeNum('DEBUG_SLOW_MO', false));
  },
  debugDebuggingPort: () => {
    describe('DEBUG_DEBUGGING_PORT', () =>
      generalTests.nonNegativeNum('DEBUG_DEBUGGING_PORT', false));
  },
  webSocketEnable: () => {
    describe('WEB_SOCKET_ENABLE', () =>
      generalTests.boolean('WEB_SOCKET_ENABLE', false));
  },
  webSocketReconnect: () => {
    describe('WEB_SOCKET_RECONNECT', () =>
      generalTests.boolean('WEB_SOCKET_RECONNECT', false));
  },
  webSocketRejectUnauthorized: () => {
    describe('WEB_SOCKET_REJECT_UNAUTHORIZED', () =>
      generalTests.boolean('WEB_SOCKET_REJECT_UNAUTHORIZED', false));
  },
  webSocketPingTimeout: () => {
    describe('WEB_SOCKET_PING_TIMEOUT', () =>
      generalTests.nonNegativeNum('WEB_SOCKET_PING_TIMEOUT', false));
  },
  webSocketReconnectInterval: () => {
    describe('WEB_SOCKET_RECONNECT_INTERVAL', () =>
      generalTests.nonNegativeNum('WEB_SOCKET_RECONNECT_INTERVAL', false));
  },
  webSocketReconnectAttempts: () => {
    describe('WEB_SOCKET_RECONNECT_ATTEMPTS', () =>
      generalTests.nonNegativeNum('WEB_SOCKET_RECONNECT_ATTEMPTS', false));
  },
  webSocketMessageInterval: () => {
    describe('WEB_SOCKET_MESSAGE_INTERVAL', () =>
      generalTests.nonNegativeNum('WEB_SOCKET_MESSAGE_INTERVAL', false));
  },
  webSocketGatherAllOptions: () => {
    describe('WEB_SOCKET_GATHER_ALL_OPTIONS', () =>
      generalTests.boolean('WEB_SOCKET_GATHER_ALL_OPTIONS', false));
  },
  webSocketUrl: (correctValues, incorrectValues) => {
    describe('WEB_SOCKET_URL', () =>
      generalTests.startsWith(
        'WEB_SOCKET_URL',
        correctValues,
        incorrectValues,
        false
      ));
  },
  webSocketSecret: () => {
    describe('WEB_SOCKET_SECRET', () =>
      generalTests.string('WEB_SOCKET_SECRET', false));
  }
};

describe('PUPPETEER environment variables should be correctly parsed and validated', () => {
  // PUPPETEER_ARGS
  envTests.puppeteerArgs(
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
  envTests.highchartsVersion();

  // HIGHCHARTS_CDN_URL
  envTests.highchartsCdnUrl(
    ['http://example.com', 'https://example.com'],
    ['http:a.com', 'http:/b.com', 'https:c.com', 'https:/d.com']
  );

  // HIGHCHARTS_FORCE_FETCH
  envTests.highchartsForceFetch();

  // HIGHCHARTS_CACHE_PATH
  envTests.highchartsCachePath();

  // HIGHCHARTS_ADMIN_TOKEN
  envTests.highchartsAdminToken();

  // HIGHCHARTS_CORE_SCRIPTS
  envTests.highchartsCoreScripts(
    'highcharts,highcharts-more, false, true, undefined, null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {}",highcharts-3d',
    ['highcharts', 'highcharts-more', 'highcharts-3d']
  );

  // HIGHCHARTS_MODULE_SCRIPTS
  envTests.highchartsModuleScripts(
    'data , false, true, undefined, null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {},data-tools, text',
    ['data', 'data-tools']
  );

  // HIGHCHARTS_INDICATOR_SCRIPTS
  envTests.highchartsIndicatorScripts(
    'text1, text2 ,indicators-all , false, true, undefined, null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {},',
    ['indicators-all']
  );

  // HIGHCHARTS_CUSTOM_SCRIPTS
  envTests.highchartsCustomScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js, undefined, NaN, null, false, true,https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js,  false, true, undefined, null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {},',
    [
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js'
    ]
  );
});

describe('EXPORT environment variables should be correctly parsed and validated', () => {
  // EXPORT_TYPE
  envTests.exportType(['jpeg', 'jpg', 'png', 'pdf', 'svg'], ['json', 'txt']);

  // EXPORT_CONSTR
  envTests.exportConstr(
    ['chart', 'stockChart', 'mapChart', 'ganttChart'],
    ['stock', 'map', 'gantt']
  );

  // EXPORT_DEFAULT_HEIGHT
  envTests.exportDefaultHeight();

  // EXPORT_DEFAULT_WIDTH
  envTests.exportDefaultWidth();

  // EXPORT_DEFAULT_SCALE
  envTests.exportDefaultScale();

  // EXPORT_RASTERIZATION_TIMEOUT
  envTests.exportRasterizationTimeout();
});

describe('CUSTOM_LOGIC environment variables should be correctly parsed and validated', () => {
  // CUSTOM_LOGIC_ALLOW_CODE_EXECUTION
  envTests.customLogicAllowCodeExecution();

  // CUSTOM_LOGIC_ALLOW_FILE_RESOURCES
  envTests.customLogicAllowFileResources();
});

describe('SERVER environment variables should be correctly parsed and validated', () => {
  // SERVER_ENABLE
  envTests.serverEnable();

  // SERVER_HOST
  envTests.serverHost();

  // SERVER_PORT
  envTests.serverPort();

  // SERVER_BENCHMARKING
  envTests.serverBenchmarking();
});

describe('SERVER_PROXY environment variables should be correctly parsed and validated', () => {
  // SERVER_PROXY_HOST
  envTests.serverProxyHost();

  // SERVER_PROXY_PORT
  envTests.serverProxyPort();

  // SERVER_PROXY_TIMEOUT
  envTests.serverProxyTimeout();
});

describe('SERVER_RATE_LIMITING environment variables should be correctly parsed and validated', () => {
  // SERVER_RATE_LIMITING_ENABLE
  envTests.serverRateLimitingEnable();

  // SERVER_RATE_LIMITING_MAX_REQUESTS
  envTests.serverRateLimitingMaxRequests();

  // SERVER_RATE_LIMITING_WINDOW
  envTests.serverRateLimitingWindow();

  // SERVER_RATE_LIMITING_DELAY
  envTests.serverRateLimitingDelay();

  // SERVER_RATE_LIMITING_TRUST_PROXY
  envTests.serverRateLimitingTrustProxy();

  // SERVER_RATE_LIMITING_SKIP_KEY
  envTests.serverRateLimitingSkipKey();

  // SERVER_RATE_LIMITING_SKIP_TOKEN
  envTests.serverRateLimitingSkipToken();
});

describe('SERVER_SSL environment variables should be correctly parsed and validated', () => {
  // SERVER_SSL_ENABLE
  envTests.serverSslEnable();

  // SERVER_SSL_FORCE
  envTests.serverSslForce();

  // SERVER_SSL_PORT
  envTests.serverSslPort();

  // SERVER_SSL_CERT_PATH
  envTests.serverSslCertPath();
});

describe('POOL environment variables should be correctly parsed and validated', () => {
  // POOL_MIN_WORKERS
  envTests.poolMinWorkers();

  // POOL_MAX_WORKERS
  envTests.poolMaxWorkers();

  // POOL_WORK_LIMIT
  envTests.poolWorkLimit();

  // POOL_ACQUIRE_TIMEOUT
  envTests.poolAcquireTimeout();

  // POOL_CREATE_TIMEOUT
  envTests.poolCreateTimeout();

  // POOL_DESTROY_TIMEOUT
  envTests.poolDestroyTimeout();

  // POOL_IDLE_TIMEOUT
  envTests.poolIdleTimeout();

  // POOL_CREATE_RETRY_INTERVAL
  envTests.poolCreateRetryInterval();

  // POOL_REAPER_INTERVAL
  envTests.poolReaperInterval();

  // POOL_BENCHMARKING
  envTests.poolBenchmarking();
});

describe('LOGGING environment variables should be correctly parsed and validated', () => {
  // LOGGING_LEVEL
  envTests.loggingLevel();

  // LOGGING_FILE
  envTests.loggingFile();

  // LOGGING_DEST
  envTests.loggingDest();

  // LOGGING_TO_CONSOLE
  envTests.loggingToConsole();

  // LOGGING_TO_FILE
  envTests.loggingToFile();
});

describe('UI environment variables should be correctly parsed and validated', () => {
  // UI_ENABLE
  envTests.uiEnable();

  // UI_ROUTE
  envTests.uiRoute(['/', '/ui'], ['ui', 'example/ui/']);
});

describe('OTHER environment variables should be correctly parsed and validated', () => {
  // OTHER_NODE_ENV
  envTests.otherNodeEnv(
    ['development', 'production', 'test'],
    ['dev-env', 'prod-env', 'test-env']
  );

  // OTHER_LISTEN_TO_PROCESS_EXITS
  envTests.otherListenToProcessExits();

  // OTHER_NO_LOGO
  envTests.otherNoLogo();

  // OTHER_HARD_RESET_PAGE
  envTests.otherHardResetPage();

  // OTHER_BROWSER_SHELL_MODE
  envTests.otherBrowserShellMode();
});

describe('DEBUG environment variables should be correctly parsed and validated', () => {
  // DEBUG_ENABLE
  envTests.debugEnable();

  // DEBUG_HEADLESS
  envTests.debugHeadless();

  // DEBUG_DEVTOOLS
  envTests.debugDevtools();

  // DEBUG_LISTEN_TO_CONSOLE
  envTests.debugListenToConsole();

  // DEBUG_DUMPIO
  envTests.debugDumpio();

  // DEBUG_SLOW_MO
  envTests.debugSlowMo();

  // DEBUG_DEBUGGING_PORT
  envTests.debugDebuggingPort();
});

describe('WEB_SOCKET environment variables should be correctly parsed and validated', () => {
  // WEB_SOCKET_ENABLE
  envTests.webSocketEnable();

  // WEB_SOCKET_RECONNECT
  envTests.webSocketReconnect();

  // WEB_SOCKET_REJECT_UNAUTHORIZED
  envTests.webSocketRejectUnauthorized();

  // WEB_SOCKET_PING_TIMEOUT
  envTests.webSocketPingTimeout();

  // WEB_SOCKET_RECONNECT_INTERVAL
  envTests.webSocketReconnectInterval();

  // WEB_SOCKET_RECONNECT_ATTEMPTS
  envTests.webSocketReconnectAttempts();

  // WEB_SOCKET_MESSAGE_INTERVAL
  envTests.webSocketMessageInterval();

  // WEB_SOCKET_GATHER_ALL_OPTIONS
  envTests.webSocketGatherAllOptions();

  // WEB_SOCKET_URL
  envTests.webSocketUrl(
    ['ws://example.com/socket', 'wss://example.com/socket'],
    ['example.com', 'ws:a.com', 'ws:/b.com', 'wss:c.com', 'wss:/d.com']
  );

  // WEB_SOCKET_SECRET
  envTests.webSocketSecret();
});
