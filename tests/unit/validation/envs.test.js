import { describe } from '@jest/globals';

import { sharedTests } from './shared';
import { EnvSchema } from '../../../lib/envs';

const generalTests = sharedTests(EnvSchema.partial());

/**
 * Shared tests for the environment variables validators and parsers
 */
const envTests = {
  highchartsVersion: () => {
    describe('HIGHCHARTS_VERSION', () =>
      generalTests.version('HIGHCHARTS_VERSION', true));
  },
  highchartsCdnUrl: (correctValues, incorrectValues) => {
    describe('HIGHCHARTS_CDN_URL', () =>
      generalTests.startsWith(
        'HIGHCHARTS_CDN_URL',
        correctValues,
        incorrectValues,
        true
      ));
  },
  highchartsForceFetch: () => {
    describe('HIGHCHARTS_FORCE_FETCH', () =>
      generalTests.boolean('HIGHCHARTS_FORCE_FETCH', true));
  },
  highchartsCachePath: () => {
    describe('HIGHCHARTS_CACHE_PATH', () =>
      generalTests.nullishString('HIGHCHARTS_CACHE_PATH'));
  },
  highchartsAdminToken: () => {
    describe('HIGHCHARTS_ADMIN_TOKEN', () =>
      generalTests.nullishString('HIGHCHARTS_ADMIN_TOKEN', true));
  },
  highchartsCoreScripts: (values, filteredValues) => {
    describe('HIGHCHARTS_CORE_SCRIPTS', () =>
      generalTests.scriptsArray(
        'HIGHCHARTS_CORE_SCRIPTS',
        values,
        filteredValues,
        true
      ));
  },
  highchartsModuleScripts: (values, filteredValues) => {
    describe('HIGHCHARTS_MODULE_SCRIPTS', () =>
      generalTests.scriptsArray(
        'HIGHCHARTS_MODULE_SCRIPTS',
        values,
        filteredValues,
        true
      ));
  },
  highchartsIndicatorScripts: (values, filteredValues) => {
    describe('HIGHCHARTS_INDICATOR_SCRIPTS', () =>
      generalTests.scriptsArray(
        'HIGHCHARTS_INDICATOR_SCRIPTS',
        values,
        filteredValues,
        true
      ));
  },
  highchartsCustomScripts: (values, filteredValues) => {
    describe('HIGHCHARTS_CUSTOM_SCRIPTS', () =>
      generalTests.scriptsArray(
        'HIGHCHARTS_CUSTOM_SCRIPTS',
        values,
        filteredValues,
        true
      ));
  },
  exportType: (correctValues, incorrectValues) => {
    describe('EXPORT_TYPE', () =>
      generalTests.enum('EXPORT_TYPE', correctValues, incorrectValues, true));
  },
  exportConstr: (correctValues, incorrectValues) => {
    describe('EXPORT_CONSTR', () =>
      generalTests.enum('EXPORT_CONSTR', correctValues, incorrectValues, true));
  },
  exportDefaultHeight: () => {
    describe('EXPORT_DEFAULT_HEIGHT', () =>
      generalTests.positiveNum('EXPORT_DEFAULT_HEIGHT', true));
  },
  exportDefaultWidth: () => {
    describe('EXPORT_DEFAULT_WIDTH', () =>
      generalTests.positiveNum('EXPORT_DEFAULT_WIDTH', true));
  },
  exportDefaultScale: () => {
    describe('EXPORT_DEFAULT_SCALE', () =>
      generalTests.scale('EXPORT_DEFAULT_SCALE', true));
  },
  exportRasterizationTimeout: () => {
    describe('EXPORT_RASTERIZATION_TIMEOUT', () =>
      generalTests.nonNegativeNum('EXPORT_RASTERIZATION_TIMEOUT', true));
  },
  customLogicAllowCodeExecution: () => {
    describe('CUSTOM_LOGIC_ALLOW_CODE_EXECUTION', () =>
      generalTests.boolean('CUSTOM_LOGIC_ALLOW_CODE_EXECUTION', true));
  },
  customLogicAllowFileResources: () => {
    describe('CUSTOM_LOGIC_ALLOW_FILE_RESOURCES', () =>
      generalTests.boolean('CUSTOM_LOGIC_ALLOW_FILE_RESOURCES', true));
  },
  serverEnable: () => {
    describe('SERVER_ENABLE', () =>
      generalTests.boolean('SERVER_ENABLE', true));
  },
  serverHost: () => {
    describe('SERVER_HOST', () => generalTests.nullishString('SERVER_HOST'));
  },
  serverPort: () => {
    describe('SERVER_PORT', () =>
      generalTests.nonNegativeNum('SERVER_PORT', true));
  },
  serverBenchmarking: () => {
    describe('SERVER_BENCHMARKING', () =>
      generalTests.boolean('SERVER_BENCHMARKING', true));
  },
  serverProxyHost: () => {
    describe('SERVER_PROXY_HOST', () =>
      generalTests.nullishString('SERVER_PROXY_HOST'));
  },
  serverProxyPort: () => {
    describe('SERVER_PROXY_PORT', () =>
      generalTests.nonNegativeNum('SERVER_PROXY_PORT', true));
  },
  serverProxyTimeout: () => {
    describe('SERVER_PROXY_TIMEOUT', () =>
      generalTests.nonNegativeNum('SERVER_PROXY_TIMEOUT', true));
  },
  serverRateLimitingEnable: () => {
    describe('SERVER_RATE_LIMITING_ENABLE', () =>
      generalTests.boolean('SERVER_RATE_LIMITING_ENABLE', true));
  },
  serverRateLimitingMaxRequests: () => {
    describe('SERVER_RATE_LIMITING_MAX_REQUESTS', () =>
      generalTests.nonNegativeNum('SERVER_RATE_LIMITING_MAX_REQUESTS', true));
  },
  serverRateLimitingWindow: () => {
    describe('SERVER_RATE_LIMITING_WINDOW', () =>
      generalTests.nonNegativeNum('SERVER_RATE_LIMITING_WINDOW', true));
  },
  serverRateLimitingDelay: () => {
    describe('SERVER_RATE_LIMITING_DELAY', () =>
      generalTests.nonNegativeNum('SERVER_RATE_LIMITING_DELAY', true));
  },
  serverRateLimitingTrustProxy: () => {
    describe('SERVER_RATE_LIMITING_TRUST_PROXY', () =>
      generalTests.boolean('SERVER_RATE_LIMITING_TRUST_PROXY', true));
  },
  serverRateLimitingSkipKey: () => {
    describe('SERVER_RATE_LIMITING_SKIP_KEY', () =>
      generalTests.nullishString('SERVER_RATE_LIMITING_SKIP_KEY'));
  },
  serverRateLimitingSkipToken: () => {
    describe('SERVER_RATE_LIMITING_SKIP_TOKEN', () =>
      generalTests.nullishString('SERVER_RATE_LIMITING_SKIP_TOKEN'));
  },
  serverSslEnable: () => {
    describe('SERVER_SSL_ENABLE', () =>
      generalTests.boolean('SERVER_SSL_ENABLE', true));
  },
  serverSslForce: () => {
    describe('SERVER_SSL_FORCE', () =>
      generalTests.boolean('SERVER_SSL_FORCE', true));
  },
  serverSslPort: () => {
    describe('SERVER_SSL_PORT', () =>
      generalTests.nonNegativeNum('SERVER_SSL_PORT', true));
  },
  serverSslCertPath: () => {
    describe('SERVER_SSL_CERT_PATH', () =>
      generalTests.nullishString('SERVER_SSL_CERT_PATH'));
  },
  poolMinWorkers: () => {
    describe('POOL_MIN_WORKERS', () =>
      generalTests.positiveNum('POOL_MIN_WORKERS', true));
  },
  poolMaxWorkers: () => {
    describe('POOL_MAX_WORKERS', () =>
      generalTests.positiveNum('POOL_MAX_WORKERS', true));
  },
  poolWorkLimit: () => {
    describe('POOL_WORK_LIMIT', () =>
      generalTests.positiveNum('POOL_WORK_LIMIT', true));
  },
  poolAcquireTimeout: () => {
    describe('POOL_ACQUIRE_TIMEOUT', () =>
      generalTests.nonNegativeNum('POOL_ACQUIRE_TIMEOUT', true));
  },
  poolCreateTimeout: () => {
    describe('POOL_CREATE_TIMEOUT', () =>
      generalTests.nonNegativeNum('POOL_CREATE_TIMEOUT', true));
  },
  poolDestroyTimeout: () => {
    describe('POOL_DESTROY_TIMEOUT', () =>
      generalTests.nonNegativeNum('POOL_DESTROY_TIMEOUT', true));
  },
  poolIdleTimeout: () => {
    describe('POOL_IDLE_TIMEOUT', () =>
      generalTests.nonNegativeNum('POOL_IDLE_TIMEOUT', true));
  },
  poolCreateRetryInterval: () => {
    describe('POOL_CREATE_RETRY_INTERVAL', () =>
      generalTests.nonNegativeNum('POOL_CREATE_RETRY_INTERVAL', true));
  },
  poolReaperInterval: () => {
    describe('POOL_REAPER_INTERVAL', () =>
      generalTests.nonNegativeNum('POOL_REAPER_INTERVAL', true));
  },
  poolBenchmarking: () => {
    describe('POOL_BENCHMARKING', () =>
      generalTests.boolean('POOL_BENCHMARKING', true));
  },
  loggingLevel: () => {
    describe('LOGGING_LEVEL', () =>
      generalTests.logLevel('LOGGING_LEVEL', true));
  },
  loggingFile: () => {
    describe('LOGGING_FILE', () => generalTests.nullishString('LOGGING_FILE'));
  },
  loggingDest: () => {
    describe('LOGGING_DEST', () => generalTests.nullishString('LOGGING_DEST'));
  },
  loggingToConsole: () => {
    describe('LOGGING_TO_CONSOLE', () =>
      generalTests.boolean('LOGGING_TO_CONSOLE', true));
  },
  loggingToFile: () => {
    describe('LOGGING_TO_FILE', () =>
      generalTests.boolean('LOGGING_TO_FILE', true));
  },
  uiEnable: () => {
    describe('UI_ENABLE', () => generalTests.boolean('UI_ENABLE', true));
  },
  uiRoute: (correctValues, incorrectValues) => {
    describe('UI_ROUTE', () =>
      generalTests.startsWith(
        'UI_ROUTE',
        correctValues,
        incorrectValues,
        true
      ));
  },
  otherNodeEnv: (correctValues, incorrectValues) => {
    describe('OTHER_NODE_ENV', () =>
      generalTests.enum(
        'OTHER_NODE_ENV',
        correctValues,
        incorrectValues,
        true
      ));
  },
  otherListenToProcessExits: () => {
    describe('OTHER_LISTEN_TO_PROCESS_EXITS', () =>
      generalTests.boolean('OTHER_LISTEN_TO_PROCESS_EXITS', true));
  },
  otherNoLogo: () => {
    describe('OTHER_NO_LOGO', () =>
      generalTests.boolean('OTHER_NO_LOGO', true));
  },
  otherHardResetPage: () => {
    describe('OTHER_HARD_RESET_PAGE', () =>
      generalTests.boolean('OTHER_HARD_RESET_PAGE', true));
  },
  otherBrowserShellMode: () => {
    describe('OTHER_BROWSER_SHELL_MODE', () =>
      generalTests.boolean('OTHER_BROWSER_SHELL_MODE', true));
  },
  debugEnable: () => {
    describe('DEBUG_ENABLE', () => generalTests.boolean('DEBUG_ENABLE', true));
  },
  debugHeadless: () => {
    describe('DEBUG_HEADLESS', () =>
      generalTests.boolean('DEBUG_HEADLESS', true));
  },
  debugDevtools: () => {
    describe('DEBUG_DEVTOOLS', () =>
      generalTests.boolean('DEBUG_DEVTOOLS', true));
  },
  debugListenToConsole: () => {
    describe('DEBUG_LISTEN_TO_CONSOLE', () =>
      generalTests.boolean('DEBUG_LISTEN_TO_CONSOLE', true));
  },
  debugDumpio: () => {
    describe('DEBUG_DUMPIO', () => generalTests.boolean('DEBUG_DUMPIO', true));
  },
  debugSlowMo: () => {
    describe('DEBUG_SLOW_MO', () =>
      generalTests.nonNegativeNum('DEBUG_SLOW_MO', true));
  },
  debugDebuggingPort: () => {
    describe('DEBUG_DEBUGGING_PORT', () =>
      generalTests.nonNegativeNum('DEBUG_DEBUGGING_PORT', true));
  },
  webSocketEnable: () => {
    describe('WEB_SOCKET_ENABLE', () =>
      generalTests.boolean('WEB_SOCKET_ENABLE', true));
  },
  webSocketReconnect: () => {
    describe('WEB_SOCKET_RECONNECT', () =>
      generalTests.boolean('WEB_SOCKET_RECONNECT', true));
  },
  webSocketRejectUnauthorized: () => {
    describe('WEB_SOCKET_REJECT_UNAUTHORIZED', () =>
      generalTests.boolean('WEB_SOCKET_REJECT_UNAUTHORIZED', true));
  },
  webSocketPingTimeout: () => {
    describe('WEB_SOCKET_PING_TIMEOUT', () =>
      generalTests.nonNegativeNum('WEB_SOCKET_PING_TIMEOUT', true));
  },
  webSocketReconnectInterval: () => {
    describe('WEB_SOCKET_RECONNECT_INTERVAL', () =>
      generalTests.nonNegativeNum('WEB_SOCKET_RECONNECT_INTERVAL', true));
  },
  webSocketReconnectAttempts: () => {
    describe('WEB_SOCKET_RECONNECT_ATTEMPTS', () =>
      generalTests.nonNegativeNum('WEB_SOCKET_RECONNECT_ATTEMPTS', true));
  },
  webSocketMessageInterval: () => {
    describe('WEB_SOCKET_MESSAGE_INTERVAL', () =>
      generalTests.nonNegativeNum('WEB_SOCKET_MESSAGE_INTERVAL', true));
  },
  webSocketGatherAllOptions: () => {
    describe('WEB_SOCKET_GATHER_ALL_OPTIONS', () =>
      generalTests.boolean('WEB_SOCKET_GATHER_ALL_OPTIONS', true));
  },
  webSocketUrl: (correctValues, incorrectValues) => {
    describe('WEB_SOCKET_URL', () =>
      generalTests.startsWith(
        'WEB_SOCKET_URL',
        correctValues,
        incorrectValues,
        true
      ));
  },
  webSocketSecret: () => {
    describe('WEB_SOCKET_SECRET', () =>
      generalTests.nullishString('WEB_SOCKET_SECRET'));
  }
};

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
    'highcharts,highcharts-more, false, true, undefined, void 0,null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","void 0","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {}",highcharts-3d',
    ['highcharts', 'highcharts-more', 'highcharts-3d']
  );

  // HIGHCHARTS_MODULE_SCRIPTS
  envTests.highchartsModuleScripts(
    'data , false, true, undefined, void 0,null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","void 0","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {},data-tools, text',
    ['data', 'data-tools']
  );

  // HIGHCHARTS_INDICATOR_SCRIPTS
  envTests.highchartsIndicatorScripts(
    'text1, text2 ,indicators-all , false, true, undefined, void 0,null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","void 0","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {},',
    ['indicators-all']
  );

  // HIGHCHARTS_CUSTOM_SCRIPTS
  envTests.highchartsCustomScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js, undefined, NaN, null, false, true,https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js,  false, true, undefined, void 0,null,NaN,1,1.1,Symbol("symbol"),{},[],function () {},"false","true","undefined","void 0","null","NaN","1","1.1","Symbol("symbol")","{}","[]","function () {},',
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
