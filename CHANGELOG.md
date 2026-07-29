# 6.0.0

_Breaking Changes:_

- Updated jsdom from 24 to 30, used for sanitizing incoming SVGs. Jest was updated from 29 to 30 alongside it, as jsdom 30 pulls in a dependency that Jest 29 cannot load.
- Raised the minimum supported Node.js version to `^22.22.2 || ^24.15.0 || >=26.0.0`. Node.js 18 and 20 have both reached end of life, and the range mirrors what the dependencies in this release support. Node.js 24 is the recommended target, and both 22 and 24 are tested. Note that the odd-numbered Node.js 25 line is deliberately excluded, as it is not supported by all of the dependencies.
- Changed how long idle keep-alive connections are held open, from the Node default of 5 seconds to 65 seconds. Measured, the server was closing idle connections after about 6 seconds while a proxy or load balancer in front of it typically holds them for 60, and the side with the shorter timeout closing first is what produces sporadic gateway errors: the proxy does not know the connection has gone and sends a request into it. Configurable, see `keepAliveTimeout` below.
- Exports now queue only up to a bounded limit, and requests arriving beyond it are refused instead of being queued. Previously the queue was unbounded, so a saturated server accepted far more work than it could complete, held each waiting request's parsed body in memory, and then failed a large share of them once they exceeded the acquire timeout. With default pool settings the limit is 32, and refusals are now returned in about half a second rather than after a five second wait. See `queueLimit` and `queueRejectDelay` below for tuning.

_Fixes:_

- Fixed an issue where the server never recovered if the browser process died, for example when killed by an out of memory reaper. The browser was launched once at startup and the guard preventing a second launch could never be cleared, so every export from that point failed while the pool continued to report healthy workers. The browser is now relaunched when it is found to be missing, and the workers holding pages from the dead browser are recognised as stale and replaced. This is detected by tracking which browser a worker was created against, because a page belonging to a browser that no longer exists still reports itself as open and so cannot be asked whether it is usable.
- Ensured that a worker's page has finished being cleared before the worker is handed to the next export. The clearing was previously started when the worker was released but never awaited, so it overlapped the following export whenever one was already waiting for a worker. A page that cannot be cleared now recycles its worker instead of being exported onto.
- Fixed a resource leak where a browser page was left open if configuring it failed, for example when injecting the Highcharts scripts did not succeed. As the pool retries worker creation on an interval, a sustained failure leaked a browser page on every attempt until the browser ran out of memory.
- Fixed an issue where an export whose client had already disconnected still occupied a place in the queue and then a worker, producing a chart that nobody would receive. Such work is now discarded before it takes a worker. Note that an export already being rendered when its client leaves still runs to completion, as the underlying browser operations cannot be cancelled.
- Fixed the detection of a client disconnecting. Only a socket closing with an error was treated as an abandoned request, so a clean disconnect, such as a proxy idle timeout or a caller cancelling, was not detected at all.
- Removed a call that stripped every `close` listener from the request socket, including those belonging to Node.js and Express.
- Fixed the reported export success ratio, which counted exports abandoned by their client as failures. A server whose callers were timing out therefore reported itself as failing when nothing had gone wrong on its side. Abandoned exports are now excluded from the calculation, and from the moving average.
- Fixed a rasterization timeout leaking the page it timed out on. The worker was marked for recycling by discarding its page reference, but the pool only closes a page it can still see, so the page was never closed and its renderer process stayed for the lifetime of the browser. With one process per tab, every timeout leaked one, and the leaked processes then took CPU from the exports still running, causing more timeouts. The worker is now flagged instead, so the page is closed when the worker is recycled.
- Fixed the browser process being able to outlive the call that closes it. Closing does not guarantee that the process has ended, and the launch options deliberately leave process signals unhandled, so nothing cleaned up afterwards. A surviving process keeps the lock Chrome holds on its user data directory, which then prevents any later browser from starting at all. The process is now confirmed to have exited, and killed if it has not.
- Fixed the rasterization timeout keeping its timer alive after a successful image export. The timer was left to expire on its own, retaining itself and everything its callback referenced for the remainder of the timeout on every export.
- Fixed the shutdown sequence cutting off exports that were still being served. The three cleanup steps were started at once, and the one that closes the HTTP servers was not awaitable at all, so the process exited as soon as the worker pool had been destroyed. Restarts, deployments and scale-in events therefore dropped whatever was in flight. Servers are now closed first, which stops new work arriving and waits for the requests already being served, and only then is the pool taken away. A configurable drain timeout stops a request that never completes from holding the shutdown open, and idle keep-alive connections are ended immediately rather than being waited on.
- Ensured error responses can never carry a status outside the 1xx to 4xx range. The status of an error is not always set locally, as it is carried up from wrapped errors, and those include errors from outbound HTTP requests which can hold any status a remote returned. Anything outside the range is now answered as 400 and logged. Additionally, an error raised after the response has already begun now ends the response instead of being passed on, which previously allowed the framework's own handler to answer in its place.

_New Features:_

- Added the `POOL_QUEUE_LIMIT`/`--queueLimit`/`queueLimit` option, capping how many exports may wait for a worker, and defaulting to four times `maxWorkers`. Requests arriving beyond the limit are refused before their body is parsed, so a refused request costs almost nothing. The rationale is that export throughput does not improve past the pool size, so queueing beyond it adds latency and memory use without adding capacity. Raise it to accept deeper queues at the cost of higher latency under load.
- Added the `POOL_QUEUE_REJECT_DELAY`/`--queueRejectDelay`/`queueRejectDelay` option, defaulting to 500 milliseconds, which is how long the server waits before answering a request it is refusing for capacity. This is deliberate backpressure. Answering instantly lets clients that retry immediately raise the request rate by orders of magnitude, at which point the server spends its whole event loop refusing requests and starves the exports already in progress. The acquire timeout used to provide this throttling as a side effect of making clients wait; bounding the queue removes that, so the delay restores it explicitly and far more cheaply, holding only a socket rather than a parsed body and a queue slot. Set it to 0 to answer immediately, which is only advisable when something upstream is limiting the request rate.
- Added `browserConnected` and `consecutiveCreateFailures` to the `/health` response, reporting whether a browser is currently available and how many worker creations have failed in a row. Between them these distinguish a server that has lost its browser from one that has a browser but cannot make pages with it, which previously looked the same from outside. Existing properties are unchanged.
- Added `abandonedExports` and `rejectedForCapacity` counters to the `/health` response, reporting exports discarded because their client disconnected and requests refused because the queue was full. Both were previously indistinguishable from ordinary failures. Existing properties are unchanged.
- Added an `errorCode` property to error responses, so that a request refused because the server was busy can be told apart from one refused because it was malformed. Both are reported with the same status code, which previously left the message text as the only way to distinguish them. The codes are `EXPORT_INVALID_REQUEST`, `EXPORT_QUEUE_FULL`, `EXPORT_ACQUIRE_TIMEOUT`, `EXPORT_RASTERIZATION_TIMEOUT` and `EXPORT_FAILED`, and may be relied upon by callers. Status codes and the rest of the response body are unchanged, and the property is absent on errors that carry no code.
- Added the `OTHER_SHUTDOWN_DRAIN_TIMEOUT`/`--shutdownDrainTimeout`/`shutdownDrainTimeout` option, defaulting to 30 seconds, bounding how long a shutdown lets requests already being served finish. Set it above the deregistration delay of anything routing traffic to the server, so that traffic has stopped arriving before the server stops answering.
- Added the `SERVER_KEEP_ALIVE_TIMEOUT`/`--keepAliveTimeout`/`keepAliveTimeout` option, defaulting to 65 seconds, controlling how long an idle keep-alive connection is held open. `headersTimeout` is kept 5 seconds above it automatically. Deployments with nothing in front of the server may wish to lower it.
- Added the `PUPPETEER_LAUNCH_RETRY_WINDOW`/`--launchRetryWindow`/`launchRetryWindow` option, defaulting to 30 seconds, bounding how long a browser launch is retried before it is reported as failed. Keep it below the time an orchestrator waits before replacing an instance that has not become healthy, so that a browser which cannot start is reported rather than retried past the point anyone is still listening.

_Enhancements:_

- Reduced the time taken to report a browser that cannot be launched, from around 100 seconds of fixed four second retries to a configurable window defaulting to 30 seconds, using growing delays with jitter so that instances restarting together do not retry in lockstep. The retry loop also no longer calls itself recursively, so a long run of failures no longer nests the stack once per attempt.
- Reduced the cost of sanitizing incoming SVGs by around ten times, from 2.84ms to 0.27ms per call, by reusing the DOM and purifier between requests rather than building them on every export. As sanitizing is synchronous, that time was spent blocking the event loop, so it delayed every other request in flight rather than only the one being sanitized.

# 5.1.0

_New Features:_

- Added the `useNpm` option to load Highcharts scripts from the NPM package instead of the CDN.

# 5.0.0

_Breaking Changes:_

- Removed `xlink:href` from incoming SVGs in preperation for an upcoming Puppeteer update that will remove this option. To allow this attribute, set `OTHER_ALLOW_XLINK_HREF` to `true`.
- Changed the upload file size limit to 3MB, and exposed settings for configuring it (`SERVER_MAX_UPLOAD_SIZE`/`--maxUploadSize`/`maxUploadSize`). The rational behind this change is that in testing that seems like the most balanced limit along with other default values for pool sizing, timeouts and such to avoid attempting to process requests that would likely end up timing out due to its size.

_Fixes:_

- Fixed an issue where clip size for PDFs would on rare occation be invalid, causing the export to fail.
- Fixed an issue where the chart constructor was sometimes incorrectly set, causing the export to fail.
- Fixed an issue that would sometimes cause a crash due to fail due to `Accept-Ranges` headers.
- Fixed the warning message when the the default `resources.json` file is not found.
- Fixed the problem with the lack of the `instr` value, when the `options` is set instead.
- Added referrers to CDN cache fetches on first startup/install.
- Wrapped the `clearPageResources` function in a try-catch to handle potential page resources errors.
- Secured against errors caused by `dev-tools` protocol data size limitations.
- Corrected the `Node.js Module` example in the README.

_New Features:_

- Added proxy authentication [(#631)](https://github.com/highcharts/node-export-server/issues/631).
- Made the temporary Puppeteer directory (`PUPPETEER_TEMP_DIR`) (till now, `'./tmp'`) configurable by the user [(#567)](https://github.com/highcharts/node-export-server/issues/567).

# 4.0.2

_Hotfix_:

- Fixed missing 'msg' and 'public' bundle in 4.0.1 on NPM.

_Fixes:_

- Made chart userOptions available within `customCode` as variable `options` [(#551)](https://github.com/highcharts/node-export-server/issues/551).

# 4.0.1

_Hotfix_:

- Fixed missing 'dist' bundle in 4.0.0 on NPM.

# 4.0.0

_Breaking Changes:_

- Reordered the `error` and `info` arguments in the callback of the `startExport` function.
- Renamed the environment variables for a better representation of their roles (refer to all envs in the README's `Environment Variables` section).
- Renamed the `HIGHCHARTS_MODULES` environment variable to `HIGHCHARTS_MODULE_SCRIPTS`.
- Renamed the `HIGHCHARTS_INDICATORS` environment variables to `HIGHCHARTS_INDICATOR_SCRIPTS`.
- Renamed the `POOL_LISTEN_TO_PROCESS_EXITS` environment variable to `OTHER_LISTEN_TO_PROCESS_EXITS`.
- Renamed the `customCode` section of the options config to the `customLogic` in order to avoid confusion with the existing `customCode` property within.
- Renamed the `scripts` property in the `highcharts` section of the options config to the `customScripts`.
- Renamed the `initPool` function to `initExport` in the main module.
- Renamed the `init` function to `initPool` in the pool module.

_New Features:_

- Implemented debug mode, including new environment variables, a config section, 'console' event listener, and npm script for debugging the headful Puppeteer browser.
- Added the `HIGHCHARTS_CACHE_PATH` option available through `.env` to set a custom directory for the fetched files.
- Added a moving average indicator for the exporting success rate ratio.

_Enhancements:_

- Improved server-related error handling by introducing new centralized error middlewares.
- Improved overall error handling by adding a main try-catch block to correctly capture and log errors occurring throughout the code.
- Introduced two new types of custom errors: `ExportError` for functionality-related errors and `HttpError` for server-related errors.
- Introduced a new error logging mechanism with stack tracing using new function called `logWithStack`.
- Expanded some error logs with request IDs.
- Set headless mode to 'shell' for better performance, utilizing an older yet more efficient headless instance.
- Set the `defaultViewport` to null and optimized code to trigger `setViewport` only once, reducing performance impact during export.
- Removed unnecessary initial page on browser launch using `waitForInitialPage` and the `--no-startup-window` Chrome flag.
- Revised Chromium flags sent to the browser, now located in the args array within the config file.
- Optimized code by reducing evaluate function calls to enhance performance and minimize jumping between NodeJS and browser processes.
- Optimized and moved chart creation initialization scripts from the HTML template to a separate module named `highcharts.js`.
- Optimized the `clearPage` function to ensure content cleaning is only performed once, during resource release.
- Introduced the `hardResetPage` option for resetting the page's content (including Highcharts scripts) each time the page is released to the pool (defaulting to `false`).
- Introduced the `browserShellMode` option for controlling the mode in which the browser runs (new or old, `shell` mode).
- Optimized creating and acquiring pages from the pool.
- Optimized adding and releasing additional JS and CSS resources.
- Made corrections for gracefully shutting down resources, including running servers, ongoing intervals, browser instance, created pages, and workers pool.
- Updated `createImage` and `createPDF` functions with faster execution options including `optimizeForSpeed` and `quality`.
- Set `waitUntil` to 'domcontentloaded' for `setContent` and `goto` functions to improve performance.
- Replaced browser's deprecated `isConnected()` with the `connected` property.
- Added information on all available pool resources.
- Numerous minor improvements for performance and stability.
- Moved the `listenToProcessExits` from the `pool` to the `other` section of the options.
- Replaced the temporary benchmark module with a simpler server benchmark for evaluating export time.
- Removed unnecessary separate `body-parser` package (already implemented in Express v4.16+).
- Added parsing of envs based on `zod` package.
- Added unit tests for certain parts of the code.
- Added the `shutdownCleanUp` function for resource release (ending intervals, closing servers, destroying the pool and browser) on shutdown. It will be called in the process exit handlers.
- Added new environment variables (`HIGHCHARTS_ADMIN_TOKEN`, `SERVER_BENCHMARKING`, and `OTHER_NODE_ENV`) to the `.env.sample` file, along with their descriptions in the README.
- Added a new section to the server configuration options, `proxy`, along with corresponding environment variables.
- Added several new functions to the `highcharts-export-server` module, including `initPool`, `logWithStack`, `setLogLevel`, `enableFileLogging`, `manualConfig`, `printLogo`, and `printUsage`.
- Added a new `initLogging` function where the `setLogLevel` and `enableFileLogging` logic are consolidated into one place.
- Added a new utility function, `isObjectEmpty`.
- Added a new logging level (`5`) for benchmarking logs.
- Added legacy names of options to the `defaultConfig` and `mapToNewConfig` function in order to support the old, PhantomJS-based structure of options.
- Added a new process event handler for the `SIGHUP` signal.
- Added `mapChart` and `ganttChart` constructors in the exporting UI [(#503)](https://github.com/highcharts/node-export-server/issues/503).
- Added the series-on-point module [(#532)](https://github.com/highcharts/node-export-server/issues/532).
- Updates were made to the `config.js` file.
- Updated the `killPool` function.
- The `uncaughtException` handler now kills the pool, browser, and terminates the process with exit code 1, when enabled.
- The browser instance should be correctly closed now when an error occurs during pool creation.
- Corrected error handling and response sending in the `/change_hc_version.js` route.
- Corrected the `handleResources` function.
- Corrected samples, test scenarios, and test runners.
- Bumped versions of most packages, with an updating deprecated `Puppeteer` from `v21.1.1` to latest.
- Added missing Highcharts modules to stay up-to-date with the latest updates.
- Added missing JSDoc descriptions.
- Revamped all log messages, error messages, prompt messages, and info for improved clarity of information.
- README has been revised and corrected by incorporating additional information, improving descriptions, adding missing details, including new API information, and expanding with new sections such as `Debugging`, `Available Endpoints`, `Examples`, and a `Note about Deprecated Options`.
- Updated Wiki pages with a new `Samples` section.

_Fixes:_

- Fixed `multer` related error: 'Field value too long'.
- Fixed the SSL handshake error [(#307)](https://github.com/highcharts/node-export-server/issues/307).
- Fixed missing background color transparency [(#492)](https://github.com/highcharts/node-export-server/issues/492).
- Fixed missing `foreignObject` elements issue.
- Fixed type compatibility issues in the `pairArgumentValue` function, arising from CLI string arguments.
- Fixed the 'httpsProxyAgent is not a constructor' issue with the `https-proxy-agent` module.
- Fixed the issue of being unable to run both HTTP and HTTPS servers simultaneously.
- Fixed the issue with the `multiselect` type of values in prompt functionality triggered by the `--createConfig` option.
- Fixed the error handling in the `postWork` function which resulted in doubled errors.
- Fixed the deprecated description of the pool from the `generic-pool` to `tarn` notation, triggered by the `getPoolInfo` and `getPoolInfoJSON` functions.
- Fixed the issue of not gracefully terminating the process when an error occurs and a pool or browser already exists.
- Fixed the 'Could not clear the content of the page... - Target closed' error.
- Made minor corrections to ESLint and Prettier configuration.
- Other minor stability, linting and text corrections have been implemented.

# 3.1.1

- Version number is now correct in splash and `/health` when running as a node module.
- Fixed an issue with setting `minWorkers` and `maxWorkers` as CLI arguments.
- Fixed issues with page resets between exports causing exceptions.
- Fixed an issue with width settings causing bad exports if set to a percentage or a `px` suffixed width.
- Fixed an issue with SVG exports in the UI.

# 3.1.0

- Fixed an issue with SVG base 64 exports.
- Fixed several bugs with the worker pool.
- Changed name of the `initialWorkers` option to the `minWorkers`.
- Fixed hanging the server on start when initial resources (pages) couldn't be created.
- Fixed clearing page after the export.
- Removed the `queueSize` option, which doesn't have an equivalent in `tarn` resource pool.
- Removed the `timeoutThreshold` option and added the `idleTimeout` option in its place.
- Removed the `reaper` options, as tarn doesn't allow to enable/disable idle resources checking.
- Added `createTimeout` and `destroyTimeout` options for the resource pool.
- Added the `reaperInterval` option to set the interval for checking idle resources to destroy.
- Added the `createRetryInterval` option to set how long to idle after failed resource creation before trying again.
- Added the `rasterizationTimeout` option for setting the wait time for an image to be created.
- Updated the `.env.sample` file with new environment variables corresponding to above options.
- Updated the README file.
- Other small fixes.

# 3.0.5

- Fixed an issue with transparent backgrounds in PNG exports [(#463)](https://github.com/highcharts/node-export-server/issues/463).
- Fixed an issue with missing `filename` property [(#20370)](https://github.com/highcharts/highcharts/issues/20370).

# 3.0.4

- Fixed and issue with reading `resources.json` during exports.

# 3.0.3

- Fixed an issue with height and width for CSS [(#419)](https://github.com/highcharts/node-export-server/issues/419).
- Fixed `globalOptions` [(#434)](https://github.com/highcharts/node-export-server/issues/434).
- Other smaller fixes.

# 3.0.2

- Changed the priority of loading options to: config -> custom JSON -> envs -> CLI.
- Corrected the The unhandledRejection error, message: Protocol error: Connection closed. Most likely the page has been closed, an error related to closing the browser earlier than closing each of an active page.
- Refactored the way options are set (the setOptions function).
- Corrected straight inject with JS functions in chart's options (e.g. formatter), when the allowCodeExecution is set to true.
- Organized code into two separate functions (singleExport and batchExport).
- Corrected reseting global options for Highcharts between each export.
- Corrections for the linter.
- Samples and tests corrections.
- Added sample for the loadConfig option.
- Updated README.
- Other small fixes.

# 3.0.1

- Added missing shebang in `cli.js`.

# 3.0.0

_Fixes and enhancements:_

- Replaced PhantomJS with Puppeteer.
- Updated the config handling system to optionally load JSON files, and improved environment var loading.
- Rewrote the HC caching system: it's now easier to include custom modules/dependency lists in your own deployments.
- The install step no longer requires interaction when installing.
- Replaced the custom worker pool system with `tarn`.
- Error messages are now sent back to the client instead of being displayed in rasterized output.
- Updated NPM dependencies, removed deprecated and uneccessary dependencies.
- Lots of smaller bugfixes and tweaks.
- Transitioned our public server (export.highcharts.com) from HTTP to HTTPS.

_New features:_

- Added `/health` route to server to display basic server information.
- Added a UI served on `/` to perform exports from JSON configurations in browser.

# 2.1.0

This version is not backwards compatible out of the box!

_Breaking changes:_

- Log destinations must now exist before starting file logging
- When running in server mode, the following options are now disabled by default:
  - `callback`
  - `resources`
  - `customCode`

Disabled options can be enabled by adding the `--allowCodeExecution` flag when
starting the server. Using this flag is not recommended, and should not be
done unless the server is sandboxed and not reachable on the public internet.

_Changelog:_

- Added the `--allowCodeExecution` flag which is now required to be set when exporting pure JavaScript, using additional external resources, or using callback when running in server mode.
- Removed the `mkdirp` dependency.
- SVG exporting will now block JavaScript entirely.
- Added the `navigationLocked` flag to the Phantom page, which blocks e.g. `<iframe>` and page redirects.

# 2.0.30

- Fixed compatibility with `mkdirp >=v1.0`.

# 2.0.29

- Added polyfill for `DOMParser` to accommodate Highcharts 9.0.
- Updated some dependencies.

# 2.0.28

- Fixed UUID and mkdirp versions in package.json.

# 2.0.27

- Added `venn` module to build script.

# 2.0.26

- Added `coloraxis` module to build script.

# 2.0.25

- Fixed issue with optional scripts when using env variables to accept prompts.

# 2.0.23

- Fixed issue with optional dependencies when installing headless.

# 2.0.20-2.0.22

- Fixed pathing issue with NPM build when installing globally.

# 2.0.19

- Added support for fetching sources through `npm` for automated builds. To use, set `HIGHCHARTS_CDN` to `npm`.
- Added support for `pareto` charts.
- Fixed issue with script concatination causing exporting errors when including certain modules.

# 2.0.18

- Added HIGHCHARTS_CDN variable support for build process.

# 2.0.17

- Added support for 7.1 charts.
- Updated dependencies.

# 2.0.16

- Added support for bullet charts.
- Added support for Gantt charts.
- Added configuration option for chart generation timeout (`--timeoutThreshold`).
- Gracefull failing of 404 map collections now working properly.
- Increased max configuration size from 5MB to 50MB.
- Updated express version.
- Updated docs.

# 2.0.15

- Added `queueSize` option to `initPool` to set the request overfow queue size.
- Added option to supply `cdnURL` to build script [(#133)](https://github.com/highcharts/node-export-server/issues/133).
- Added `;` between included scripts. Fixes map collections [(#128)](https://github.com/highcharts/node-export-server/issues/128).
- Added `--skipKey` and `--skipToken` CLI options to configure the rate limiter.
- Added `--queueSize` switch to the CLI options to set the overflow queue size.
- Fixed issue with silent installs and default values.

# 2.0.14

- Fixed issue with CDN pull failing when using Highcharts < 6.0.

# 2.0.13

- Fixed an issue that caused a comma to appear when exporting charts.

# 2.0.12

- Build.js now uses cached respones when building styled mode to speed things up.
- `historgram-bellcurve` is now included by default.
- Added optional inclusion system to build.js.
  - Will now prompt for inclusion of `wordcloud` and `annotations`.

# 2.0.11

- Fixed another issue with `globalOptions` in CLI/Server mode.

# 2.0.10

- Fixed issue with injecting some resources when they weren't strings (e.g. `globalOptions`).

# 2.0.9

- Added build config for including moment.js support.

# 2.0.8

- Fixed `tmpdir` when starting in server mode.

# 2.0.7

- Now including sunburst/xrange/streamgraph/tilemap when baking with a supported version.
- Added package-lock.json.

# 2.0.6

- Fixed issue potentially causing SVG exports to hang.

# 2.0.5

- Increased timeout for rendering by 1 second.
- Fixed port numbers for stress test.

# 2.0.4

- Fixed bug causing unpredictable export results if one or more exported.
  charts contain bundled images.

# 2.0.3

- Server will now wait for bundled images to load.

# 2.0.2

- Server now respects `host` option.
- Added promise sample/test for batch export.

# 2.0.1

- Fixed `tmpdir` when running as server.

# 2.0.0

- Fixed Phantom cleanup: instead of reaping every 2.5s, workers are checked for timeout when other work is posted.
- Added additional error handlers to:
  - `hhtp(s)Server`, `process`.
- Worker busy check before restarting.
- Now checking if the client connection is still open before sending returns.
- Changed return codes for error conditions.
- Misc stability fixes.

# 1.0.15

- Fixed an issue with SVG export.

# 1.0.12

- Fixed an issue with `--batch` exporting.

# 1.0.11

- Fixed an issue with `themeOptions` when using CLI mode.
- Added `listenToProcessExits` option to pool.init(..).
- Exposed `listenToProcessExits` in CLI mode.
- Fixed issue with `--callback` when the callback was a file.

# 1.0.10

- Fixed an issue with batch exporting.
- Fixed `uuid` dependency version (thanks to @tonylukasavage).

# 1.0.9

- Set minimum node version to 5.10.0.

# 1.0.8

- Fixed `phantomjs-prebuilt` dependency version.
