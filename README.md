# Highcharts Node.js Export Server

Convert Highcharts.JS charts to static image files.

# Breaking changes in v2.1.0

Version 2.1.0 has a couple of breaking changes:

- Log destinations must now exist before starting file logging
- The following options are now disabled by default:
  - `callback`
  - `resources`
  - `customCode`

Disabled options can be enabled by adding the `--allowCodeExecution` flag when
starting the server/CLI. Using this flag is not recommended, and should not be
done unless the server is sandboxed and not reachable on the public internet, or if only using the CLI in a controlled manner (e.g. it's not possible for a user to change the configuration sent to it through a different system).

# What & Why

This is a node.js application/service that converts [Highcharts.JS](http://highcharts.com) charts to static image files.
It supports PNG, JPEG, SVG, and PDF output; and the input can be either SVG, or JSON-formatted chart options.

The application can be used either as a CLI (Command Line Interface), as an HTTP server, or as a node.js module.

## Use Cases

The main use case for the export server is situations where headless conversion of charts are required.
Common use cases include automatic report generation, static caching, and for including charts in e.g.
presentations, or other documents.

In addition, the HTTP mode can be used to run your own export server for your users,
rather than relying on the public export.highcharts.com server which is rate limited.

The HTTP server can either be ran stand-alone and integrate with your other applications and services,
or it can be ran in such a way that the export buttons on your charts route to your own server.

To do latter, add:

    {
      exporting: {
        url: "<IP to the self-hosted export server>"
      }
    }

to the chart options when creating your charts.

For systems that generate automatic reports, using the export server as a node.js module
is a great fit - especially if your report generator is also written in node.
See [here](https://github.com/highcharts/node-export-server#using-as-a-nodejs-module) for examples.

# Install

First, make sure you have node.js installed. Go to [nodejs.org](https://nodejs.org/en/download/) and download/install node for your platform.

After node.js is installed, install the export server by opening a terminal and typing:

    npm install highcharts-export-server -g

OR:

    git clone https://github.com/highcharts/node-export-server
    npm install
    npm link

Note: depending on how you installed Node, you may have to create a symlink from `nodejs` to `node`. Example on Linux:

```
ln -s `which nodejs` /usr/bin/node
```

# Running

    highcharts-export-server <arguments>

# Configuration

There are three main ways of loading configurations:

- Through command line arguments
- By loading a JSON file
- By supplying environment variables

...or any combination of the three.

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
- `--scale`: The scale of the exported chart. Ranges between 1 and 5 (defaults to `1`).
- `--height`: The height of the exported chart. Overrides the option in the chart settings (defaults to `600`).
- `--width`: The width of the exported chart. Overrides the option in the chart settings (defaults to `400`).
- `--globalOptions`: A stringified JSON or a filename with options to be passed into the Highcharts.setOptions (defaults to `false`).
- `--themeOptions`: A stringified JSON or a filename with theme options to be passed into the Highcharts.setOptions (defaults to `false`).
- `--batch`: Starts a batch job. A string that contains input/output pairs: "in=out;in=out;.." (defaults to `false`).
- `--allowCodeExecution`: If set to true, allow for the execution of arbitrary code when exporting (defaults to `false`).
- `--allowFileResources`: Allow injecting resources from the filesystem. Has no effect when running as a server (defaults to `true`).
- `--resources`: An additional resource in a form of stringified JSON. It can contains files, js and css sections (defaults to `false`).
- `--callback`: A JavaScript function to run on construction. Can be a function or a filename with the js extension (defaults to `false`).
- `--customCode`: Custom code to be called before chart initialization. Can be a function, a code that will be wrapped within a function or a filename with the js extension (defaults to `false`).
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
- `--initialWorkers`: The number of initial workers to spawn (defaults to `4`).
- `--maxWorkers`: The number of max workers to spawn (defaults to `4`).
- `--workLimit`: The pieces of work that can be performed before restarting process (defaults to `60`).
- `--queueSize`: The size of the request overflow queue (defaults to `5`).
- `--timeoutThreshold`: The number of milliseconds before timing out (defaults to `30000`).
- `--acquireTimeout`: The number of milliseconds to wait for acquiring a resource (defaults to `3000`).
- `--reaper`: Whether or not to evict workers after a certain time period (defaults to `true`).
- `--benchmarking`: Enable benchmarking (defaults to `true`).
- `--listenToProcessExits`: Set to false in order to skip attaching process.exit handlers (defaults to `true`).
- `--logLevel`: The log level (0: silent, 1: error, 2: warning, 3: notice, 4: verbose) (defaults to `4`).
- `--logFile`: A name of a log file. The --logDest also needs to be set to enable file logging (defaults to `highcharts-export-server.log`).
- `--logDest`: The path to store log files. Also enables file logging (defaults to `log/`).
- `--enableUi`: Enables the UI for the export server (defaults to `false`).
- `--uiRoute`: The route to attach the UI to (defaults to `/`).
- `--noLogo`: Skip printing the logo on a startup. Will be replaced by a simple text (defaults to `false`).

## Loading JSON Configs

The below JSON presents the default config that resides in the `lib/schemas/config.js` file. If no `.env` file is found (more on`.env` and environment variables below), these options are used. Loading an additional JSON configuration file can be done by using the `--loadConfig <filepath>` option.

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
      "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.3/moment.min.js"
    ]
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
    "maxWorkers": 4,
    "workLimit": 60,
    "queueSize": 5,
    "timeoutThreshold": 30000,
    "acquireTimeout": 3000,
    "reaper": true,
    "benchmarking": true,
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

## Environment Variables

These are set as variables in your environment. They take precedence over other options. On Linux, use e.g. `export`.

- `EXPORT_DEFAULT_TYPE`: The format of the file to export to. Can be jpeg, png, pdf or svg.
- `EXPORT_DEFAULT_CONSTR`: The constructor to use. Can be chart, stockChart, mapChart or ganttChart.
- `EXPORT_DEFAULT_HEIGHT`: The height of the exported chart. Overrides the option in the chart settings.
- `EXPORT_DEFAULT_WIDTH`: The width of the exported chart. Overrides the option in the chart settings.
- `EXPORT_DEFAULT_SCALE`: The scale of the exported chart. Ranges between 1 and 5.
- `HIGHCHARTS_VERSION`: Highcharts version to use.
- `HIGHCHARTS_CDN`: The CDN URL of Highcharts scripts to use.
- `HIGHCHARTS_CORE_SCRIPTS`: Highcharts core scripts to fetch.
- `HIGHCHARTS_MODULES`: Highcharts modules to fetch.
- `HIGHCHARTS_INDICATORS`: Highcharts indicators to fetch.
- `HIGHCHARTS_ALLOW_CODE_EXECUTION`: If set to true, allow for the execution of arbitrary code when exporting.
- `HIGHCHARTS_ALLOW_FILE_RESOURCES`: Allow injecting resources from the filesystem. Has no effect when running as a server.
- `HIGHCHARTS_SERVER_ENABLE`: If set to true, starts a server on 0.0.0.0.
- `HIGHCHARTS_SERVER_HOST`: The hostname of the server. Also starts a server listening on the supplied hostname.
- `HIGHCHARTS_SERVER_PORT`: The port to use for the server. Defaults to 7801.
- `HIGHCHARTS_SERVER_SSL_ENABLE`: Enables the SSL protocol.
- `HIGHCHARTS_SERVER_SSL_FORCE`: If set to true, forces the server to only serve over HTTPS.
- `HIGHCHARTS_SERVER_SSL_PORT`: The port on which to run the SSL server.
- `HIGHCHARTS_SERVER_SSL_CERT_PATH`: The path to the SSL certificate/key.
- `HIGHCHARTS_RATE_LIMIT_ENABLE`: Enables rate limiting.
- `HIGHCHARTS_RATE_LIMIT_MAX`: Max requests allowed in a one minute.
- `HIGHCHARTS_RATE_LIMIT_SKIP_KEY`: Allows bypassing the rate limiter and should be provided with skipToken argument.
- `HIGHCHARTS_RATE_LIMIT_SKIP_TOKEN`: Allows bypassing the rate limiter and should be provided with skipKey argument.
- `HIGHCHARTS_POOL_MIN_WORKERS`: The number of initial workers to spawn.
- `HIGHCHARTS_POOL_MAX_WORKERS`: The number of max workers to spawn.
- `HIGHCHARTS_POOL_WORK_LIMIT`: The pieces of work that can be performed before restarting process.
- `HIGHCHARTS_POOL_QUEUE_SIZE`: The size of the request overflow queue.
- `HIGHCHARTS_POOL_TIMEOUT`: The number of milliseconds before timing out.
- `HIGHCHARTS_POOL_ACQUIRE_TIMEOUT`: The number of milliseconds to wait for acquiring a resource.
- `HIGHCHARTS_POOL_ENABLE_REAPER`: Whether or not to evict workers after a certain time period.
- `HIGHCHARTS_POOL_BENCHMARKING`: Enable benchmarking.
- `HIGHCHARTS_POOL_LISTEN_TO_PROCESS_EXITS`: Set to false in order to skip attaching process.exit handlers.
- `HIGHCHARTS_LOG_LEVEL`: The log level (0: silent, 1: error, 2: warning, 3: notice, 4: verbose).
- `HIGHCHARTS_LOG_FILE`: A name of a log file. The --logDest also needs to be set to enable file logging.
- `HIGHCHARTS_LOG_DEST`: The path to store log files. Also enables file logging.
- `HIGHCHARTS_UI_ENABLE`: Enables the UI for the export server.
- `HIGHCHARTS_UI_ROUTE`: The route to attach the UI to.
- `HIGHCHARTS_NO_LOGO`: Skip printing the logo on a startup. Will be replaced by a simple text.
- `PROXY_SERVER_HOST`: The host of the proxy server to use if exists.
- `PROXY_SERVER_PORT`: The port of the proxy server to use if exists.
- `PROXY_SERVER_TIMEOUT`: The timeout for the proxy server to use if exists.

# Tips, Tricks & Notes

## Note about chart size

The `width` argument is mostly to set a zoom factor rather than an absolute width.

If you need to set the _height_ of the chart, it can be done in two ways:

- Set it in the chart config under [`chart.height`](https://api.highcharts.com/highcharts/chart.height)
- Set it in the chart config under [`exporting.sourceHeight`](https://api.highcharts.com/highcharts/exporting.sourceHeight)

The latter is prefered, as it lets you set a separate sizing when exporting and
when displaying the chart in your web page.

## Note about process.exit listeners

The export server attaches event listeners to process.exit. This is to
make sure that there are no memory leaks or zombie processes if the
application is unexpectedly terminated

Listeners are also attached to uncaught exceptions - if one appears,
the entire pool is killed, and the application terminated.

If you do not want this behavior, start the server with `--listenToProcessExits 0`.

Be aware though - if you disable this and you don't take great care to manually
kill the pool, your server _will_ bleed memory when the app is terminated.

## Note About Resources and the CLI

If `--resources` is not set, and a file `resources.json` exist in the folder
from which the cli tool was ran, it will use the `resources.json` file.

## Note on Worker Count & Work Limit

The export server utilizes a pool of _workers_, where each worker is a
Puppeteer process responsible for the actual chart rasterization. The pool size
can be set with the `--initialWorkers` and `--maxWorkers` options, and should be tweaked to fit the hardware on which you're running the server. 

It's recommended that you start with the default (6), and work your way up (or down if 8 is too many for your setup, and things are unstable) gradually. The `tests/other/stress-test.js` script can be used to test the server. It fires batches of 10 requests every 10ms, and expects the server to be running on port 7801.

Each of the workers has a maximum number of requests it can
handle before it restarts itself to keep everything responsive.
This number is 60 by default, and can be tweaked with
`--workLimit`. As with `--initialWorkers` and `--maxWorkers`, this number should
also be tweaked to fit your use case.

## Setup: Injecting the Highcharts dependency

In order to use the export server, Highcharts.js needs to be injected
into the export template.

Since version 3.0.0 Highcharts is fetched in a Just-In-Time manner,
which makes it easy to switch configurations. It is no longer required to
explicitly accept the license as in older versions - __but the export server still requires a valid Highcharts license to be used__.

## Using In Automated Deployments

Since version 3.0.0, when using in automated deployments, the configuration can either be loaded using environment variables or a JSON configuration file.

For a reference on available variables, refer to the configuration section above.

If you're using the export server as a dependency in your own app,
depending on your setup, it may be possible to set the env variable in your `package.json` file:

```
{
  "scripts": {
    "preinstall": "export <setting>=<value>"
  }
}
```

_Library fetches_

When fetching the built Highcharts library, the default behaviour is to
fetch them from `code.highcharts.com`.

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

## AWS Lambda

See [this](https://github.com/highcharts/node-export-server/issues/81) issue.

## SSL

To enable ssl support, add `--sslPath <path to key/crt>` when running the server.
Note that the certificate files needs to be named as such:

- `server.crt`
- `server.key`

## System Requirements

The system requirements largely depend on your use case.

The application is largely CPU and memory bound, so when using in heavy-traffic situations,
it needs a fairly beefy server. It's recommended that the server has at least 1GB
of memory regardless of traffic, and more than one core.

## Installing Fonts

Does your Linux server not have Arial or Calibri? Puppeteer uses the system installed fonts to render pages. Therefore the Highcharts Export Server requires fonts to be properly installed on the system in order to use them to render charts.

Note that the default font-family config in Highcharts is `"Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, Helvetica, sans-serif"`.

Fonts are installed differently depending on your system. Please follow the below guides for font installation on most common systems.

### OS X

Install your desired fonts with the Font Book app, or place it in /Library/Fonts/ (system) or ~/Library/Fonts/ (user)

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

If you need Google Fonts in your custom installation, they can be had here:
https://github.com/google/fonts

Download them, and follow the above instructions for your OS.

## Server Test

Run the below in a terminal after running `highcharts-export-server --enableServer 1`:

    # Generate a chart and save it to mychart.png
    curl -H "Content-Type: application/json" -X POST -d '{"infile":{"title": {"text": "Steep Chart"}, "xAxis": {"categories": ["Jan", "Feb", "Mar"]}, "series": [{"data": [29.9, 71.5, 106.4]}]}}' 127.0.0.1:7801 -o mychart.png

# Using as a Node.js Module

The export server can also be used as a node module to simplify integrations:

    //Include the exporter module
    const exporter = require('highcharts-export-server');

    //Export settings
    var exportSettings = {
        type: 'png',
        options: {
            title: {
                text: 'My Chart'
            },
            xAxis: {
                categories: ["Jan", "Feb", "Mar", "Apr", "Mar", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
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
    };

    //Set up a pool of workers
    exporter.initPool();

    //Perform an export
    /*
        Export settings corresponds to the available CLI arguments described
        above.
    */
    exporter.export(exportSettings, function (err, res) {
        //The export result is now in res.
        //If the output is not PDF or SVG, it will be base64 encoded (res.data).
        //If the output is a PDF or SVG, it will contain a filename (res.filename).

        //Kill the pool when we're done with it, and exit the application
        exporter.killPool();
        process.exit(1);
    });

## Node.js API Reference

**highcharts-export-server module**

**Functions**

- `log(level, ...)`: log something. Level is a number from 1-4. Args are joined by whitespace to form the message.
- `logLevel(level)`: set the current log level: `0`: disabled, `1`: errors, `2`: warnings, `3`: notices, `4`: verbose
- `enableFileLogging(path, name)`: enable logging to file. `path` is the path to log to, `name` is the filename to log to
- `export(exportOptions, fn)`: do an export. `exportOptions` uses the same attribute names as the CLI switch names. `fn` is called when the export is completed, with an object as the second argument containing the the filename attribute.
- `startServer(port, sslPort, sslPath)`: start an http server on the given port. `sslPath` is the path to the server key/certificate (must be named server.key/server.crt)
- `server` - the server instance
  - `enableRateLimiting(options)` - enable rate limiting on the POST path
    - `max` - the maximum amount of requests before rate limiting kicks in
    - `window` - the time window in minutes for rate limiting. Example: setting `window` to `1` and `max` to `30` will allow a maximum of 30 requests within one minute.
    - `delay` - the amount to delay each successive request before hitting the max
    - `trustProxy` - set this to true if behind a load balancer
    - `skipKey`/`skipToken` - key/token pair that allows bypassing the rate limiter. On requests, these should be sent as such: `?key=<key>&access_token=<token>`.
  - `app()` - returns the express app
  - `express()` - return the express module instance
  - `useFilter(when, fn)` - attach a filter to the POST route. Returning false in the callback will terminate the request.
    - `when` - either `beforeRequest` or `afterRequest`
    - `fn` - the function to call
      - `req` - the request object
      - `res` - the result object
      - `data` - the request data
      - `id` - the request ID
      - `uniqueid` - the unique id for the request (used for temporary file names)
- `initPool(config)`: init the phantom pool - must be done prior to exporting. `config` is an object as such:
  - `maxWorkers` (default 25) - max count of worker processes
  - `initialWorkers` (default 5) - initial worker process count
  - `workLimit` (default 60) - how many task can be performed by a worker process before it's automatically restarted
  - `queueSize` (default 5) - how many request can be stored in overflow count when there are not enough workers to handle all requests
  - `timeoutThreshold` (default 3500) - the maximum allowed time for each export job execution, in milliseconds. If a worker has been executing a job for longer than this period, it will be restarted
  - `acquireTimeout` (default 3000) - the maximum allowed time for each resource acquire, in milliseconds
- `killPool()`: kill the phantom processes

# Performance Notice

In cases of batch exports, it's faster to use the HTTP server than the CLI.
This is due to the overhead of starting Puppeteer for each job when using the CLI.

As a concrete example, running the CLI with [testcharts/basic.json](testcharts/basic.json)
as the input and converting to PNG averages about 449ms.
Posting the same configuration to the HTTP server averages less than 100ms.

So it's better to write a bash script that starts the server and then
performs a set of POSTS to it through e.g. curl if not wanting to host the
export server as a service.

Alternatively, you can use the `--batch` switch if the output format is the same
for each of the input files to process:

    highcharts-export-server --batch "infile1.json=outfile1.png;infile2.json=outfile2.png;.."

Other switches can be combined with this switch.


# Switching HC version at runtime

If `HIGHCHARTS_ADMIN_TOKEN` is set, you can use the `POST /change-hc-version/:newVersion` route to switch the Highcharts version on the server at runtime, ie. without restarting or redeploying the application.

A sample request to change the version to 10.3.3 is as follows:

```
curl -H 'hc-auth: <YOUR AUTH TOKEN>' -X POST <SERVER URL>/change-hc-version/10.3.3
```

e.g.

```
curl -H 'hc-auth: 12345' -X POST 127.0.0.1:7801/change-hc-version/10.3.3
```

This is useful to e.g. upgrade to the latest HC version without downtime.

# License

[MIT](LICENSE). Note that a valid Highcharts License is also required to do exports.
