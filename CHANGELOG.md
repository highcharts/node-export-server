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
