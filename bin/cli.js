#!/usr/bin/env node

/*
Highcharts Export Server

Copyright (c) 2016, Highsoft

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const { readFileSync } = require('fs');

const main = require('../lib/index');
const { initDefaultOptions, manualConfiguration } = require('../lib/config');
const { printLogo, printUsage, pairArgumentValue } = require('../lib/utils');

const { cli: configCli } = require('../lib/schemas/configCli.js');

const args = process.argv;

// Sets default values for server's options and returns them
let options = initDefaultOptions(configCli);

// Print initial logo or text
printLogo(options.other.nologo);

// Print the usage information if no arguments supplied
if (args.length <= 2) {
  return printUsage();
}

// Parse provided arguments
options = pairArgumentValue(options, args);

// In this case we want to prepare config manually
if (options.resources.config) {
  return manualConfiguration(options.resources.config);
}

// If all options correctly parsed
if (options) {
  // If the fromFile points correct JSON file with options, use it
  if (options.resources.fromFile) {
    try {
      // Save the old options
      const oldOptions = options;

      // Get options from the file
      options = JSON.parse(readFileSync(options.resources.fromFile, 'utf8'));
      /// TO DO: Correctly merge options from the custom JSON file
      Object.keys(oldOptions).forEach((key) => {
        if (!options[key]) {
          options[key] = oldOptions[key];
        }
      });
    } catch (error) {
      return console.log(
        `Unable to load options from the ${options.resources.fromFile} file: `,
        error
      );
    }
  }

  // Set the log level
  main.logLevel(options.logLevel);

  // Set the log file path and name
  if (options.logDest) {
    main.enableFileLogging(
      options.logDest,
      options.logFile || 'highcharts-export-server.log'
    );
  }

  if (options.enableServer || (options.host && options.host.length)) {
    main.initPool({
      listenToProcessExits: options.listenToProcessExits,
      initialWorkers: options.initialWorkers || 0,
      maxWorkers: options.workers || 4,
      workLimit: options.workLimit,
      queueSize: options.queueSize,
      configFile: options.config
    });

    if (
      options.rateLimit &&
      options.rateLimit !== 0 &&
      options.rateLimit !== false
    ) {
      main.server.enableRateLimiting({
        max: options.rateLimit,
        skipKey: options.skipKey,
        skipToken: options.skipToken
      });
    }

    main.startServer(
      options.port,
      options.sslPort,
      options.sslPath,
      function (srv) {},
      options.sslOnly,
      options.tmpdir,
      options.host,
      options.allowCodeExecution
    );
  } else {
    options.async = true;

    //Try to load resources from file.
    if (!options.resources) {
      try {
        options.resources = JSON.parse(readFileSync('resources.json', 'utf8'));
      } catch (e) {}
    }

    if (options.batch) {
      main.initPool({
        listenToProcessExits: options.listenToProcessExits,
        initialWorkers: options.initialWorkers || 5,
        maxWorkers: options.workers || 25,
        workLimit: options.workLimit,
        queueSize: options.queueSize,
        reaper: false,
        configFile: options.config
      });

      var funs = [];

      options.batch = options.batch.split(';');
      options.batch.forEach(function (pair) {
        pair = pair.split('=');
        if (pair.length == 2) {
          funs.push(function (next) {
            main.export(
              {
                allowCodeExecution: options.allowCodeExecution,
                infile: pair[0],
                outfile: pair[1],
                async: true,
                type: options.type || 'png',
                scale: options.scale,
                width: options.width,
                resources: options.resources,
                callback: options.callback,
                constr: options.constr,
                tmpdir: options.tmpdir,
                styledMode: options.styledMode,
                allowFileResources: options.allowFileResources,
                globalOptions: options.globalOptions
              },
              function () {
                next();
              }
            );
          });
        }
      });

      // @TODO: Convert to promises
      // async.waterfall(funs, function () {
      //   main.killPool();
      // });
    } else {
      options.infile = options.infile;
      options.instr = options.instr || options.options;

      main.initPool({
        listenToProcessExits: options.listenToProcessExits,
        initialWorkers: options.initialWorkers || 1,
        maxWorkers: options.workers || 1,
        queueSize: options.queueSize,
        reaper: false
      });

      main.export(options, function (err, data) {
        main.killPool();
      });
    }
  }
}
