**Note:** If you use the public Export Server at [https://export.highcharts.com](https://export.highcharts.com) you should read our [Terms of use and Fair Usage Policy](https://www.highcharts.com/docs/export-module/privacy-disclaimer-export). Note that a valid Highcharts License is required to do exports.

# Highcharts Node.js Export Server

Convert Highcharts.JS charts into static image files.

## Upgrade Notes

In most cases, v4 should serve as a drop-in replacement for v2 and v3. However, due to changes in the browser backend, various tweaks related to process handling (e.g., worker counts, and so on) may now have different effects than before.

Significant changes have been made to the API for using the server as a Node.js module. While a compatibility layer has been created to address this, it is recommended to transition to the new API described below. It is worth noting that the compatibility layer may be deprecated at some point in the future.

An important note is that the Export Server now requires `Node.js v18.12.0` or a higher version.

Additionally, with the v3 release, we transitioned from HTTP to HTTPS for `export.highcharts.com`, so all requests sent to our public server now must use the HTTPS protocol.

## Changelog

**Version 4 introduces some breaking changes, mostly related to renamed options, environment variables, function names, and reordered function parameters. For further details, please refer to the changelog document provided below, under the Breaking Changes section.**

The full change log for all versions can be viewed [here](CHANGELOG.md).

# What & Why

This Node.js application/service converts [Highcharts.JS](http://highcharts.com) charts into static image files, supporting PNG, JPEG, SVG, and PDF output. The input can be either SVG or JSON-formatted chart options.

The application is versatile and can be used as a CLI (Command Line Interface), an HTTP server, or as a Node.js module.

## Use Cases

The primary use case for the Export Server is scenarios requiring headless conversion of charts. Common cases of using include automatic report generation, static caching, and incorporating charts into presentations or other documents.

In addition, the HTTP mode enables you to run your own Export Server for users, reducing reliance on the public `https://export.highcharts.com/` server, which has rate limitations.

The HTTP server can be run either independently, integrating with your other applications and services, or in a way that directs the export buttons on your charts to your customized server.

To implement the latter, include the following configuration in your chart options:

```
{
  exporting: {
    url: "<IP to the self-hosted Export Server>"
  }
}
```

For systems that generate automatic reports, using the Export Server as a Node.js module is a great fit - especially if your report generator is also written in Node.js. Check [here](https://github.com/highcharts/node-export-server#nodejs-module) for examples.

# Install

First, make sure you have Node.js installed. If not, visit [nodejs.org](https://nodejs.org/en/download/), download and install Node.js for your platform. For compatibility reasons, version `18.12.0` or higher is required.

Once Node.js is installed, proceed to install the Export Server by opening a terminal and typing:

```
npm install highcharts-export-server -g
```

or:

```
git clone https://github.com/highcharts/node-export-server
npm install
npm link
```

Depending on your Node.js installation method, you might need to create a symlink from `nodejs` to `node`. For example, on Linux:

```
ln -s `which nodejs` /usr/bin/node
```

# Running

To use the Export Server, simply run the following command with the correct arguments:

```
highcharts-export-server <arguments>
```

# Configuration

There are four main ways of loading configurations:

- By loading default options from the `./lib/schemas/config.js` file.
- By providing configurations via environment variables from the `.env` file.
- By loading options from a custom JSON file.
- By passing arguments through command line interface (CLI).

...or any combination of the four. In such cases, the options from the later step take precedence (config file -> envs -> custom JSON -> CLI arguments).

## Options Handling

A description of how options are handled and processed when using a specific export method.

### Server And CLI Usage

When starting a server or performing single or batch exports via the CLI, the server's global options are initialized from the `defaultConfig` object located in `./lib/schemas/config.js`, along with values from the `.env` file. These options can be extended with additional values provided through CLI arguments, which are internally set using the `setCliOptions()` function.

### Node.js Module Usage

For `Node.js Module` usage, the process differs slightly because API functions are called manually. By default, global options are initialized from the `defaultConfig` object and the `.env` file at startup, similar to the server and CLI scenarios. However, to include additional options, you need to explicitly call the `updateOptions()` function. If the `updateOptions()` function is not invoked, the system will rely on the default values previously set in the global options object.

### Options Management

All API functions accept specific sets of options that, if provided, extend the global options. When such options are not provided, the default global option values are used. Additionally, the `updateOptions()` function allows you to extend global options in advance, eliminating the need to provide options to each function individually. However, `singleExport()`, `batchExport()`, and `startExport()` must still be provided with export-related options.

This flexibility is particularly useful for deciding whether global options should remain static during subsequent exports or be updated dynamically. In either case, new options from various sources are merged into the configuration, and the resulting options are applied in API functions.

### Export Functions

The `singleExport()`, `batchExport()`, and `startExport()` functions must be provided with at least partial options that include one of the following options from the `export` section: `infile`, `instr`, `svg`, or `batch`. Any missing values in the provided options object will automatically default to those specified in the global options object. Unlike other API functions, options provided to the export functions will not be merged into the global options object, as these options represent a specific export process. To make the export options global, you can use the `updateOptions()` function before initiating the export.

### Options Setting

Essentially, all options can be configured through `.env`, the CLI, and prompts, with one exception: the `HIGHCHARTS_ADMIN_TOKEN`, which is only available as an environment variable.

## Default JSON Config

The JSON below represents the default configuration stored in the `./lib/schemas/config.js` file. If no `.env` file is found (more details on the file and environment variables below), these options will be used. The configuration is not recommended to be modified directly, as it can typically be managed through other sources.

The format, along with its default values, is as follows (using the recommended ordering of core and module scripts below).

_Available default JSON config:_

```
{
  "puppeteer": {
    "args": [/* See the `./lib/schemas/config.js` file */]
  },
  "highcharts": {
    "version": "latest",
    "cdnUrl": "https://code.highcharts.com",
    "forceFetch": false,
    "cachePath": ".cache"
    "coreScripts": [
      "highcharts",
      "highcharts-more",
      "highcharts-3d"
    ],
    "moduleScripts": [
      "stock",
      "map",
      "gantt",
      "exporting",
      "parallel-coordinates",
      "accessibility",
      "annotations-advanced",
      "boost-canvas",
      "boost",
      "data",
      "data-tools",
      "draggable-points",
      "static-scale",
      "broken-axis",
      "heatmap",
      "tilemap",
      "tiledwebmap",
      "timeline",
      "treemap",
      "treegraph",
      "item-series",
      "drilldown",
      "histogram-bellcurve",
      "bullet",
      "funnel",
      "funnel3d",
      "geoheatmap",
      "pyramid3d",
      "networkgraph",
      "overlapping-datalabels",
      "pareto",
      "pattern-fill",
      "pictorial",
      "price-indicator",
      "sankey",
      "arc-diagram",
      "dependency-wheel",
      "series-label",
      "series-on-point",
      "solid-gauge",
      "sonification",
      "stock-tools",
      "streamgraph",
      "sunburst",
      "variable-pie",
      "variwide",
      "vector",
      "venn",
      "windbarb",
      "wordcloud",
      "xrange",
      "no-data-to-display",
      "drag-panes",
      "debugger",
      "dumbbell",
      "lollipop",
      "cylinder",
      "organization",
      "dotplot",
      "marker-clusters",
      "hollowcandlestick",
      "heikinashi",
      "flowmap",
      "export-data",
      "navigator",
      "textpath"
    ],
    "indicatorScripts": [
      "indicators-all"
    ],
    "customScripts": [
      "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js"
    ]
  },
  "export": {
    "infile": null,
    "instr": null,
    "options": null,
    "svg": null,
    "batch": null,
    "outfile": null,
    "type": "png",
    "constr": "chart",
    "b64": false,
    "noDownload": false,
    "height": null,
    "width": null,
    "scale": null,
    "globalOptions": null,
    "themeOptions": null,
    "rasterizationTimeout": 1500
  },
  "customLogic": {
    "allowCodeExecution": false,
    "allowFileResources": false,
    "customCode": null,
    "callback": null,
    "resources": null,
    "loadConfig": null,
    "createConfig": null
  },
  "server": {
    "enable": false,
    "host": "0.0.0.0",
    "port": 7801,
    "uploadLimit": 3,
    "benchmarking": false,
    "proxy": {
      "host": null,
      "port": null,
      "timeout": 5000
    },
    "rateLimiting": {
      "enable": false,
      "maxRequests": 10,
      "window": 1,
      "delay": 0,
      "trustProxy": false,
      "skipKey": null,
      "skipToken": null
    },
    "ssl": {
      "enable": false,
      "force": false,
      "port": 443,
      "certPath": null
    }
  },
  "pool": {
    "minWorkers": 4,
    "maxWorkers": 8,
    "workLimit": 40,
    "acquireTimeout": 5000,
    "createTimeout": 5000,
    "destroyTimeout": 5000,
    "idleTimeout": 30000,
    "createRetryInterval": 200,
    "reaperInterval": 1000,
    "benchmarking": false
  },
  "logging": {
    "level": 4,
    "file": "highcharts-export-server.log",
    "dest": "log",
    "toConsole": true,
    "toFile": true
  },
  "ui": {
    "enable": false,
    "route": "/"
  },
  "other": {
    "nodeEnv": "production",
    "listenToProcessExits": true,
    "noLogo": false,
    "hardResetPage": false,
    "browserShellMode": true
  },
  "debug": {
    "enable": false,
    "headless": false,
    "devtools": false,
    "listenToConsole": false,
    "dumpio": false,
    "slowMo": 0,
    "debuggingPort": 9222
  }
}
```

## Environment Variables

These variables are set in your environment and take precedence over options from the `./lib/schemas/config.js` file. They can be set in the `.env` file (refer to the `.env.sample` file). If you prefer setting these variables through the `package.json`, use `export` command on Linux/Mac OS X and `set` command on Windows.

_Available environment variables:_

### Puppeteer Config

- `PUPPETEER_ARGS`: A stringified version of additional Puppeteer arguments sent during browser initialization. The string can be enclosed in _[_ and _]_, and the arguments must be separated by the _;_ character (defaults to ``).

### Highcharts Config

- `HIGHCHARTS_VERSION`: Highcharts version to use (defaults to `latest`).
- `HIGHCHARTS_CDN_URL`: Highcharts CDN URL of scripts to be used (defaults to `https://code.highcharts.com`).
- `HIGHCHARTS_FORCE_FETCH`: The flag that determines whether to refetch all scripts after each server rerun (defaults to `false`).
- `HIGHCHARTS_CACHE_PATH`: A directory path where the fetched Highcharts scripts should be placed (defaults to `.cache`). Since v4.0.3 can be either absolute or relative path.
- `HIGHCHARTS_ADMIN_TOKEN`: An authentication token that is required to switch the Highcharts version on the server at runtime (defaults to ``).
- `HIGHCHARTS_CORE_SCRIPTS`: Highcharts core scripts to fetch (defaults to ``).
- `HIGHCHARTS_MODULE_SCRIPTS`: Highcharts module scripts to fetch (defaults to ``).
- `HIGHCHARTS_INDICATOR_SCRIPTS`: Highcharts indicator scripts to fetch (defaults to ``).
- `HIGHCHARTS_CUSTOM_SCRIPTS`: Additional custom scripts or dependencies to fetch (defaults to ``).

### Export Config

- `EXPORT_INFILE`: The input file should include a name and a type (**.json** or **.svg**) and must contain a correctly formatted JSON or SVG (defaults to ``).
- `EXPORT_INSTR`: An input in a form of a stringified JSON.
- `EXPORT_OPTIONS`: An alias for the `instr` option (defaults to ``).
- `EXPORT_SVG`: A string containing SVG representation to render as a chart (defaults to ``).
- `EXPORT_BATCH`: Initiates a batch job with a string containing input/output pairs: **"in=out;in=out;.."** (defaults to ``).
- `EXPORT_OUTFILE`: The output filename, accompanied by a type (**jpeg**, **png**, **pdf**, or **svg**). Ignores the `type` option (defaults to ``).
- `EXPORT_TYPE`: The format of the file to export to. Can be **jpeg**, **png**, **pdf**, or **svg** (defaults to `png`).
- `EXPORT_CONSTR`: The constructor to use. Can be **chart**, **stockChart**, **mapChart**, or **ganttChart** (defaults to `chart`).
- `EXPORT_B64`: Boolean flag, set to **true** to receive the chart in the _base64_ format instead of the _binary_ (defaults to `false`).
- `EXPORT_NO_DOWNLOAD`: Boolean flag, set to **true** to exclude attachment headers from the response (defaults to `false`).
- `EXPORT_HEIGHT`: The height of the exported chart. Overrides the option in the chart settings (defaults to ``).
- `EXPORT_WIDTH`: The width of the exported chart. Overrides the option in the chart settings (defaults to ``).
- `EXPORT_SCALE`: The scale of the exported chart. Ranges between **0.1** and **5.0** (defaults to ``).
- `EXPORT_DEFAULT_HEIGHT`: The default fallback height for exported charts if not set explicitly (defaults to `400`).
- `EXPORT_DEFAULT_WIDTH`: The default fallback width for exported charts if not set explicitly (defaults to `600`).
- `EXPORT_DEFAULT_SCALE`: The default fallback scale for exported charts if not set explicitly. Ranges between **0.1** and **5.0** (defaults to `1`).
- `EXPORT_GLOBAL_OPTIONS`: Either a stringified JSON or a filename containing global options to be passed into the `Highcharts.setOptions()` (defaults to ``).
- `EXPORT_THEME_OPTIONS`: Either a stringified JSON or a filename containing theme options to be passed into the `Highcharts.setOptions()` (defaults to ``).
- `EXPORT_RASTERIZATION_TIMEOUT`: The specified duration, in milliseconds, to wait for rendering a webpage (defaults to `1500`).

### Custom Logic Config

- `CUSTOM_LOGIC_ALLOW_CODE_EXECUTION`: Controls whether the execution of arbitrary code is allowed during the exporting process (defaults to `false`).
- `CUSTOM_LOGIC_ALLOW_FILE_RESOURCES`: Controls the ability to inject resources from the filesystem. This setting has no effect when running as a server (defaults to `false`).
- `CUSTOM_LOGIC_CUSTOM_CODE`: Custom code to execute before chart initialization. It can be a function, code wrapped within a function, or a filename with the _.js_ extension (defaults to ``).
- `CUSTOM_LOGIC_CALLBACK`: JavaScript code to run during construction. It can be a stringified function or a filename with the _.js_ extension that contains a correct Highcharts callback (defaults to ``).
- `CUSTOM_LOGIC_RESOURCES`: Additional resources in the form of a stringified JSON. It may contain `files` (array of JS filenames), `js` (stringified JS), and `css` (stringified CSS) sections (defaults to ``).
- `CUSTOM_LOGIC_LOAD_CONFIG`: A file containing a pre-defined configuration to use (defaults to ``).
- `CUSTOM_LOGIC_CREATE_CONFIG`: Enables setting options through a prompt and saving them in a provided config file (defaults to ``).

### Server Config

- `SERVER_ENABLE`: If set to **true**, the server starts on 0.0.0.0 (defaults to `false`).
- `SERVER_HOST`: The hostname of the server. Additionally, it starts a server listening on the provided hostname (defaults to `0.0.0.0`).
- `SERVER_PORT`: The port to be used for the server when enabled (defaults to `7801`).
- `SERVER_UPLOAD_LIMIT`: The maximum request body size in MB (defaults to `3`).
- `SERVER_BENCHMARKING`: Indicates whether to display a message with the duration, in milliseconds, of specific actions that occur on the server while serving a request (defaults to `false`).

### Server Proxy Config

- `SERVER_PROXY_HOST`: The host of the proxy server to use, if it exists (defaults to ``).
- `SERVER_PROXY_PORT`: The port of the proxy server to use, if it exists (defaults to ``).
- `SERVER_PROXY_TIMEOUT`: The timeout, in milliseconds, for the proxy server to use, if it exists (defaults to `5000`).

### Server Rate Limiting Config

- `SERVER_RATE_LIMITING_ENABLE`: Enables rate limiting for the server (defaults to `false`).
- `SERVER_RATE_LIMITING_MAX_REQUESTS`: The maximum number of requests allowed in one minute (defaults to `10`).
- `SERVER_RATE_LIMITING_WINDOW`: The time window, in minutes, for the rate limiting (defaults to `1`).
- `SERVER_RATE_LIMITING_DELAY`: The delay duration for each successive request before reaching the maximum limit (defaults to `0`).
- `SERVER_RATE_LIMITING_TRUST_PROXY`: Set this to **true** if the server is behind a load balancer (defaults to `false`).
- `SERVER_RATE_LIMITING_SKIP_KEY`: Allows bypassing the rate limiter and should be provided with the `skipToken` argument (defaults to ``).
- `SERVER_RATE_LIMITING_SKIP_TOKEN`: Allows bypassing the rate limiter and should be provided with the `skipKey` argument (defaults to ``).

### Server SSL Config

- `SERVER_SSL_ENABLE`: Enables or disables the SSL protocol (defaults to `false`).
- `SERVER_SSL_FORCE`: If set to **true**, the server is forced to serve only over HTTPS (defaults to `false`).
- `SERVER_SSL_PORT`: The port on which to run the SSL server (defaults to `443`).
- `SERVER_SSL_CERT_PATH`: The path to the SSL certificate/key file (defaults to ``).

### Pool Config

- `POOL_MIN_WORKERS`: The number of minimum and initial pool workers to spawn (defaults to `4`).
- `POOL_MAX_WORKERS`: The number of maximum pool workers to spawn (defaults to `8`).
- `POOL_WORK_LIMIT`: The number of work pieces that can be performed before restarting the worker process (defaults to `40`).
- `POOL_ACQUIRE_TIMEOUT`: The duration, in milliseconds, to wait for acquiring a resource (defaults to `5000`).
- `POOL_CREATE_TIMEOUT`: The duration, in milliseconds, to wait for creating a resource (defaults to `5000`).
- `POOL_DESTROY_TIMEOUT`: The duration, in milliseconds, to wait for destroying a resource (defaults to `5000`).
- `POOL_IDLE_TIMEOUT`: The duration, in milliseconds, after which an idle resource is destroyed (defaults to `30000`).
- `POOL_CREATE_RETRY_INTERVAL`: The duration, in milliseconds, to wait before retrying the create process in case of a failure (defaults to `200`).
- `POOL_REAPER_INTERVAL`: The duration, in milliseconds, after which the check for idle resources to destroy is triggered (defaults to `1000`).
- `POOL_BENCHMARKING`: Indicates whether to show statistics for the pool of resources or not (defaults to `false`).

### Logging Config

- `LOGGING_LEVEL`: The logging level to be used. Can be **0** - silent, **1** - error, **2** - warning, **3** - notice, **4** - verbose or **5** - benchmark (defaults to `4`).
- `LOGGING_FILE`: The name of a log file. The `logToFile` and `logDest` options also need to be set to enable file logging (defaults to `highcharts-export-server.log`).
- `LOGGING_DEST`: The path to store log files. The `logToFile` option also needs to be set to enable file logging (defaults to `log`).
- `LOGGING_TO_CONSOLE`: Enables or disables showing logs in the console (defaults to `true`).
- `LOGGING_TO_FILE`: Enables or disables creation of the log directory and saving the log into a .log file (defaults to `true`).

### UI Config

- `UI_ENABLE`: Enables or disables the user interface (UI) for the Export Server (defaults to `false`).
- `UI_ROUTE`: The endpoint route to which the user interface (UI) should be attached (defaults to `/`).

### Other Config

- `OTHER_NODE_ENV`: The type of Node.js environment. The value controls whether to include the error's stack in a response or not. Can be development or production (defaults to `production`).
- `OTHER_LISTEN_TO_PROCESS_EXITS`: Decides whether or not to attach _process.exit_ handlers (defaults to `true`).
- `OTHER_NO_LOGO`: Skip printing the logo on a startup. Will be replaced by a simple text (defaults to `false`).
- `OTHER_HARD_RESET_PAGE`: Determines whether the page's content should be reset from scratch, including Highcharts scripts (defaults to `false`).
- `OTHER_BROWSER_SHELL_MODE`: Decides whether to enable older but much more performant _shell_ mode for the browser (defaults to `true`).

### Debugging Config

- `DEBUG_ENABLE`: Enables or disables debug mode for the underlying browser (defaults to `false`).
- `DEBUG_HEADLESS`: Controls the mode in which the browser is launched when in the debug mode (defaults to `false`).
- `DEBUG_DEVTOOLS`: Decides whether to enable DevTools when the browser is in a headful state (defaults to `false`).
- `DEBUG_LISTEN_TO_CONSOLE`: Decides whether to enable a listener for console messages sent from the browser (defaults to `false`).
- `DEBUG_DUMPIO`: Redirects browser process stdout and stderr to process.stdout and process.stderr (defaults to `false`).
- `DEBUG_SLOW_MO`: Slows down Puppeteer operations by the specified number of milliseconds (defaults to `0`).
- `DEBUG_DEBUGGING_PORT`: Specifies the debugging port (defaults to `9222`).

## Custom JSON Config

To load an additional JSON configuration file, use the `--loadConfig <filepath>` option. This JSON file can either be manually created or generated through a prompt triggered by the `--createConfig <filepath>` option. The `<filepath>` value does not need a _.json_ extension, but the file's content must be valid JSON when using the `--loadConfig` option.

## Command Line Arguments

To supply command line arguments, add them as flags when running the application:
`highcharts-export-server --flag1 value --flag2 value ...`

For readability reasons, many options passed as CLI arguments have slightly different names, which combine the option and the section it comes from. For example, to set `server.enable`, use `--enableServer`. This way, it is clear which option is being set. The full listing of CLI options can be seen by typing the `highcharts-export-server --help` command in the console.

_Available CLI arguments:_

### Puppeteer Config

- `--puppeteerArgs`: A stringified version of additional Puppeteer arguments sent during browser initialization. The string can be enclosed in _[_ and _]_, and the arguments must be separated by the _;_ character (defaults to [Default JSON Config](#default-json-config)).

### Highcharts Config

- `--version`: Highcharts version to use (defaults to `latest`).
- `--cdnUrl`: Highcharts CDN URL of scripts to be used (defaults to `https://code.highcharts.com`).
- `--forceFetch`: The flag that determines whether to refetch all scripts after each server rerun (defaults to `false`).
- `--cachePath`: A directory path where the fetched Highcharts scripts should be placed (defaults to `.cache`). Since v4.0.3 can be either absolute or relative path.
- `--coreScripts`: Highcharts core scripts to fetch (defaults to [Default JSON Config](#default-json-config)).
- `--moduleScripts`: Highcharts module scripts to fetch (defaults to [Default JSON Config](#default-json-config)).
- `--indicatorScripts`: Highcharts indicator scripts to fetch (defaults to [Default JSON Config](#default-json-config)).
- `--customScripts`: Additional custom scripts or dependencies to fetch (defaults to [Default JSON Config](#default-json-config)).

### Export Config

- `--infile`: The input file should include a name and a type (**.json** or **.svg**) and must contain a correctly formatted JSON or SVG (defaults to `null`).
- `--instr`: An input in a form of a stringified JSON.
- `--options`: An alias for the `instr` option (defaults to `null`).
- `--svg`: A string containing SVG representation to render as a chart (defaults to `null`).
- `--batch`: Initiates a batch job with a string containing input/output pairs: **"in=out;in=out;.."** (defaults to `null`).
- `--outfile`: The output filename, accompanied by a type (**jpeg**, **png**, **pdf**, or **svg**). Ignores the `type` option (defaults to `null`).
- `--type`: The format of the file to export to. Can be **jpeg**, **png**, **pdf**, or **svg** (defaults to `png`).
- `--constr`: The constructor to use. Can be **chart**, **stockChart**, **mapChart**, or **ganttChart** (defaults to `chart`).
- `--b64`: Boolean flag, set to **true** to receive the chart in the _base64_ format instead of the _binary_ (defaults to `false`).
- `--noDownload`: Boolean flag, set to **true** to exclude attachment headers from the response (defaults to `false`).
- `--height`: The height of the exported chart. Overrides the option in the chart settings (defaults to `null`).
- `--width`: The width of the exported chart. Overrides the option in the chart settings (defaults to `null`).
- `--scale`: The scale of the exported chart. Ranges between **0.1** and **5.0** (defaults to `null`).
- `--defaultHeight`: The default fallback height for exported charts if not set explicitly (defaults to `400`).
- `--defaultWidth`: The default fallback width for exported charts if not set explicitly (defaults to `600`).
- `--defaultScale`: The default fallback scale for exported charts if not set explicitly. Ranges between **0.1** and **5.0** (defaults to `1`).
- `--globalOptions`: Either a stringified JSON or a filename containing global options to be passed into the `Highcharts.setOptions()` (defaults to `null`).
- `--themeOptions`: Either a stringified JSON or a filename containing theme options to be passed into the `Highcharts.setOptions()` (defaults to `null`).
- `--rasterizationTimeout`: The specified duration, in milliseconds, to wait for rendering a webpage (defaults to `1500`).

### Custom Logic Config

- `--allowCodeExecution`: Controls whether the execution of arbitrary code is allowed during the exporting process (defaults to `false`).
- `--allowFileResources`: Controls the ability to inject resources from the filesystem. This setting has no effect when running as a server (defaults to `false`).
- `--customCode`: Custom code to execute before chart initialization. It can be a function, code wrapped within a function, or a filename with the _.js_ extension (defaults to `null`).
- `--callback`: JavaScript code to run during construction. It can be a stringified function or a filename with the _.js_ extension that contains a correct Highcharts callback (defaults to `null`).
- `--resources`: Additional resources in the form of a stringified JSON. It may contain `files` (array of JS filenames), `js` (stringified JS), and `css` (stringified CSS) sections (defaults to `null`).
- `--loadConfig`: A file containing a pre-defined configuration to use (defaults to `null`).
- `--createConfig`: Enables setting options through a prompt and saving them in a provided config file (defaults to `null`).

### Server Config

- `--enableServer`: If set to **true**, the server starts on 0.0.0.0 (defaults to `false`).
- `--host`: The hostname of the server. Additionally, it starts a server listening on the provided hostname (defaults to `0.0.0.0`).
- `--port`: The port to be used for the server when enabled (defaults to `7801`).
- `--uploadLimit`: The maximum request body size in MB (defaults to `3`).
- `--serverBenchmarking`: Indicates whether to display a message with the duration, in milliseconds, of specific actions that occur on the server while serving a request (defaults to `false`).

### Server Proxy Config

- `--proxyHost`: The host of the proxy server to use, if it exists (defaults to `null`).
- `--proxyPort`: The port of the proxy server to use, if it exists (defaults to `null`).
- `--proxyTimeout`: The timeout, in milliseconds, for the proxy server to use, if it exists (defaults to `5000`).

### Server Rate Limiting Config

- `--enableRateLimiting`: Enables rate limiting for the server (defaults to `false`).
- `--maxRequests`: The maximum number of requests allowed in one minute (defaults to `10`).
- `--window`: The time window, in minutes, for the rate limiting (defaults to `1`).
- `--delay`: The delay duration for each successive request before reaching the maximum limit (defaults to `0`).
- `--trustProxy`: Set this to **true** if the server is behind a load balancer (defaults to `false`).
- `--skipKey`: Allows bypassing the rate limiter and should be provided with the `skipToken` argument (defaults to `null`).
- `--skipToken`: Allows bypassing the rate limiter and should be provided with the `skipKey` argument (defaults to `null`).

### Server SSL Config

- `--enableSsl`: Enables or disables the SSL protocol (defaults to `false`).
- `--sslForce`: If set to **true**, the server is forced to serve only over HTTPS (defaults to `false`).
- `--sslPort`: The port on which to run the SSL server (defaults to `443`).
- `--sslCertPath`: The path to the SSL certificate/key file (defaults to `null`).

### Pool Config

- `--minWorkers`: The number of minimum and initial pool workers to spawn (defaults to `4`).
- `--maxWorkers`: The number of maximum pool workers to spawn (defaults to `8`).
- `--workLimit`: The number of work pieces that can be performed before restarting the worker process (defaults to `40`).
- `--acquireTimeout`: The duration, in milliseconds, to wait for acquiring a resource (defaults to `5000`).
- `--createTimeout`: The duration, in milliseconds, to wait for creating a resource (defaults to `5000`).
- `--destroyTimeout`: The duration, in milliseconds, to wait for destroying a resource (defaults to `5000`).
- `--idleTimeout`: The duration, in milliseconds, after which an idle resource is destroyed (defaults to `30000`).
- `--createRetryInterval`: The duration, in milliseconds, to wait before retrying the create process in case of a failure (defaults to `200`).
- `--reaperInterval`: The duration, in milliseconds, after which the check for idle resources to destroy is triggered (defaults to `1000`).
- `--poolBenchmarking`: Indicates whether to show statistics for the pool of resources or not (defaults to `false`).

### Logging Config

- `--logLevel`: The logging level to be used. Can be **0** - silent, **1** - error, **2** - warning, **3** - notice, **4** - verbose or **5** - benchmark (defaults to `4`).
- `--logFile`: The name of a log file. The `logToFile` and `logDest` options also need to be set to enable file logging (defaults to `highcharts-export-server.log`).
- `--logDest`: The path to store log files. The `logToFile` option also needs to be set to enable file logging (defaults to `log`).
- `--logToConsole`: Enables or disables showing logs in the console (defaults to `true`).
- `--logToFile`: Enables or disables creation of the log directory and saving the log into a .log file (defaults to `true`).

### UI Config

- `--enableUi`: Enables or disables the user interface (UI) for the Export Server (defaults to `false`).
- `--uiRoute`: The endpoint route to which the user interface (UI) should be attached (defaults to `/`).

### Other Config

- `--nodeEnv`: The type of Node.js environment. The value controls whether to include the error's stack in a response or not. Can be development or production (defaults to `production`).
- `--listenToProcessExits`: Decides whether or not to attach _process.exit_ handlers (defaults to `true`).
- `--noLogo`: Skip printing the logo on a startup. Will be replaced by a simple text (defaults to `false`).
- `--hardResetPage`: Determines whether the page's content should be reset from scratch, including Highcharts scripts (defaults to `false`).
- `--browserShellMode`: Decides whether to enable older but much more performant _shell_ mode for the browser (defaults to `true`).

### Debugging Config

- `--enableDebug`: Enables or disables debug mode for the underlying browser (defaults to `false`).
- `--headless`: Controls the mode in which the browser is launched when in the debug mode (defaults to `false`).
- `--devtools`: Decides whether to enable DevTools when the browser is in a headful state (defaults to `false`).
- `--listenToConsole`: Decides whether to enable a listener for console messages sent from the browser (defaults to `false`).
- `--dumpio`: Redirects browser process stdout and stderr to process.stdout and process.stderr (defaults to `false`).
- `--slowMo`: Slows down Puppeteer operations by the specified number of milliseconds (defaults to `0`).
- `--debuggingPort`: Specifies the debugging port (defaults to `9222`).

# HTTP Server

Apart from using as a CLI tool, which allows you to run one command at a time, it is also possible to configure the server to accept POST requests. The simplest way to enable the server is to run the command below:

`highcharts-export-server --enableServer true`

## Server Test

To test if the server is running correctly, you can send a simple POST request, e.g. by using Curl:

```
curl -H "Content-Type: application/json" -X POST -d '{"options":{"title": {"text": "Chart"}, "xAxis": {"categories": ["Jan", "Feb", "Mar"]}, "series": [{"data": [29.9, 71.5, 106.4]}]}}' 127.0.0.1:7801 -o chart.png
```

The above should result in a chart being generated and saved in a file named `chart.png`.

## SSL

To enable SSL support, add `--certPath <path to key/crt>` when running the server. Note that the certificate files needs to be named as such:

- `server.crt`
- `server.key`

## HTTP Server POST Arguments

The server accepts the following arguments in a POST request body.

_Available request arguments:_

- `instr`: Chart options in the form of JSON or stringified JSON.
- `options`: An alias for the `instr` option.
- `svg`: A string containing SVG representation to render as a chart.
- `outfile`: The output filename, accompanied by a type (**jpeg**, **png**, **pdf**, or **svg**). Ignores the `type` option.
- `type`: The format of an exported chart (can be **png**, **jpeg**, **pdf** or **svg**). Mimetypes can also be used.
- `constr`: The constructor to use (can be **chart**, **stockChart**, **mapChart** or **ganttChart**).
- `height`: The height of the exported chart.
- `width`: The width of the exported chart.
- `scale`: The scale factor of the exported chart. Use it to improve resolution in PNG and JPEG, for example setting scale to 2 on a 600px chart will result in a 1200px output.
- `globalOptions`: Either a JSON or a stringified JSON with global options to be passed into `Highcharts.setOptions()`.
- `themeOptions`: Either a JSON or a stringified JSON with theme options to be passed into `Highcharts.setOptions()`.
- `resources`: Additional resources in the form of a JSON or a stringified JSON. It may contain `files` (array of JS filenames), `js` (stringified JS), and `css` (stringified CSS) sections.
- `callback`: Stringified JavaScript function to execute in the Highcharts constructor.
- `customCode`: Custom code to be executed before the chart initialization. This can be a function, code wrapped within a function, or a filename with the _.js_ extension. Both `allowFileResources` and `allowCodeExecution` must be set to **true** for the option to be considered.
- `b64`: Boolean flag, set to **true** to receive the chart in the _base64_ format instead of the _binary_.
- `noDownload`: Boolean flag, set to **true** to exclude attachment headers from the response.

The server responds to `application/json`, `multipart/form-data`, and URL encoded requests.

CORS is enabled for the server.

It is recommended to run the server using [pm2](https://www.npmjs.com/package/pm2) unless running in a managed environment/container. Please refer to the pm2 documentation for details on how to set this up.

## Available Endpoints

- POST

  - `/`: An endpoint for exporting charts.
  - `/:filename` - An endpoint for exporting charts with a specified filename parameter to save the chart to. The file will be downloaded with the _{filename}.{type}_ name (the `noDownload` must be set to **false**).
  - `/version_change/:newVersion`: An authenticated endpoint allowing the modification of the Highcharts version on the server through the use of a token.

- GET

  - `/`: An endpoint to perform exports through the user interface the server allows it.
  - `/health`: An endpoint for outputting basic statistics for the server.

## Switching Highcharts Version At Runtime

If the `HIGHCHARTS_ADMIN_TOKEN` is set, you can use the `POST /version_change/:newVersion` route to switch the Highcharts version on the server at runtime, ie. without restarting or redeploying the application.

A sample request to change the version to 10.3.3 is as follows:

```
curl -H 'hc-auth: <YOUR AUTH TOKEN>' -X POST <SERVER URL>/change_hc_version/10.3.3
```

e.g.

```
curl -H 'hc-auth: 12345' -X POST 127.0.0.1:7801/change_hc_version/10.3.3
```

This is useful to e.g. upgrade to the latest HC version without downtime.

# Node.js Module

Finally, the Export Server can also be used as a Node.js module to simplify integrations:

```
// Import the Highcharts Export Server module
const exporter = require('highcharts-export-server');

// Options correspond to the available CLI/HTTP arguments described above
const customOptions = {
  export: {
    type: 'png',
    options: {
      title: {
        text: 'My Chart'
      },
      xAxis: {
        categories: ["Jan", "Feb", "Mar", "Apr"]
      },
      series: [
        {
          type: 'line',
          data: [1, 3, 2, 4]
        },
        {
          type: 'line',
          data: [5, 3, 4, 2]
        }
      ]
    }
  }
};

// Logic must be triggered in an asynchronous function
(async () => {
  // Must initialize exporting before being able to export charts
  await exporter.initExport();

  // Perform an export
  await exporter.startExport(options, async (error, data) => {
    // The export result is now in the `data` (it will be Base64 encoded)
    console.log(data.result);

    // Kill the pool when we are done with it
    await exporter.killPool();
  });
})();
```

In order for exporting to work as intended, the `initExport()` function must be called before running any export-related functions (`singleExport()`, `batchExport()`, or `startExport()`). This initializes all required mechanisms, such as script fetching, cache setting, resource pooling, and browser startup.

## CommonJS Support

This package supports both CommonJS and ES modules.

## Node.js API Reference

**highcharts-export-server module**

- `async function startServer(serverOptions)`: Starts an HTTP and/or HTTPS server based on the provided configuration. The `serverOptions` object contains server-related properties (refer to the `server` section in the `./lib/schemas/config.js` file for details).

  - `@param {Object} serverOptions` - The configuration object containing `server` options. This object may include a partial or complete set of the `server` options. If the options are partial, missing values will default to the current global configuration.

  - `@returns {Promise<void>}` A Promise that resolves when the server is either not enabled or no valid Express app is found, signaling the end of the function's execution.

  - `@throws {ExportError}` Throws an `ExportError` if the server cannot be configured and started.

- `function closeServers()`: Closes all servers associated with Express app instance.

- `function getServers()`: Get all servers associated with Express app instance.

  - `@returns {Array.<Object>}` Servers associated with Express app instance.

- `function getExpress()`: Get the Express instance.

  - `@returns {Express}` The Express instance.

- `function getApp()`: Get the Express app instance.

  - `@returns {Express}` The Express app instance.

- `function enableRateLimiting(rateLimitingOptions)`: Enable rate limiting for the server.

  - `@param {Object} rateLimitingOptions` - The configuration object containing `rateLimiting` options. This object may include a partial or complete set of the `rateLimiting` options. If the options are partial, missing values will default to the current global configuration.

- `function use(path, ...middlewares)`: Apply middleware(s) to a specific path.

  - `@param {string} path` - The path to which the middleware(s) should be applied.
  - `@param {...Function} middlewares` - The middleware function(s) to be applied.

- `function get(path, ...middlewares)`: Set up a route with GET method and apply middleware(s).

  - `@param {string} path` - The path to which the middleware(s) should be applied.
  - `@param {...Function} middlewares` - The middleware function(s) to be applied.

- `function post(path, ...middlewares)`: Set up a route with POST method and apply middleware(s).

  - `@param {string} path` - The path to which the middleware(s) should be applied.
  - `@param {...Function} middlewares` - The middleware function(s) to be applied.

- `function getOptions(getCopy = true)`: Retrieves a copy of the global options object or a reference to the global options object, based on the `getCopy` flag.

  - `@param {boolean} [getCopy=true]` - Specifies whether to return a copied object of the global options (`true`) or a reference to the global options object (`false`). The default value is `false`.

  - `@returns {Object}` A copy of the global options object, or a reference to the global options object.

- `function updateOptions(newOptions, getCopy = false)`: Updates a copy of the global options object or a reference to the global options object, based on the `getCopy` flag.

  - `@param {Object} newOptions` - An object containing the new options to be merged into the global options.
  - `@param {boolean} [getCopy=false]` - Determines whether to merge the new options into a copy of the global options object (`true`) or directly into the global options object (`false`). The default value is `false`.

  - `@returns {Object}` The updated options object, either the modified global options or a modified copy, based on the value of `getCopy`.

- `function mapToNewOptions(oldOptions)`: Maps old-structured configuration options (PhantomJS) to a new format (Puppeteer). This function converts flat, old-structured options into a new, nested configuration format based on a predefined mapping (`nestedProps`). The new format is used for Puppeteer, while the old format was used for PhantomJS.

  - `@param {Object} oldOptions` - The old, flat configuration options to be converted.

  - `@returns {Object}` A new object containing options structured according to the mapping defined in `nestedProps` or an empty object if the provided `oldOptions` is not a correct object.

- `async function initExport(initOptions = {})`: Initializes the export process. Tasks such as configuring logging, checking the cache and sources, and initializing the resource pool occur during this stage.

  This function must be called before attempting to export charts or set up a server.

  - `@param {Object} [initOptions={}]` - The `initOptions` object, which may be a partial or complete set of options. If the options are partial, missing values will default to the current global configuration. The default value is an empty object.

- `async function singleExport(options)`: Starts a single export process based on the specified options and saves the resulting image to the provided output file.

  - `@param {Object} options` - The `options` object, which should include settings from the `export` and `customLogic` sections. It can be a partial or complete set of options from these sections. The object must contain at least one of the following `export` properties: `infile`, `instr`, `options`, or `svg` to generate a valid image.

  - `@returns {Promise<void>}` A Promise that resolves once the single export process is completed.

  - `@throws {ExportError}` Throws an `ExportError` if an error occurs during the single export process.

- `async function batchExport(options)`: Starts a batch export process for multiple charts based on information provided in the `batch` option. The `batch` is a string in the following format: "infile1.json=outfile1.png;infile2.json=outfile2.png;...". Results are saved to the specified output files.

  - `@param {Object} options` - The `options` object, which should include settings from the `export` and `customLogic` sections. It can be a partial or complete set of options from these sections. It must contain the `batch` option from the `export` section to generate valid images.

  - `@returns {Promise<void>}` A Promise that resolves once the batch export processes are completed.

  - `@throws {ExportError}` Throws an `ExportError` if an error occurs during any of the batch export process.

- `async function startExport(exportingOptions, endCallback)`: Starts an export process. The `exportingOptions` parameter is an object that should include settings from the `export` and `customLogic` sections. It can be a partial or complete set of options from these sections. If partial options are provided, missing values will be merged with the current global options.

  The `endCallback` function is invoked upon the completion of the export, either successfully or with an error. The `error` object is provided as the first argument, and the `data` object is the second, containing the Base64 representation of the chart in the `result` property and the complete set of options in the `options` property.

  - `@param {Object} exportingOptions` - The `exportingOptions` object, which should include settings from the `export` and `customLogic` sections. It can be a partial or complete set of options from these sections. If the provided options are partial, missing values will be merged with the current global options.
  - `@param {Function} endCallback` - The callback function to be invoked upon finalizing the export process or upon encountering an error. The first argument is the `error` object, and the second argument is the `data` object, which includes the Base64 representation of the chart in the `result` property and the full set of options in the `options` property.

  - `@returns {Promise<void>}` This function does not return a value directly. Instead, it communicates results via the `endCallback`.

  - `@throws {ExportError}` Throws an `ExportError` if there is a problem with processing input of any type. The error is passed into the `endCallback` function and processed there.

- `async function killPool()`: Terminates all workers in the pool, destroys the pool, and closes the browser instance.

  - `@returns {Promise<void>}` A Promise that resolves once all workers are terminated, the pool is destroyed, and the browser is successfully closed.

- `async function shutdownCleanUp(exitCode = 0)`: Performs cleanup operations to ensure a graceful shutdown of the process. This includes clearing all registered timeouts/intervals, closing active servers, terminating resources (pages) of the pool, pool itself, and closing the browser.

  - `@param {number} [exitCode=0]` - The exit code to use with `process.exit()`. The default value is `0`.

- `function log(...args)`: Logs a message with a specified log level. Accepts a variable number of arguments. The arguments after the `level` are passed to `console.log` and/or used to construct and append messages to a log file.

  - `@param {...unknown} args` - An array of arguments where the first is the log level and the remaining are strings used to build the log message.

  - `@returns {void}` Exits the function execution if attempting to log at a level higher than allowed.

- `function logWithStack(newLevel, error, customMessage)`: Logs an error message along with its stack trace. Optionally, a custom message can be provided.

  - `@param {number} newLevel` - The log level.
  - `@param {Error} error` - The error object containing the stack trace.
  - `@param {string} customMessage` - An optional custom message to be included in the log alongside the error.

  - `@returns {void}` Exits the function execution if attempting to log at a level higher than allowed.

- `function setLogLevel(level)`: Sets the log level to the specified value. Log levels are (`0` = no logging, `1` = error, `2` = warning, `3` = notice, `4` = verbose, or `5` = benchmark).

  - `@param {number} level` - The log level to be set.

- `function enableConsoleLogging(toConsole)`: Enables console logging.

  - `@param {boolean} toConsole` - The flag for setting the logging to the console.

- `function enableFileLogging(dest, file, toFile)`: Enables file logging with the specified destination and log file name.

  - `@param {string} dest` - The destination path where the log file should be saved.
  - `@param {string} file` - The name of the log file.
  - `@param {boolean} toFile` - A flag indicating whether logging should be directed to a file.

# Examples

Samples and tests for every mentioned export method can be found in the `./samples` and `./tests` folders. Detailed descriptions are available in their corresponding sections on the [Wiki](https://github.com/highcharts/node-export-server/wiki).

# Tips, Tricks & Notes

## Note About Version And Help Information

Typing `highcharts-export-server --v` will display information about the current version of the Export Server, and `highcharts-export-server --h` will display information about available CLI options.

## Note About Paths

All path-related options (such as those for loading additional resources and logic) can be either relative or absolute. If they are relative, they will be resolved based on the current working directory (the directory from which the Node.js process was started). This is especially important to remember when running a custom script in your application that imports the `highcharts-export-server` npm package and uses provided exporting API functions.

## Note About Deprecated Options

At some point during the transition process from the `PhantomJS` solution, certain options were deprecated. Here is a list of options that no longer work with the server based on `Puppeteer`:

- `async`
- `asyncRendering`
- `tmpdir`
- `dataOptions`
- `queueSize`

Additionally, some options are now named differently due to the new structure and categorization. Here is a list of old names and their corresponding new names (`old name` -> `new name`):

- `fromFile` -> `loadConfig`
- `sslOnly` -> `force` or `sslForce`
- `sslPath` -> `sslCertPath`
- `rateLimit` -> `maxRequests`
- `workers` -> `maxWorkers`

If you depend on any of the above options, the optimal approach is to directly change the old names to the new ones in the options. However, you don't have to do it manually, as there is a utility function called `mapToNewOptions` that can easily transfer the old-structured options to the new format. For an example, refer to the `./samples/module/optionsPhantom.js` file.

## Note About Chart Size

If you need to set the `height` or `width` of the chart, it can be done in two ways:

Set it in the `chart` config under:

- [`chart.height`](https://api.highcharts.com/highcharts/chart.height).
- [`chart.width`](https://api.highcharts.com/highcharts/chart.width).

Set it in the `exporting` config under:

- [`exporting.sourceHeight`](https://api.highcharts.com/highcharts/exporting.sourceHeight).
- [`exporting.sourceWidth`](https://api.highcharts.com/highcharts/exporting.sourceWidth).

The latter is preferred, as it allows you to set separate sizing when exporting and when displaying the chart on your web page.

Like previously mentioned, there are multiple ways to set and prioritize options, and the `height`, `width` and `scale` are no exceptions here. The priority goes like this:

1. The `height`, `width`, and `scale` options from the `export` section of the provided options (CLI, JSON, envs).
2. The `sourceHeight`, `sourceWidth` and `scale` from the `chart.exporting` section of chart's Highcharts options.
3. The `height` and `width` from the `chart` section of chart's Highcharts options.
4. The `sourceHeight`, `sourceWidth` and `scale` from the `chart.exporting` section of chart's Highcharts global options, if provided.
5. The `height` and `width` from the `chart` section of chart's Highcharts global options, if provided.
6. The `sourceHeight`, `sourceWidth` and `scale` from the `chart.exporting` section of chart's Highcharts theme options, if provided.
7. The `height` and `width` from the `chart` section of chart's Highcharts theme options, if provided.
8. If no options are found to this point, the default values will be used (`height = 400`, `width = 600` and `scale = 1`).

## Note About Event Listeners

The Export Server attaches event listeners to `process.exit`, `uncaughtException` and signals such as `SIGINT`, `SIGTERM` and `SIGHUP`. This is to make sure that there are no memory leaks or zombie processes if the application is unexpectedly terminated.

Listeners are also attached to handle `uncaught exceptions`. If an exception occurs, the entire pool and browser instance are terminated, and the application is shut down.

If you do not want this behavior, start the server with `--listenToProcessExits false`.

Be aware though, that if you disable this and you do not take great care to manually kill the pool of resources along with a browser instance, your server will bleed memory when the app is terminated.

## Note About Resources

If `--resources` argument is not set and a file named `resources.json` exists in the folder from which the CLI tool was ran, it will use the `resources.json` file.

## Note About Worker Count & Work Limit

The Export Server utilizes a pool of workers, where each worker is a Puppeteer process (browser instance's page) responsible for the actual chart rasterization. The pool size can be set with the `--minWorkers` and `--maxWorkers` options, and should be tweaked to fit the hardware on which you are running the server.

It is recommended that you start with the default `4`, and work your way up (or down if `8` is too many for your setup, and things are unstable) gradually. The `tests/other/stress-test.js` script can be used to test the server and expects the server to be running on port `7801`.

Each of the workers has a maximum number of requests it can handle before it restarts itself to keep everything responsive. This number is `40` by default, and can be tweaked with `--workLimit`. As with `--minWorkers` and `--maxWorkers`, this number should also be tweaked to fit your use case. Also, the `--acquireTimeout` option is worth to mention as well, in case there would be problems with acquiring resources. It is set in miliseconds with `5000` as a default value. Lastly, the `--createTimeout` and `--destroyTimeout` options are similar to the `--acquireTimeout` but for resource's create and destroy actions.

# Usage

## Injecting The Highcharts Dependency

In order to use the Export Server, Highcharts needs to be injected into the export template (see the `./templates` folder for reference).

Since version 3.0.0, Highcharts is fetched in a Just-In-Time manner, making it easy to switch configurations. It is no longer required to explicitly accept the license, as in older versions. **However, the Export Server still requires a valid Highcharts license to be used**.

## Using In Automated Deployments

Since version 3.0.0, when using in automated deployments, the configuration can be loaded either using environment variables or a JSON configuration file.

For a reference on available variables, refer to the configuration section above.

If you are using the Export Server as a dependency in your application, depending on your setup, it may be possible to set the environment variables in the `package.json` file as follows:

On Linux/Mac OS X:

```
{
  "scripts": {
    "preinstall": "export <variable1>=<value1>&&<variable2>=<value2>&&..."
  }
}
```

On Windows:

```
{
  "scripts": {
    "preinstall": "set <variable1>=<value1>&&<variable2>=<value2>&&..."
  }
}
```

## Library Fetches

When fetching the built Highcharts library, the default behaviour is to fetch them from `https://code.highcharts.com`.

## Installing Fonts

Does your Linux server not have Arial or Calibri? Puppeteer uses the system installed fonts to render pages. Therefore the Highcharts Export Server requires fonts to be properly installed on the system in order to use them to render charts.

Note that the default font-family config in Highcharts is `"Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, Helvetica, sans-serif"`.

Fonts are installed differently depending on your system. Please follow the below guides for font installation on most common systems.

### Mac OS X

Install your desired fonts with the Font Book app, or place it in `/Library/Fonts/` (system) or `~/Library/Fonts/` (user).

### Linux

Copy or move the TTF file to the `/usr/share/fonts/truetype` (may require sudo privileges):

```
mkdir -p /usr/share/fonts/truetype
cp yourFont.ttf /usr/share/fonts/truetype/
fc-cache -fv
```

### Windows

Copy or move the TTF file to `C:\Windows\Fonts\`:

```
copy yourFont.ttf C:\Windows\Fonts\yourFont.ttf
```

### Google Fonts

If you need Google Fonts in your custom installation, they can be had here: https://github.com/google/fonts.

Download them, and follow the above instructions for your OS.

# Debug Mode

Version 4.0.0 introduced a new mode that allows debugging the Puppeteer browser instance. This is particularly useful when setting up a custom server. It helps to delve into the implementation, observe how things work, and analyze and resolve potential problems.

## Launching

Setting the `--enableDebug` to **true** passes all debug options to the `puppeteer.launch()` function on startup. Together with the `--headless` option set to **false**, it launches the browser in a headful state providing a full version of the browser with a graphical user interface (GUI). While this serves as the minimal configuration to simply display the browser, Puppeteer offers additional options. Here is the full list:

- `--enableDebug`: Enables passing debug options to the `puppeteer.launch()`.
- `--headless`: Sets the browser's state.
- `--devtools`: Allows turning on the DevTools automatically upon launching the browser.
- `--listenToConsole`: Allows listening to messages from the browser's console.
- `--dumpio`: Redirects the browser's process `stdout` and `stderr` to `process.stdout` and `process.stderr` respectively.
- `--slowMo`: Delays Puppeteer operations by a specified amount of milliseconds.
- `--debuggingPort`: Specifies a debugging port for a browser.

## Debugging

There are two main ways to debug code:

- By adding a `debugger` statement within any client-side code (e.g., inside a `page.evaluate` callback). With the `--devtools` option set to **true**, the code execution will stop automatically.

- By running the export server with the `--inspect-brk=<PORT>` flag, and adding a `debugger` statement within any server-side code. Subsequently, navigate to `chrome://inspect/`, input the server's IP address and port (e.g., `localhost:9229`) in the Configure section. Clicking 'inspect' initiates debugging of the server-side code.

The `npm run start:debug` script from the `package.json` allows debugging code using both methods simultaneously. In this setup, client-side code is accessible from the devTools of a specific Puppeteer browser's page, while server-side code can be debugged from the devTools of `chrome://inspect/`.

For more details, refer to the [Puppeteer debugging guide](https://pptr.dev/guides/debugging).

## Additional Notes

- Ensure to set the `--headless` to **false** when the `--devtools` is set to **true**. Otherwise, there's a possibility that while DevTools may be recognized as enabled, the browser won't be displayed. Moreover, if a `debugger` is caught within the browser, it might lead to the entire debugging process getting stuck. In such scenarios, you can set the IP address and port (using the value of the `--debuggingPort` option) the same way as described in the section for debugging server-side code. This allows you to access DevTools and resume code execution.

- When using the `--listenToConsole` and `--dumpio` options, be aware that the server's console may become 'polluted' with messages from the browser. If you prefer to avoid this, simply set both options to **false**.

# Performance Notice

In cases of batch exports, using the HTTP server is faster than the CLI. This is due to the overhead of starting Puppeteer for each job when using the CLI.

So it is better to write a bash script that starts the server and then performs a set of POSTS to it through e.g. Curl if not wanting to host the Export Server as a service.

Alternatively, you can use the `--batch` switch if the output format is the same for each of the input files to process:

```
highcharts-export-server --batch "infile1.json=outfile1.png;infile2.json=outfile2.png;..."
```

Other switches can be combined with this switch.

## System Requirements

The system requirements largely depend on your use case.

The application is largely CPU and memory bound, so for heavy-traffic situations, it needs a fairly beefy server. It is recommended that the server has at least 1GB of memory regardless of traffic, and more than one core.

# License

[MIT](LICENSE). Note that a valid Highcharts License is also required to do exports.
