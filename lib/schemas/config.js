// Load .env into environment variables
require('dotenv').config();

// The active configuration
module.exports = {
  // Puppeteer config
  puppeteer: {
    // Args to send to puppeteer
    args: [
      // e.g.:
      // '--disable-web-security',
      // '--no-sandbox'
    ]
  },
  // Highcharts config
  highcharts: {
    // Highcharts version
    version: process.env.HIGHCHARTS_VERSION || 'latest',
    // CDN URL
    cdnURL: process.env.HIGHCHARTS_CDN || 'https://code.highcharts.com/',
    // Allow code execution?
    allowCodeExecution: process.env.HIGHCHARTS_ALLOW_CODE_EXECUTION || false,
    // Allow file resources?
    allowFileResources: true,
    // Used as the initial height when exporting
    defaultHeight: 1200,
    // Used when exporting if the incoming width is not set
    defaultWidth: 800,
    // Used when exporting if the incoming scale is not set
    defaultScale: 1,
    // Highcharts modules
    modules: process.env.HIGHCHARTS_MODULES
      ? process.env.HIGHCHARTS_MODULES.split(',')
      : [
          'accessibility',
          'annotations',
          'annotations-advanced',
          'arrow-symbols',
          'boost',
          'boost-canvas',
          'broken-axis',
          'bullet',
          'coloraxis',
          'current-date-indicator',
          'cylinder',
          'data',
          'datagrouping',
          'debugger',
          'dependency-wheel',
          'dotplot',
          'drag-panes',
          'draggable-points',
          'drilldown',
          'dumbbell',
          'export-data',
          'full-screen',
          'funnel',
          'funnel3d',
          'gantt',
          'grid-axis',
          'heatmap',
          'heikinashi',
          'histogram-bellcurve',
          'hollowcandlestick',
          'item-series',
          'lollipop',
          'map',
          'marker-clusters',
          'networkgraph',
          'no-data-to-display',
          'oldie-polyfills',
          'oldie',
          'organization',
          'overlapping-datalabels',
          'parallel-coordinates',
          'pareto',
          'pathfinder',
          'pattern-fill',
          'price-indicator',
          'pyramid3d',
          'sankey',
          'series-label',
          'solid-gauge',
          'sonification',
          'static-scale',
          'stock-tools',
          'stock',
          'streamgraph',
          'sunburst',
          'tilemap',
          'timeline',
          'treegrid',
          'treemap',
          'variable-pie',
          'variwide',
          'vector',
          'venn',
          'windbarb',
          'wordcloud',
          'xrange'
        ],
    // Additional scripts/optional dependencies (e.g. moments.js)
    scripts: []
  },
  // Server config
  server: {
    enable: process.env.HIGHCHARTS_SERVER_ENABLE || true,
    host: process.env.HIGHCHARTS_SERVER_HOST || '0.0.0.0',
    port: process.env.HIGHCHARTS_SERVER_PORT || 7801,
    ssl: {
      enable: process.env.HIGHCHARTS_SERVER_SSL_ENABLE || false,
      force: process.env.HIGHCHARTS_SERVER_SSL_FORCE || false,
      port: process.env.HIGHCHARTS_SERVER_SSL_PORT || 443,
      certPath: process.env.HIGHCHARTS_SSL_CERT_PATH || ''
    },
    rateLimiting: {
      enable: process.env.HIGHCHARTS_RATE_LIMIT_ENABLE || false,
      maxRequests: process.env.HIGHCHARTS_RATE_LIMIT_MAX || 10,
      skipKey: process.env.HIGHCHARTS_RATE_LIMIT_SKIP_KEY || '',
      skipToken: process.env.HIGHCHARTS_RATE_LIMIT_SKIP_TOKEN || ''
    }
  },
  // Pool config
  pool: {
    // How many workers should initially be available?
    initialWorkers: process.env.HIGHCHARTS_POOL_MIN_WORKERS || 8,
    // How many worker threads should we spawn?
    maxWorkers: process.env.HIGHCHARTS_POOL_MAX_WORKERS || 8,
    // How many exports can be done by a worker before it's nuked?
    workLimit: process.env.HIGHCHARTS_POOL_WORK_LIMIT || 60,
    // How deep can the processing queue be?
    queueSize: process.env.HIGHCHARTS_POOL_QUEUE_SIZE || 5,
    // How long should we wait before timing out (in seconds)
    timeoutThreshold: process.env.HIGHCHARTS_POOL_TIMEOUT || 8,
    // Should the Reaper be enabled to remove hanging processes?
    reaper: process.env.HIGHCHARTS_POOL_ENABLE_REAPER || true,
    // Should we listen to process exists?
    listenToProcessExits:
      process.env.HIGHCHARTS_POOL_LISTEN_TO_PROCESS_EXITS || true,
    // Should we enable benchmarking?
    benchmarking: process.env.HIGHCHARTS_POOL_BENCHMARKING || true
  },
  // Logging config
  logging: {
    level: process.env.HIGHCHARTS_LOG_LEVEL || 3,
    file: process.env.HIGHCHARTS_LOG_FILE || false,
    dest: process.env.HIGHCHARTS_LOG_DEST || false
  },
  // UI config @TODO: move the export.highcharts.com UI to here
  ui: {
    // Enable the exporting UI?
    enable: process.env.HIGHCHARTS_UI_ENABLE || false,
    // Route to attach the UI to
    route: process.env.HIGHCHARTS_UI_ROUTE || '/'
  },
  // Other config
  other: {
    nologo: process.env.HIGHCHARTS_NO_LOGO || false,
    tmpdir: process.env.HIGHCHARTS_TMPDIR || 'tmp/'
  }
};
