# Highcharts Node.js Export Server

Convert Highcharts.JS charts to static image files.

## What & Why

This is a node.js application/service that converts [Highcharts.JS](http://highcharts.com) charts to static image files.
It supports PNG, JPEG, SVG, and PDF output; and the input can be either SVG, or JSON-formatted chart options.

The application can be used either as a CLI (Command Line Interface), as an HTTP server, or as a node.js module.

### Use Cases

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

## Install

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

## Running

    highcharts-export-server <arguments>

## Command Line Arguments

**General options**

  * `--infile`: Specify the input file.
  * `--instr`: Specify the input as a string.
  * `--options`: Alias for `--instr`
  * `--outfile`: Specify the output filename.
  * `--allowFileResources`: Allow injecting resources from the filesystem. Has no effect when running as a server. Defaults to `true`.
  * `--type`: The type of the exported file. Valid options are `jpg png pdf svg`.
  * `--scale`: The scale of the chart. Use it to improve resolution in PNG and JPG, for example setting scale to 2 on a 600px chart will result in a 1200px output.
  * `--width`: Scale the chart to fit the width supplied - overrides `--scale`.
  * `--constr`: The constructor to use. Either `Chart`, `Map` (requires that the server was installed with maps support), or `StockChart`.
  * `--callback`: File containing JavaScript to call in the constructor of Highcharts.
  * `--resources`: Stringified JSON.
  * `--batch "input.json=output.png;input2.json=output2.png;.."`: Batch convert
  * `--logDest <path>`: Set path for log files, and enable file logging
  * `--logFile <filename>`: Set the name of the log file (without the path). Defaults to `highcharts-export-server.log`. Note that `--logDest` also needs to be set to enable file logging.
  * `--logLevel <0..4>`: Set the log level. 0 = off, 1 = errors, 2 = warn, 3 = notice, 4 = verbose
  * `--fromFile "options.json"`: Read CLI options from JSON file
  * `--tmpdir`: The path to temporary output files.
  * `--workers`: Number of workers to spawn
  * `--workLimit`: the pieces of work that can be performed before restarting a phantom process
  * `--queueSize`: how many request can be stored in overflow count when there are not enough
  * `--listenToProcessExits`: set to 0 to skip attaching process.exit handlers. Note that disabling this may cause zombie processes!
  * `--globalOptions`: A JSON string with options to be passed to Highcharts.setOptions

**Server related options**

  * `--enableServer <1|0>`: Enable the server (done also when supplying --host)
  * `--host`: The hostname to run the server on.
  * `--port`: The port to listen for incoming requests on. Defaults to `7801`.
  * `--sslPath`: The path to the SSL key/certificate. Indirectly enables SSL support.
  * `--sslPort`: Port on which to run the HTTPS server. Defaults to `443`.
  * `--sslOnly`: Set to true to only serve over HTTPS
  * `--rateLimit`: Argument is the max requests allowed in one minute. Disabled by default.
  * `--skipKey` and `--skipToken`: Key/token pair that allows bypassing the rate limiter. On requests, these should be sent as such: `?key=<key>&access_token=<token>`.


*`-` and `--` can be used interchangeably when using the CLI.*

### Note about chart size

The `width` argument is mostly to set a zoom factor rather than an absolute width.

If you need to set the _height_ of the chart, it can be done in two ways:
- Set it in the chart config under [`chart.height`](https://api.highcharts.com/highcharts/chart.height)
- Set it in the chart config under [`exporting.sourceHeight`](https://api.highcharts.com/highcharts/exporting.sourceHeight)

The latter is prefered, as it lets you set a separate sizing when exporting and
when displaying the chart in your web page.

## Setup: Injecting the Highcharts dependency

In order to use the export server, Highcharts.js needs to be injected
into the export template.

This is largely an automatic process. When running `npm install` you will
be prompted to accept the license terms of Highcharts.js. Answering `yes` will
pull the version of your choosing from the Highcharts CDN and put them where they need to be.

However, if you need to do this manually you can run `node build.js`.


### Using In Automated Deployments

If you're deploying an application/service that depend on the export server
as a node module, you can set the environment variable `ACCEPT_HIGHCHARTS_LICENSE` to `YES`
on your server, and it will automatically agree to the licensing terms when running
`npm install`. You can also use `HIGHCHARTS_VERSION` and `HIGHCHARTS_USE_STYLED`
to bake with a specific Highcharts version, and to enable styled mode (requires
a Highcharts 5 license).

If you're using the export server as a dependency in your own app,
depending on your setup, it may be possible to set the env variable in your `package.json` file:

```
{
  "scripts": {
    "preinstall": "export ACCEPT_HIGHCHARTS_LICENSE=1"
  }
}
```

*Library fetches* 

When fetching the built Highcharts library, the default behaviour is to
fetch them from `code.highcharts.com`.

In automated deployments, it's also possible to fetch using NPM instead.

This is done by setting `HIGHCHARTS_VERSION` to `npm` in addition to setting
the afformentioned `ACCEPT_HIGHCHARTS_LICENSE` to `YES`.


#### Including Maps and/or Gantt support in automated deployments

Use the environment variables `HIGHCHARTS_USE_MAPS` and `HIGHCHARTS_USE_GANTT`
to enable support of either.

## Note about process.exit listeners

The export server attaches event listeners to process.exit. This is to
make sure that all the phantom processes are properly killed off when the
application is terminated.

Listeners are also attached to uncaught exceptions - if one appears,
the entire pool is killed, and the application terminated.

If you do not want this behavior, start the server with `--listenToProcessExits 0`.

Be aware though - if you disable this and you don't take great care to manually
kill the pool, your server _will_ bleed memory when the app is terminated.

## Note About Resources and the CLI

If `--resources` is not set, and a file `resources.json` exist in the folder
from which the cli tool was ran, it will use the `resources.json` file.

## HTTP Server

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
  * `async`: Get a download link instead of the file data.
  * `noDownload`: Bool, set to true to not send attachment headers on the response.
  * `asyncRendering`: Wait for the included scripts to call `highexp.done()` before rendering the chart.
  * `globalOptions`: A JSON object with options to be passed to `Highcharts.setOptions`.
  * `dataOptions`: Passed to `Highcharts.data(..)`
  * `customCode`: When `dataOptions` is supplied, this is a function to be called with the after applying the data options. Its only argument is the complete options object which will be passed to the Highcharts constructor on return.

Note that the `b64` option overrides the `async` option.

It responds to `application/json`, `multipart/form-data`, and URL encoded requests.

CORS is enabled for the server.

It's recommended to run the server using [forever](https://github.com/foreverjs/forever) unless running in a managed environment such as AWS Elastic Beanstalk.

### Running in Forever

The easiest way to run in forever is to clone the node export server repo, and run `forever start --killSignal SIGINT ./bin/cli.js --enableServer 1` in the project folder.

Remember to install forever first: `sudo npm install -g forever`.

Please see the forever documentation for additional options (such as log destination).

### AWS Lamba

See [this](https://github.com/highcharts/node-export-server/issues/81) issue.

### SSL

To enable ssl support, add `--sslPath <path to key/crt>` when running the server.
Note that the certificate files needs to be named as such:
  * `server.crt`
  * `server.key`

### Worker Count & Work Limit

The export server utilizes a pool of *workers*, where one worker is a
PhantomJS process responsible for converting charts. The pool size
can be set with the `--workers` switch, and should be tweaked to fit the hardware
on which you're running the server. It's recommended that you start with the default (8),
and work your way up (or down if 8 is too many for your setup, and things are unstable) gradually. The `tests/http/stress-test.js` script can be used
to test the server. It fires batches of 10 requests every 10ms, and expects the
server to be running on port 8081.

PhantomJS becomes somewhat unstable the more export requests it has historically handled.
To work around this, each of the workers has a maximum number of requests it can
handle before it restarts itself. This number is 60 by default, and can be tweaked with
`--workLimit`. As with `--workers`, this number should also be tweaked to fit your
use case.

### System Requirements

The system requirements largely depend on your use case.

It's largely CPU and memory bound, so when using in heavy-traffic situations,
it needs a fairly beefy server. It's recommended that the server has at least 1GB
of memory regardless of traffic, and more than one core.

### Installing Fonts

Does your Linux server not have Arial or Calibri? PhantomJS uses the system installed fonts to render pages. Therefore the Highcharts Export Server requires fonts to be properly installed on the system in order to use them to render charts.

Note that the default font-family config in Highcharts is `"Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, Helvetica, sans-serif"`.

Fonts are installed differently depending on your system. Please follow the below guides for font installation on most common systems.

#### OS X
Install your desired fonts with the Font Book app, or place it in /Library/Fonts/ (system) or ~/Library/Fonts/ (user)

#### Linux
Copy or move the TTF file to the `/usr/share/fonts/truetype` (may require sudo privileges):
```
mkdir -p /usr/share/fonts/truetype
cp yourFont.ttf /usr/share/fonts/truetype/
fc-cache -fv
```

#### Windows
Copy or move the TTF file to `C:\Windows\Fonts\`:
```
copy yourFont.ttf C:\Windows\Fonts\yourFont.ttf
```
### Google fonts

If you need Google Fonts in your custom installation, they can be had here:
https://github.com/google/fonts

Download them, and follow the above instructions for your OS.

## Server Test

Run the below in a terminal after running `highcharts-export-server --enableServer 1`.

    # Generate a chart and save it to mychart.png
    curl -H "Content-Type: application/json" -X POST -d '{"infile":{"title": {"text": "Steep Chart"}, "xAxis": {"categories": ["Jan", "Feb", "Mar"]}, "series": [{"data": [29.9, 71.5, 106.4]}]}}' 127.0.0.1:7801 -o mychart.png

## Using as a Node.js Module

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

    //Set up a pool of PhantomJS workers
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


### Node.js API Reference

**highcharts-export-server module**

**Functions**

  * `log(level, ...)`: log something. Level is a number from 1-4. Args are joined by whitespace to form the message.
  * `logLevel(level)`: set the current log level: `0`: disabled, `1`: errors, `2`: warnings, `3`: notices, `4`: verbose
  * `enableFileLogging(path, name)`: enable logging to file. `path` is the path to log to, `name` is the filename to log to
  * `export(exportOptions, fn)`: do an export. `exportOptions` uses the same attribute names as the CLI switch names. `fn` is called when the export is completed, with an object as the second argument containing the the filename attribute.
  * `startServer(port, sslPort, sslPath)`: start an http server on the given port. `sslPath` is the path to the server key/certificate (must be named server.key/server.crt)
  * `server` - the server instance
    * `enableRateLimiting(options)` - enable rate limiting on the POST path
      * `max` - the maximum amount of requests before rate limiting kicks in
      * `window` - the time window in minutes for rate limiting. Example: setting `window` to `1` and `max` to `30` will allow a maximum of 30 requests within one minute.
      * `delay` - the amount to delay each successive request before hitting the max
      * `trustProxy` - set this to true if behind a load balancer
      * `skipKey`/`skipToken` - key/token pair that allows bypassing the rate limiter. On requests, these should be sent as such: `?key=<key>&access_token=<token>`.
    * `app()` - returns the express app
    * `express()` - return the express module instance
    * `useFilter(when, fn)` - attach a filter to the POST route. Returning false in the callback will terminate the request.
      * `when` - either `beforeRequest` or `afterRequest`
      * `fn` - the function to call
        * `req` - the request object
        * `res` - the result object
        * `data` - the request data
        * `id` - the request ID
        * `uniqueid` - the unique id for the request (used for temporary file names)
  * `initPool(config)`: init the phantom pool - must be done prior to exporting. `config` is an object as such:
    * `maxWorkers` (default 25) - max count of worker processes
    * `initialWorkers` (default 5) - initial worker process count
    * `workLimit` (default 50) - how many task can be performed by a worker process before it's automatically restarted
    * `queueSize` (default 5) - how many request can be stored in overflow count when there are not enough workers to handle all requests
    * `timeoutThreshold` (default 3500) - the maximum allowed time for each export job execution, in milliseconds. If a worker has been executing a job for longer than this period, it will be restarted
  * `killPool()`: kill the phantom processes

## Using Ajax in Injected Resources

If you need to perform Ajax requests inside one of the resource scripts,
set `asyncRendering` to true, and call `highexp.done()` in the Ajax return to process the chart.

Example:

    {
      asyncRendering: true,
      resources: {
        files: 'myAjaxScript.js'
      }
    }

myAjaxScript.js:

    jQuery.ajax({
      url: 'example.com',
      success: function (data) {
        ...
        highexp.done();
      },
      error: function () {
        highexp.done();
      }
    });

If the Ajax call doesn't call `highexp.done()` within 60 seconds, the
rendering will time out.

## Performance Notice

In cases of batch exports, it's faster to use the HTTP server than the CLI.
This is due to the overhead of starting PhantomJS for each job when using the CLI.

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

## License

[MIT](LICENSE).
