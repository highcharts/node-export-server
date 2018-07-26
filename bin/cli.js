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

const main = require('./../lib/index');
const args = process.argv;
const fs = require('fs');
const async = require('async');
const pkg = require('../package.json');

let logoPrinted = false;

var optionsMeta = {},
    options = {}
;

////////////////////////////////////////////////////////////////////////////////

function addOption(option, def, help) {
    options[option] = def;
    optionsMeta[option] = {
        default: def,
        help: help
    };
}

//No lib for this one!
function rpad(str, pad) {
    pad = pad || 20;
    if (str.length < pad) {
        for (var i = str.length; i < pad; i++) {
            str = str + '.';
        }
    }
    return str;
}

////////////////////////////////////////////////////////////////////////////////

addOption('infile', false, '<string>: the input file');
addOption('outfile', false, '<string>: the output filename');
addOption('instr', false, '<string>: an input chart JSON file. Overrides --infile.');
addOption('options', false, '<string>: alias for instr. An input chart JSON file. Overrides --infile.');
addOption('styledMode', false, '<1|0>: set to 1 to used the styled mode Highcharts libraries');
addOption('globalOptions', false, '<string>: A JSON string with options to be passed to Highcharts.setOptions');

addOption('listenToProcessExits', true, '<1|0>: set to 0 to skip attaching process.exit handlers');

addOption('allowFileResources', true, '<1|0>: allow injecting resources from the filesystem. Has no effect when running as a server.');

addOption('type', 'png', '<string>: the format to export to');
addOption('scale', 1, '<number>: the scale of the exported chart');
addOption('resources', false, '<string>: additional resource');
addOption('callback', false, '<string>: JavaScript file with code to run on construction');
addOption('width', false, '<number>: the width of the exported chart, overrides chart settings');
addOption('constr', 'Chart', '<string>: the constructor to use. Either Chart or Stock.');
addOption('tmpdir', 'tmp/', '<string>: path to temporary files');

addOption('enableServer', false, '<1|0>: start a server on 0.0.0.0');
addOption('sslOnly', false, '<bool>: set this to true to only serve over HTTPS');
addOption('host', false, '<string>: start a server listening on the supplied hostname');
addOption('port', 7801, '<number>: server port');
addOption('rateLimit', false, '<number>: Argument is the max requests allowed in one minute. Disabled by default.');
addOption('skipKey', false, '<number|string>: Option to be passed as an argument of enableRateLimmiter function. It allows bypassing the rate limmiter and should be provided with skipToken argument.');
addOption('skipToken', false, '<number|string>: Option to be passed as an argument of enableRateLimmiter function. It allows bypassing the rate limmiter. and should be provided with skipKey argument.');

addOption('logLevel', 2, '<number>: the log level. 0 = silent, 4 = verbose.');
addOption('workers', false, '<number>: the number of workers to spawn');
addOption('workLimit', 60, '<number>: the pieces of work that can be performed before restarting a phantom process');
addOption('queueSize', 5, '<number>: the size of the request overfow queue');

addOption('logDest', false, '<string>: path to log files. will also enable file logging.');
addOption('logFile', 'highcharts-export-server.log', '<string>: filename to log to.');

addOption('batch', false, '<string>: start a batch job. string containing input/output pairs: "in=out;in=out;.."');
addOption('sslPath', false, '<string>: Set the path where to find the SSL certificate/key');
addOption('sslPort', 443, '<number>: Port on which to run the SSL server');

addOption('fromFile', false, '<string>: load all options from file');

addOption('nologo', false, '<boolean>: skip printing the big logo on startup');

////////////////////////////////////////////////////////////////////////////////

function printLogo() {
  if (options.nologo) {
    console.log(`starting highcharts export server v${pkg.version}...`);
    return;
  }

  if (logoPrinted) return;

  console.log(
    fs.readFileSync(
      __dirname + '/../msg/startup.msg'
    ).toString().bold.yellow,
    `
                                                                  v${pkg.version}`
  );

  logoPrinted = true;
}

function printUsage() {
    printLogo();
    console.log('Usage:'.bold);

    Object.keys(optionsMeta).forEach(function (option) {
        console.log('  ' + rpad('-' + option),
                    optionsMeta[option].help,
                    ('default: ' +
                    optionsMeta[option].default).bold
        );
    });
}

//Print usage if no arguments supplied
if (args.length <= 2) {
    printUsage();
    return;
}

//Parse arguments
//We can't use a foreach because we're parsing pairs.
for (var i = 0; i < args.length; i++) {
    var option = args[i].replace(/\-/g, '');
    if (typeof options[option] !== 'undefined') {
        if (args[++i]) {
            options[option] = args[i] || options[option];
        } else {
            console.log(('Missing argument value for ' + option + '!').red, '\n');
            printUsage();
            return;
        }
    }
};

printLogo();

if (options.fromFile) {
    try {
        var old = options;
        options = JSON.parse(fs.readFileSync(options.fromFile, 'utf8'));

        Object.keys(old).forEach(function (key) {
            if (!options[key]) {
                options[key] = old[key];
            }
        });

    } catch (e) {
        console.log('unable to load options from file:', e);
        return;
    }
}

main.logLevel(options.logLevel);

if (options.logDest) {
    main.enableFileLogging(
        options.logDest,
        options.logFile || 'highcharts-export-server.log'
    );
}

if (options.enableServer || (options.host && options.host.length)) {

    main.initPool({
        listenToProcessExits: options.listenToProcessExits,
        initialWorkers: options.workers || 0,
        maxWorkers: options.workers || 4,
        workLimit: options.workLimit,
        queueSize: options.queueSize
    });

    if (options.rateLimit && options.rateLimit !== 0 && options.rateLimit !== false) {
        main.server.enableRateLimiting({
            max: options.rateLimit,
            skipKey: options.skipKey,
            skipToken: options.skipToken
        });
    }

    main.startServer(options.port,
                     options.sslPort,
                     options.sslPath,
                     function (srv) {

                     },
                     options.sslOnly,
                     options.tmpdir,
                     options.host
    );

} else {

    options.async = true;


    //Try to load resources from file.
    if (!options.resources) {
        try {
            options.resources = JSON.parse(
                fs.readFileSync('resources.json', 'utf8')
            );
        } catch (e) {}
    }

    if (options.batch) {
        main.initPool({
            listenToProcessExits: options.listenToProcessExits,
            initialWorkers: options.workers || 5,
            maxWorkers: options.workers || 25,
            workLimit: options.workLimit,
            queueSize: options.queueSize,
            reaper: false
        });

        var funs = [];

        options.batch = options.batch.split(';');
        options.batch.forEach(function (pair) {
            pair = pair.split('=');
            if (pair.length == 2) {
                funs.push(function (next) {
                    main.export({
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
                    }, function () {
                        next();
                    });
                });
            }
        });

        async.waterfall(funs, function () {
            main.killPool();
        });

    } else {

        options.infile = options.infile;
        options.instr = options.instr || options.options;

        main.initPool({
            listenToProcessExits: options.listenToProcessExits,
            initialWorkers: options.workers || 1,
            maxWorkers: options.workers || 1 ,
            queueSize: options.queueSize,
            reaper: false
        });

        main.export(options, function (err, data) {
            main.killPool();
        });
    }
}
