# Highcharts Node.js Export Server

Convert Highcharts.JS charts to static image files.

## Upgrade notes for V3.0

In most cases, V3 should serve as a drop-in replacement for V2. However, due to changes in the browser back-end part, various tweaks related to process handling (e.g., worker counts, and so on) may now have different effects than before.

Significant changes have been made to the API for using the server as a Node module. While a compatibility layer has been created to address this, it is recommended to transition to the new API described below. It's worth noting that the compatibility layer may be deprecated at some point in the future.

An important note is that the export server now requires `node v16.14.0`` or a higher version.

## Changelog

The full change log for all versions can be viewed [here](CHANGELOG.md).

# What & Why

This is a Node.js application/service that converts [Highcharts.JS](http://highcharts.com) charts to static image files. It supports PNG, JPEG, SVG, and PDF output. The input can be either SVG or JSON-formatted chart options.

The application can be used either as a CLI (Command Line Interface), as an HTTP server, or as a node.js module.

## Use Cases

The main use case for the export server is situations where headless conversion of charts are required. Common use cases include automatic report generation, static caching, and for including charts in e.g. presentations, or other documents.

In addition, the HTTP mode can be used to run your own export server for your users, rather than relying on the public export.highcharts.com server which is rate limited.

The HTTP server can either be ran stand-alone and integrate with your other applications and services, or it can be ran in such a way that the export buttons on your charts route to your own server.

To do latter, add:

```
{
  exporting: {
    url: "<IP to the self-hosted export server>"
  }
}
```

to the chart options when creating your charts.

For systems that generate automatic reports, using the export server as a node.js module is a great fit - especially if your report generator is also written in node. See [here](https://github.com/highcharts/node-export-server#using-as-a-nodejs-module) for examples.

# Install

First, make sure you have node.js installed. Go to [nodejs.org](https://nodejs.org/en/download/) and download/install node for your platform.

After node.js is installed, install the export server by opening a terminal and typing:

```
npm install highcharts-export-server -g
```

OR:

```
git clone https://github.com/highcharts/node-export-server
npm install
npm link
```

Note: depending on how you installed Node, you may have to create a symlink from `nodejs` to `node`. Example on Linux:

```
ln -s `which nodejs` /usr/bin/node
```

# Running

```
highcharts-export-server <arguments>
```

# Configuration

There are four main ways of loading configurations:

- By loading default options from the `lib/schemas/config.js` file.
- By loading a custom JSON file.
- By providing environment variables.
- By passing command line arguments.

...or any combination of the four. In this case, the options from the later step take precedence (config file -> custom json -> envs -> cli arguments).

## Loading Default JSON Config

The JSON below represents the default configuration stored in the `lib/schemas/config.js` file. If no .env file is found (more details on .env and environment variables below), these options will be used.

The format, along with its default values, is as follows (using the recommended ordering of core scripts and modules below):

```
{
  "puppeteer": {
    "args": []
  },
  "highcharts": {
    "version": "latest",
    "cdnURL": "https://code.highcharts.com/",
    "coreScripts": [
      "highcharts",
      "highcharts-more",
      "highcharts-3d"
    ],
    "modules": [
      "stock",
      "map",
      "gantt",
      "exporting",
      "export-data",
      "parallel-coordinates",
      "accessibility",
      "annotations-advanced",
      "boost-canvas",
      "boost",
      "data",
      "draggable-points",
      "static-scale",
      "broken-axis",
      "heatmap",
      "tilemap",
      "timeline",
      "treemap",
      "treegraph",
      "item-series",
      "drilldown",
      "histogram-bellcurve",
      "bullet",
      "funnel",
      "funnel3d",
      "pyramid3d",
      "networkgraph",
      "pareto",
      "pattern-fill",
      "pictorial",
      "price-indicator",
      "sankey",
      "arc-diagram",
      "dependency-wheel",
      "series-label",
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
      "heikinashi"
    ],
    "indicators": [
      "indicators-all"
    ],
    "scripts": [
      "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"
    ],
    "forceFetch": false
  },
  "export": {
    "infile": false,
    "instr": false,
    "options": false,
    "outfile": false,
    "type": "png",
    "constr": "chart",
    "height": 400,
    "width": 600,
    "scale": 1,
    "globalOptions": false,
    "themeOptions": false,
    "batch": false,
    "rasterizationTimeout": 1500
  },
  "customCode": {
    "allowCodeExecution": false,
    "allowFileResources": false,
    "customCode": false,
    "callback": false,
    "resources": false,
    "loadConfig": false,
    "createConfig": false
  },
  "server": {
    "enable": false,
    "host": "0.0.0.0",
    "port": 7801,
    "ssl": {
      "enable": false,
      "force": false,
      "port": 443,
      "certPath": ""
    },
    "rateLimiting": {
      "enable": false,
      "maxRequests": 10,
      "window": 1,
      "delay": 0,
      "trustProxy": false,
      "skipKey": "",
      "skipToken": ""
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
    "benchmarking": false,
    "listenToProcessExits": true
  },
  "logging": {
    "level": 4,
    "file": "highcharts-export-server.log",
    "dest": "log/"
  },
  "ui": {
    "enable": false,
    "route": "/"
  },
  "other": {
    "noLogo": false
  }
}
```

## Loading Custom JSON Config

To load an additional JSON configuration file, use the `--loadConfig <filepath>` option. This JSON file can be either created manually or generated through a prompt triggered by the `--createConfig` option.

## Environment Variables

These are set as variables in your environment. They take precedence over options from the `lib/schemas/config.js` file. On Linux, use e.g. `export`.

### Node environment
- `NODE_ENV`: The type of Node environment. The value controls whether to include the error's stack in a response or not. Can be `development` or `production` (defaults to `development`).

### Export config

- `EXPORT_TYPE`: The format of the file to export to. Can be `jpeg`, `png`, `pdf` or `svg` (defaults to `png`).
- `EXPORT_CONSTR`: The constructor to use. Can be `chart`, `stockChart`, `mapChart` or `ganttChart` (defaults to `chart`).
- `EXPORT_DEFAULT_HEIGHT`: The default height of the exported chart. Used when not found any value set (defaults to `400`).
- `EXPORT_DEFAULT_WIDTH`: The default width of the exported chart. Used when not found any value set (defaults to `600`).
- `EXPORT_DEFAULT_SCALE`: The default scale of the exported chart. Ranges between `0.1` and `5.0` (defaults to `1`).
- `EXPORT_RASTERIZATION_TIMEOUT`: The specified duration, in milliseconds, to wait for rendering a webpage (defaults to `1500`).

### Highcharts config

- `HIGHCHARTS_VERSION`: Highcharts version to use (defaults to `latest`).
- `HIGHCHARTS_CDN_URL`: Highcharts CDN URL of scripts to be used (defaults to `https://code.highcharts.com/`).
- `HIGHCHARTS_CORE_SCRIPTS`: Highcharts core scripts to fetch.
- `HIGHCHARTS_MODULES`: Highcharts modules to fetch.
- `HIGHCHARTS_INDICATORS`: Highcharts indicators to fetch.
- `HIGHCHARTS_FORCE_FETCH`: The flag that determines whether to refetch all scripts after each server rerun (defaults to `false`).

### Custom code config

- `CUSTOM_CODE_ALLOW_CODE_EXECUTION`: Controls whether the execution of arbitrary code is allowed during the exporting process (defaults to `false`).
- `CUSTOM_CODE_ALLOW_FILE_RESOURCES`: Controls the ability to inject resources from the filesystem. This setting has no effect when running as a server (defaults to `false`).

### Server config

- `SERVER_ENABLE`: If set to true, the server starts on 0.0.0.0 (defaults to `false`).
- `SERVER_HOST`: The hostname of the server. Additionally, it starts a server listening on the provided hostname (defaults to `0.0.0.0`).
- `SERVER_PORT`: The port to be used for the server when enabled (defaults to `7801`).

### Server SSL config

- `SERVER_SSL_ENABLE`: If set to true, enables the SSL protocol (defaults to `false`).
- `SERVER_SSL_FORCE`: If set to true, the server is forced to serve only over HTTPS (defaults to `false`).
- `SERVER_SSL_PORT`: The port on which to run the SSL server (defaults to `443`).
- `SERVER_SSL_CERT_PATH`: The path to the SSL certificate/key file.

### Server rate limiting config

- `RATE_LIMITING_ENABLE`: Enables rate limiting for the server (defaults to `false`).
- `RATE_LIMITING_MAX_REQUESTS`: The maximum number of requests allowed in one minute (defaults to `10`).
- `RATE_LIMITING_WINDOW`: The time window, in minutes, for rate limiting (defaults to `1`).
- `RATE_LIMITING_DELAY`: The delay duration for each successive request before reaching the maximum limit (defaults to `0`).
- `RATE_LIMITING_TRUST_PROXY`: Set this to true if the server is behind a load balancer (defaults to `false`).
- `RATE_LIMITING_SKIP_KEY`: Allows bypassing the rate limiter and should be provided with the `skipToken` argument.
- `RATE_LIMITING_SKIP_TOKEN`: Allows bypassing the rate limiter and should be provided with the `skipKey` argument.

### Pool config

- `POOL_MIN_WORKERS`: The number of minimum and initial pool workers to spawn (defaults to `4`).
- `POOL_MAX_WORKERS`: The number of maximum pool workers to spawn (defaults to `8`).
- `POOL_WORK_LIMIT`: The number of work pieces that can be performed before restarting the process (defaults to `40`).
- `POOL_ACQUIRE_TIMEOUT`: The duration, in milliseconds, to wait for acquiring a resource (defaults to `5000`).
- `POOL_CREATE_TIMEOUT`: The duration, in milliseconds, to wait for creating a resource (defaults to `5000`).
- `POOL_DESTROY_TIMEOUT`: The duration, in milliseconds, to wait for destroying a resource (defaults to `5000`).
- `POOL_IDLE_TIMEOUT`: The duration, in milliseconds, after which an idle resource is destroyed (defaults to `30000`).
- `POOL_CREATE_RETRY_INTERVAL`: The duration, in milliseconds, to wait before retrying the create process in case of a failure (defaults to `200`).
- `POOL_REAPER_INTERVAL`: The duration, in milliseconds, after which the check for idle resources to destroy is triggered (defaults to `1000`).
- `POOL_BENCHMARKING`: Indicate whether to show statistics for the pool of resources or not (defaults to `false`).
- `POOL_LISTEN_TO_PROCESS_EXITS`: Decides whether or not to attach process.exit handlers (defaults to `true`).

### Logging config

- `LOGGING_LEVEL`: The logging level to be used. Can be `0` - silent, `1` - error, `2` - warning, `3` - notice or `4` - verbose (defaults to `4`).
- `LOGGING_FILE`: The name of a log file. The `logDest` option also needs to be set to enable file logging (defaults to `highcharts-export-server.log`).
- `LOGGING_DEST`: The path to store log files. This also enables file logging (defaults to `log/`).

### UI config

- `UI_ENABLE`: Enables or disables the user interface (UI) for the export server (defaults to `true`).
- `UI_ROUTE`: The endpoint route to which the user interface (UI) should be attached (defaults to `/`).

### Other config

- `OTHER_NO_LOGO`: Skip printing the logo on a startup. Will be replaced by a simple text.

### Proxy config

- `PROXY_SERVER_HOST`: The host of the proxy server to use, if it exists.
- `PROXY_SERVER_PORT`: The port of the proxy server to use, if it exists.
- `PROXY_SERVER_TIMEOUT`: The timeout for the proxy server to use, if it exists.

## Command Line Arguments

To supply command line arguments, add them as flags when running the application:
`highcharts-export-server --flag1 value --flag2 value ...`

_Available options:_

- `--infile`: The input file name along with a type (json or svg). It can be a correct JSON or SVG file (defaults to `false`).
- `--instr`: An input in a form of a stringified JSON or SVG file. Overrides the --infile (defaults to `false`).
- `--options`: An alias for the --instr option (defaults to `false`).
- `--outfile`: The output filename along with a type (jpeg, png, pdf or svg). Ignores the --type flag (defaults to `false`).
- `--type`: The format of the file to export to. Can be jpeg, png, pdf or svg (defaults to `png`).
- `--constr`: The constructor to use. Can be chart, stockChart, mapChart or ganttChart (defaults to `chart`).
- `--height`: The height of the exported chart. Overrides the option in the chart settings (defaults to `600`).
- `--width`: The width of the exported chart. Overrides the option in the chart settings (defaults to `400`).
- `--scale`: The scale of the exported chart. Ranges between 0.1 and 5.0 (defaults to `1`).
- `--globalOptions`: A stringified JSON or a filename with options to be passed into the Highcharts.setOptions (defaults to `false`).
- `--themeOptions`: A stringified JSON or a filename with theme options to be passed into the Highcharts.setOptions (defaults to `false`).
- `--batch`: Starts a batch job. A string that contains input/output pairs: "in=out;in=out;.." (defaults to `false`).
- `--rasterizationTimeout`: The number of milliseconds to wait for rendering a webpage (defaults to `1500`).
- `--allowCodeExecution`: If set to true, allow for the execution of arbitrary code when exporting (defaults to `false`).
- `--allowFileResources`: Allow injecting resources from the filesystem. Has no effect when running as a server (defaults to `true`).
- `--customCode`: Custom code to be called before chart initialization. Can be a function, a code that will be wrapped within a function or a filename with the js extension (defaults to `false`).
- `--callback`: A JavaScript function to run on construction. Can be a function or a filename with the js extension (defaults to `false`).
- `--resources`: An additional resource in a form of stringified JSON. It can contains files, js and css sections (defaults to `false`).
- `--loadConfig`: A file that contains a pre-defined config to use (defaults to `false`).
- `--createConfig`: Allows to set options through a prompt and save in a provided config file (defaults to `false`).
- `--enableServer`: If set to true, starts a server on 0.0.0.0 (defaults to `false`).
- `--host`: The hostname of the server. Also starts a server listening on the supplied hostname (defaults to `0.0.0.0`).
- `--port`: The port to use for the server. Defaults to 7801 (defaults to `7801`).
- `--enableSsl`: Enables the SSL protocol (defaults to `false`).
- `--sslForced`: If set to true, forces the server to only serve over HTTPS (defaults to `false`).
- `--sslPort`: The port on which to run the SSL server (defaults to `443`).
- `--certPath`: The path to the SSL certificate/key (defaults to ``).
- `--enableRateLimiting`: Enables rate limiting (defaults to `false`).
- `--maxRequests`: Max requests allowed in a one minute (defaults to `10`).
- `--skipKey`: Allows bypassing the rate limiter and should be provided with skipToken argument (defaults to ``).
- `--skipToken`: Allows bypassing the rate limiter and should be provided with skipKey argument (defaults to ``).
- `--minWorkers`: The number of initial workers to spawn (defaults to `4`).
- `--maxWorkers`: The number of max workers to spawn (defaults to `8`).
- `--workLimit`: The pieces of work that can be performed before restarting process (defaults to `60`).
- `--acquireTimeout`: The number of milliseconds to wait for acquiring a resource (defaults to `5000`).
- `--createTimeout`: The number of milliseconds to wait for creating a resource (defaults to `5000`).
- `--destroyTimeout`: The number of milliseconds to wait for destroying a resource (defaults to `5000`).
- `--idleTimeout`: The number of milliseconds after an idle resource is destroyed (defaults to `30000`).
- `--createRetryInterval`: The number of milliseconds after the create process is retried in case of fail (defaults to `200`).
- `--reaperInterval`: The number of milliseconds after the check for idle resources to destroy is triggered (defaults to `1000`).
- `--benchmarking`: Enable benchmarking for pool of resources (defaults to `false`).
- `--listenToProcessExits`: Set to false in order to skip attaching process.exit handlers (defaults to `true`).
- `--logLevel`: The log level (0: silent, 1: error, 2: warning, 3: notice, 4: verbose) (defaults to `4`).
- `--logFile`: A name of a log file. The --logDest also needs to be set to enable file logging (defaults to `highcharts-export-server.log`).
- `--logDest`: The path to store log files. Also enables file logging (defaults to `log/`).
- `--enableUi`: Enables the UI for the export server (defaults to `false`).
- `--uiRoute`: The route to attach the UI to (defaults to `/`).
- `--noLogo`: Skip printing the logo on a startup. Will be replaced by a simple text (defaults to `false`).

# Tips, Tricks & Notes

## Note about chart size

The `width` argument is mostly to set a zoom factor rather than an absolute width.

If you need to set the _height_ of the chart, it can be done in two ways:

- Set it in the chart config under [`chart.height`](https://api.highcharts.com/highcharts/chart.height).
- Set it in the chart config under [`exporting.sourceHeight`](https://api.highcharts.com/highcharts/exporting.sourceHeight).

The latter is prefered, as it lets you set a separate sizing when exporting and when displaying the chart in your web page.

Like previously mentioned, there are multiple ways to set and prioritize options, and the `height`, `width` and `scale` are no exceptions here. The priority goes like this:

1. Options from the `export` section of the provided options (CLI, JSON, etc.).
2. The `sourceHeight`, `sourceWidth` and `scale` from the `chart.exporting` section of chart's Highcharts options.
3. The `height` and `width` from the `chart` section of chart's Highcharts options.
4. The `sourceHeight`, `sourceWidth` and `scale` from the `chart.exporting` section of chart's Highcharts global options, if provided.
5. The `height` and `width` from the `chart` section of chart's Highcharts global options, if provided.
6. If no options are found to this point, the default values will be used (`height = 400`, `width = 600` and `scale = 1`).

## Note about process.exit listeners

The export server attaches event listeners to `process.exit`. This is to make sure that there are no memory leaks or zombie processes if the application is unexpectedly terminated.

Listeners are also attached to handle uncaught exceptions. If an exception occurs, the entire pool is terminated, and the application is shut down.

If you do not want this behavior, start the server with `--listenToProcessExits 0`.

Be aware though - if you disable this and you don't take great care to manually kill the pool, your server _will_ bleed memory when the app is terminated.

## Note About Resources and the CLI

If `--resources` is not set, and a file `resources.json` exist in the folder from which the cli tool was ran, it will use the `resources.json` file.

## Note on Worker Count & Work Limit

The export server utilizes a pool of workers, where each worker is a Puppeteer process (browser instance's page) responsible for the actual chart rasterization. The pool size can be set with the --initialWorkers and --maxWorkers options, and should be tweaked to fit the hardware on which you're running the server.

It's recommended that you start with the default (4), and work your way up (or down if 8 is too many for your setup, and things are unstable) gradually. The tests/other/stress-test.js script can be used to test the server and expects the server to be running on port 7801.

Each of the workers has a maximum number of requests it can handle before it restarts itself to keep everything responsive. This number is 40 by default, and can be tweaked with `--workLimit`. As with `--minWorkers` and `--maxWorkers`, this number should also be tweaked to fit your use case. Also, the `--acquireTimeout` option is worth to mention as well, in case there would be problems with acquiring resources. It is set in miliseconds with 5000 as a default value. Lastly, the `--createTimeout` and `--destroyTimeout` options are similar to the `--acquireTimeout` but for resource's create and destroy actions.

## Setup: Injecting the Highcharts dependency

In order to use the export server, Highcharts.js needs to be injected into the export template.

Since version 3.0.0 Highcharts is fetched in a Just-In-Time manner, which makes it easy to switch configurations. It is no longer required to explicitly accept the license as in older versions - **but the export server still requires a valid Highcharts license to be used**.

## Using In Automated Deployments

Since version 3.0.0, when using in automated deployments, the configuration can either be loaded using environment variables or a JSON configuration file.

For a reference on available variables, refer to the configuration section above.

If you're using the export server as a dependency in your own app, depending on your setup, it may be possible to set the env variable in your `package.json` file:

```
{
  "scripts": {
    "preinstall": "export <setting>=<value>"
  }
}
```

_Library fetches_

When fetching the built Highcharts library, the default behaviour is to fetch them from `code.highcharts.com`.

## HTTP Server

The server accepts the following arguments in a POST body:

- `infile`: A string containing JSON or SVG for the chart.
- `options`: Alias for `infile`.
- `svg`: A string containing SVG to render.
- `type`: The format: `png`, `jpeg`, `pdf`, `svg`. Mimetypes can also be used.
- `scale`: The scale factor. Use it to improve resolution in PNG and JPEG, for example setting scale to 2 on a 600px chart will result in a 1200px output.
- `height`: The chart height.
- `width`: The chart width.
- `callback`: Javascript to execute in the highcharts constructor.
- `resources`: Additional resources.
- `constr`: The constructor to use. Either `chart`, `stockChart`, `mapChart` or `ganttChart`.
- `b64`: Bool, set to true to get base64 back instead of binary.
- `noDownload`: Bool, set to true to not send attachment headers on the response.
- `filename`: If `noDownload == false`, the file will be downloaded with the `${filename}.${type}` name.
- `globalOptions`: A JSON object with options to be passed to `Highcharts.setOptions`.
- `themeOptions`: A JSON object with options to be passed to `Highcharts.setOptions`.
- `customCode`: Custom code to be called before chart initialization. Can be a function, a code that will be wrapped within a function or a filename with the js extension.

It responds to `application/json`, `multipart/form-data`, and URL encoded requests.

CORS is enabled for the server.

It's recommended to run the server using [pm2](https://www.npmjs.com/package/pm2) unless running in a managed environment/container. Please refer to the pm2 documentation for details on how to set this up.

## SSL

To enable SSL support, add `--certPath <path to key/crt>` when running the server. Note that the certificate files needs to be named as such:

- `server.crt`
- `server.key`

## System Requirements

The system requirements largely depend on your use case.

The application is largely CPU and memory bound, so when using in heavy-traffic situations, it needs a fairly beefy server. It's recommended that the server has at least 1GB of memory regardless of traffic, and more than one core.

## Installing Fonts

Does your Linux server not have Arial or Calibri? Puppeteer uses the system installed fonts to render pages. Therefore the Highcharts Export Server requires fonts to be properly installed on the system in order to use them to render charts.

Note that the default font-family config in Highcharts is `"Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, Helvetica, sans-serif"`.

Fonts are installed differently depending on your system. Please follow the below guides for font installation on most common systems.

### OS X

Install your desired fonts with the Font Book app, or place it in /Library/Fonts/ (system) or ~/Library/Fonts/ (user).

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

### Google fonts

If you need Google Fonts in your custom installation, they can be had here: https://github.com/google/fonts.

Download them, and follow the above instructions for your OS.

## Server Test

Run the below in a terminal after running `highcharts-export-server --enableServer 1`:

```
# Generate a chart and save it to mychart.png
curl -H "Content-Type: application/json" -X POST -d '{"infile":{"title": {"text": "Steep Chart"}, "xAxis": {"categories": ["Jan", "Feb", "Mar"]}, "series": [{"data": [29.9, 71.5, 106.4]}]}}' 127.0.0.1:7801 -o mychart.png
```

# Using as a Node.js Module

The export server can also be used as a node module to simplify integrations:

```
// Import the Export Server module
const exporter = require('highcharts-export-server');

// Initialize export settings with your chart's config
// Export settings correspond to the available CLI arguments described above.
const exportSettings = {
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

// Set the new options and merge it with the default options
const options = exporter.setOptions(exportSettings);

// Must initialize exporting before being able to export charts
await exporter.initExport(options);

// Perform an export
await exporter.startExport(exportSettings, async (info, error) => {
  // The export result is now in info.
  // It will be base64 encoded (info.data).

  // Kill the pool when we're done with it.
  await exporter.killPool();
});
```

## CommonJS support

This package supports both CommonJS and ES modules.

## Node.js API Reference

**highcharts-export-server module**

### Functions

- `log(level, ...)`: Log something. Level is a number from 1 to 4. Args are joined by whitespace to form the message.

- `mapToNewConfig(oldOptions)`: Maps the old options structure (for the PhantomJS server) to the new config structure.

- `setOptions(userOptions, args)`: Initializes and sets the general options for the server instace, keeping the principle of the options load priority (more in the Configuration section). It accepts optional userOptions and with args from the CLI.

- `startExport(settings, endCallback)`: Start an export process. The `settings` contains final options gathered from all possible sources (config, env, cli, json). The `endCallback` is called when the export is completed, with an object as the first argument containing the base64 respresentation of a chart.

- `startServer(serverConfig)`: Start an http server on the given port. The `serverConfig` object contains all server related properties (see the `server` section in the `lib/schemas/config.js` file for a reference).

- `server` - The server instance:

  - `startServer(serverConfig)` - The same as `startServer` from above.
  - `getExpress()` - Return the express module instance.
  - `getApp()` - Return the app instance.
  - `use(path, ...middlewares)` - Add a middleware to the server.
  - `get(path, ...middlewares)` - Add a get middleware to the server.
  - `post(path, ...middlewares)` - Add a post middleware to the server.
  - `enableRateLimiting(options)` - Enable rate limiting on the POST path.
    - `maxRequests` - The maximum amount of requests before rate limiting kicks in.
    - `window` - The time window in minutes for rate limiting. Example: setting `window` to `1` and `max` to `30` will allow a maximum of 30 requests within one minute.
    - `delay` - The amount to delay each successive request before hitting the max.
    - `trustProxy` - Set this to true if behind a load balancer.
    - `skipKey`/`skipToken` - key/token pair that allows bypassing the rate limiter. On requests, these should be sent as such: `?key=<key>&access_token=<token>`.

- `initExport(options)`: Init the pool of Puppeteer browser's pages - must be done prior to exporting. The `options` is an object that contains all options with, among others, the `pool` section which is required to successfuly init the pool:

  - `minWorkers` (default 4) - Min and initial worker process count.
  - `maxWorkers` (default 8) - Max worker processes count.
  - `workLimit` (default 40) - How many task can be performed by a worker process before it's automatically restarted.
  - `acquireTimeout` (default 5000) - The maximum allowed time for each resource acquire, in milliseconds.
  - `createTimeout` (default 5000) - The maximum allowed time for each resource create, in milliseconds.
  - `destroyTimeout` (default 5000) - The maximum allowed time for each resource destroy, in milliseconds.
  - `idleTimeout` (default 30000) - The maximum allowed time after an idle resource is destroyed, in milliseconds.
  - `createRetryInterval` (default 200) - The number of milliseconds after the create process is retried in case of fail.
  - `reaperInterval` (default 1000) - The number of milliseconds after the check for idle resources to destroy is triggered.
  - `benchmarking` (default false) - Enable benchmarking for pool of resources.
  - `listenToProcessExits` (default true) - Set to false in order to skip attaching process.exit handlers.

- `killPool()`: Kill the pool of resources (Puppeteer browser's pages).

# Performance Notice

In cases of batch exports, it's faster to use the HTTP server than the CLI. This is due to the overhead of starting Puppeteer for each job when using the CLI.

As a concrete example, running the CLI with [testcharts/basic.json](testcharts/basic.json) as the input and converting to PNG averages about 449ms. Posting the same configuration to the HTTP server averages less than 100ms.

So it's better to write a bash script that starts the server and then performs a set of POSTS to it through e.g. curl if not wanting to host the export server as a service.

Alternatively, you can use the `--batch` switch if the output format is the same for each of the input files to process:

```
highcharts-export-server --batch "infile1.json=outfile1.png;infile2.json=outfile2.png;..."
```

Other switches can be combined with this switch.

# Switching HC version at runtime

If `HIGHCHARTS_ADMIN_TOKEN` is set, you can use the `POST /change_hc_version/:newVersion` route to switch the Highcharts version on the server at runtime, ie. without restarting or redeploying the application.

A sample request to change the version to 10.3.3 is as follows:

```
curl -H 'hc-auth: <YOUR AUTH TOKEN>' -X POST <SERVER URL>/change_hc_version/10.3.3
```

e.g.

```
curl -H 'hc-auth: 12345' -X POST 127.0.0.1:7801/change_hc_version/10.3.3
```

This is useful to e.g. upgrade to the latest HC version without downtime.

# License

[MIT](LICENSE). Note that a valid Highcharts License is also required to do exports.
