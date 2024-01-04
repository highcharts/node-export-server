# Highcharts Node.js Export Server

Convert Highcharts.JS charts to static image files.


## Upgrade notes for V3.0

V3 should be a drop in replacement for V2 in most cases. However, due to changing out the browser back-end part, the various tweaks related to process handling (e.g. worker counts and so on) may have different effects than they did previously.   

The API for when using the server as a node module has changed significantly, but a compatibility layer has been created to address this. It is however recommended to change to the new API described below, as the compatibility layer is likely to be deprecated at some point in the future.

One important note is that the export server now requires `node v16.14.0` or highe

## Changelog

_Fixes and enhancements:_

- Replaced PhantomJS with Puppeteer
- Updated the config handling system to optionally load JSON files, and improved environment var loading
- Rewrote the HC caching system: it's now easier to include custom modules/depdencey lists in your own deployments
- The install step no longer requires interaction when installing
- Replaced the custom worker pool system with `tarn`
- Error messages are now sent back to the client instead of being displayed in rasterized output
- Updated NPM dependencies, removed deprecated and uneccessary dependencies
- Lots of smaller bugfixes and tweaks

_New Features:_

- Added `/health` route to server to display basic server information
- Added a UI served on `/` to perform exports from JSON configurations in browser

The full change log for all versions can be viewed [here](CHANGELOG.md).

# What & Why

This is a node.js application/service that converts [Highcharts.JS](http://highcharts.com) charts to static image files. It supports PNG, JPEG, SVG, and PDF output; and the input can be either SVG, or JSON-formatted chart options.

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

The below JSON presents the default config that resides in the `lib/schemas/config.js` file. If no `.env` file is found (more on `.env` and environment variables below), these options are used.

The format, with its default values are as follows (using the below ordering of core scripts and modules is recommended):

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
    "batch": false
  },
  "customCode": {
    "allowCodeExecution": false,
    "allowFileResources": true,
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
      "skipKey": "",
      "skipToken": ""
    }
  },
  "pool": {
    "initialWorkers": 4,
    "maxWorkers": 8,
    "workLimit": 40,
    "queueSize": 5,
    "timeoutThreshold": 5000,
    "acquireTimeout": 5000,
    "reaper": true,
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

*Library fetches*

The `width` argument is mostly to set a zoom factor rather than an absolute width.

If you need to set the _height_ of the chart, it can be done in two ways:

This is done by setting `HIGHCHARTS_CDN` to `npm` in addition to setting
the afformentioned `ACCEPT_HIGHCHARTS_LICENSE` to `YES`.

The latter is prefered, as it lets you set a separate sizing when exporting and when displaying the chart in your web page.

Like previously mentioned, there are multiple ways to set and prioritize options, and the `height`, `width` and `scale` are no exceptions here. The priority goes like this:

1. Options from the `export` section of the provided options (CLI, JSON, etc.).
2. The `sourceHeight`, `sourceWidth` and `scale` from the `chart.exporting` section of chart's Highcharts options.
3. The `height` and `width` from the `chart` section of chart's Highcharts options.
4. The `sourceHeight`, `sourceWidth` and `scale` from the `chart.exporting` section of chart's Highcharts global options, if provided.
5. The `height` and `width` from the `chart` section of chart's Highcharts global options, if provided.
6. If no options are found to this point, the default values will be used (`height = 400`, `width = 600` and `scale = 1`).

## Note about process.exit listeners

The export server attaches event listeners to process.exit. This is to make sure that there are no memory leaks or zombie processes if the application is unexpectedly terminated.

Listeners are also attached to uncaught exceptions - if one appears, the entire pool is killed, and the application terminated.

If you do not want this behavior, start the server with `--listenToProcessExits 0`.

Be aware though - if you disable this and you don't take great care to manually kill the pool, your server _will_ bleed memory when the app is terminated.

## Note About Resources and the CLI

If `--resources` is not set, and a file `resources.json` exist in the folder from which the cli tool was ran, it will use the `resources.json` file.

## Note on Worker Count & Work Limit

The server accepts the following arguments:

  * `infile`: A string containing JSON or SVG for the chart
  * `options`: Alias for `infile`
  * `svg`: A string containing SVG to render
  * `type`: The format: `png`, `jpeg`, `pdf`, `svg`. Mimetypes can also be used.
  * `scale`: The scale factor. Use it to improve resolution in PNG and JPG, for example setting scale to 2 on a 600px chart will result in a 1200px output.
  * `width`: The chart width (overrides scale)
  * `callback`: Javascript to execute in the highcharts constructor.
  * `resources`: Additional resources.
  * `constr`: The constructor to use. Either `Chart` or `Stock`.
  * `b64`: Bool, set to true to get base64 back instead of binary.
  * ~~`async`: Get a download link instead of the file data. Note that the `b64` option overrides the `async` option.~~ This option is deprecated and will be removed as of Desember 1st 2021. Read the [announcement article on how to replace async](https://www.highcharts.com/docs/export-module/deprecated-async-option).
  * `noDownload`: Bool, set to true to not send attachment headers on the response.
  * `asyncRendering`: Wait for the included scripts to call `highexp.done()` before rendering the chart.
  * `globalOptions`: A JSON object with options to be passed to `Highcharts.setOptions`.
  * `dataOptions`: Passed to `Highcharts.data(..)`
  * `customCode`: When `dataOptions` is supplied, this is a function to be called with the after applying the data options. Its only argument is the complete options object which will be passed to the Highcharts constructor on return.

It responds to `application/json`, `multipart/form-data`, and URL encoded requests.

Each of the workers has a maximum number of requests it can handle before it restarts itself to keep everything responsive. This number is 40 by default, and can be tweaked with `--workLimit`. As with `--initialWorkers` and `--maxWorkers`, this number should also be tweaked to fit your use case. Also, the `--acquireTimeout` option is worth to mention as well, in case there would be problems with acquiring resources. It is set in miliseconds with 5000 as a default value.

## Setup: Injecting the Highcharts dependency

In order to use the export server, Highcharts.js needs to be injected into the export template.

Since version 3.0.0 Highcharts is fetched in a Just-In-Time manner, which makes it easy to switch configurations. It is no longer required to explicitly accept the license as in older versions - __but the export server still requires a valid Highcharts license to be used__.

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

// Initialize a pool of workers
await exporter.initPool(options);

// Perform an export
exporter.startExport(exportSettings, function (res, err) {
  // The export result is now in res.
  // It will be base64 encoded (res.data).

  // Kill the pool when we're done with it.
  exporter.killPool();
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

- `initPool(options)`: Init the pool of Puppeteer browser's pages - must be done prior to exporting. The `options` is an object that contains all options with, among others, the `pool` section which is required to successfuly init the pool:
  - `initialWorkers` (default 4) - Initial worker process count.
  - `maxWorkers` (default 8) - Max worker processes count.
  - `workLimit` (default 40) - How many task can be performed by a worker process before it's automatically restarted.
  - `timeoutThreshold` (default 3500) - The maximum allowed time for each export job execution, in milliseconds. If a worker has been executing a job for longer than this period, it will be restarted.
  - `acquireTimeout` (default 3000) - the maximum allowed time for each resource acquire, in milliseconds.
  - `benchmarking` (default false) - Enable benchmarking.
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
