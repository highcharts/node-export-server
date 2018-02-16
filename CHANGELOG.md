# 2.0.8
  
  * Fixed `tmpdir` when starting in server mode

# 2.0.7

  * Now including sunburst/xrange/streamgraph/tilemap when baking with a  supported version
  * Added package-lock.json

# 2.0.6
  
  * Fixed issue potentially causing SVG exports to hang

# 2.0.5

  * Increased timeout for rendering by 1 second
  * Fixed port numbers for stress test

# 2.0.4
  
  * Fixed bug causing unpredictable export results if one or more exported
    charts contain bundled images

# 2.0.3

 * Server will now wait for bundled images to load

# 2.0.2
 
 * Server now respects `host` option
 * Added promise sample/test for batch export

# 2.0.1
  
  * Fixed `tmpdir` when running as server

# 2.0.0
  * Fixed Phantom cleanup: instead of reaping every 2.5s, workers are checked for timeout when other work is posted.
  * Added additional error handlers to
    * `hhtp(s)Server`, `process`
  * Worker busy check before restarting
  * Now checking if the client connection is still open before sending returns
  * Changed return codes for error conditions
  * Misc stability fixes

# 1.0.15
  * Fixed an issue with SVG export

# 1.0.12

  * Fixed an issue with `--batch` exporting
  
# 1.0.11

  * Fixed an issue with `themeOptions` when using CLI mode
  * Added `listenToProcessExits` option to pool.init(..)
  * Exposed `listenToProcessExits` in CLI mode
  * Fixed issue with `--callback` when the callback was a file

# 1.0.10

  * Fixed an issue with batch exporting
  * Fixed `uuid` dependency version (thanks to @tonylukasavage)

# 1.0.9
    
  * Set minimum node version to 5.10.0

# 1.0.8
 
 * Fixed `phantomjs-prebuilt` dependency version
