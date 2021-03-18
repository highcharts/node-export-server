# Structure changes

- added `templates` folder which contains the templates loaded by Puppeteer to perform the export.
- temporarily disabled the CLI exports: needs to be converted to promises
- main exporting is now in `lib/export.js`
- now using the `generic_pool` package for pool management
- moved non-tests out of `tests/` and into `samples/` - these needs to be updated
- `lib/cache.js` replaces the build script: dependencies/modules etc. are now fetched before starting the server/CLI instead of as a build step. Cache is stored `.cache`, and is automatically checked against the loaded config and updated if needed. The prompt for installing is thus removed, as is the ACCEPT_HIGHCHARTS_LICENSE stuff. Instead a warning is printed during install that a license is required.
- The new config (`lib/config/js`) system will load environment vars through `dotenv`, or optionally, from a json file using the `--config` flag.
- Expanded the `/health` route to show info on running versions, average response times and so on
- With puppeteer, the era of having errors part of the returned image is over, and error handling in general is better
- refactored the server, it now lives in `lib/server/` and is spread across multiple files

## Breaking changes

- server start no longer accepts any arguments. use the config system prior to calling.

# Todo

- Go full `Promises` (with `async`/`await`)
- Implement `resources`, `globalOptions` and so on - right now it's super minimal
- Add support for using `npm` for building the cache in config.js
- README.md needs a major overhaul
- config system should be extended to support loading options normally supplied via. the CLI
- Need to add timeout to the chrome process
- cache system needs to be updated to handle different Highcharts versions
- the server and CLI needs to handle return from work with `{error: true, message: ...}`
