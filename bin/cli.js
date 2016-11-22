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

var optionsMeta = {},
    options = {}
;

////////////////////////////////////////////////////////////////////////////////

function addOption(option, def, help) {
    options[option] = def;
    optionsMeta[option] = {
        default: def,
        help
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

addOption('infile', false, 'the input file');
addOption('outfile', false, 'the output filename');
addOption('instr', false, 'an input chart JSON file. Overrides --infile.');
addOption('options', false, 'alias for instr. An input chart JSON file. Overrides --infile.');
addOption('styledMode', false, 'set to true to used the styled mode Highcharts libraries');

addOption('allowFileResources', true, 'allow injecting resources from the filesystem. Has no effect when running as a server.');

addOption('type', 'png', 'the format to export to');
addOption('scale', 1, 'the scale of the exported chart');
addOption('resources', false, 'additional resource');
addOption('callback', false, 'JavaScript file with code to run on construction');
addOption('width', false, 'the width of the exported chart, overrides chart settings');
addOption('constr', 'Chart', 'the constructor to use. Either Chart or Stock.');
addOption('tmpdir', 'tmp/', 'path to temporary files');

addOption('enableServer', false, 'start a server on 0.0.0.0');
addOption('host', '', 'start a server listening on the supplied hostname');
addOption('port', 7801, 'server port');
addOption('rateLimit', false, 'enable rate limiting. Argument is the max requests allowed in one minute');

addOption('logLevel', 2, 'the log level. 0 = silent, 4 = verbose.');
addOption('workers', false, 'the number of workers to spawn');

addOption('logDest', false, 'path to log files. will also enable file logging.');

addOption('batch', false, 'start a batch job. string containing input/output pairs: "in=out;in=out;.."');
addOption('sslPath', false, 'Set the path where to find the SSL certificate/key');

addOption('fromFile', false, 'load all options from file');

////////////////////////////////////////////////////////////////////////////////

console.log(fs.readFileSync(__dirname + '/../msg/startup.msg').toString().bold.yellow);

//Print usage if no arguments supplied
if (args.length <= 2) {
    console.log('Usage:'.bold);
    
    Object.keys(optionsMeta).forEach(function (option) {
        console.log('  ' + rpad('-' + option), 
                    optionsMeta[option].help, 
                    'default:', 
                    optionsMeta[option].default
        );
    });

    return;
}

//Parse arguments
//We can't use a foreach because we're parsing pairs.
for (var i = 0; i < args.length; i++) {
    var option = args[i].replace(/\-/g, '');

    if (typeof options[option] !== 'undefined') {
        options[option] = args[++i] || options[option];
    }
};

main.logLevel(options.logLevel);

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

if (options.logDest) {
    main.enableFileLogging(options.logDest, 'higcharts-export-server');
}

if (options.enableServer || (options.host && options.host.length)) {

    main.initPool({
        initialWorkers: options.workers || 0,
        maxWorkers: options.workers || 25    
    });

    if (options.rateLimit) {
        main.server.enableRatelimiting({
            max: options.rateLimit
        });
    }

    main.startServer(options.port, 443, options.sslPath);
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
            initialWorkers: options.workers || 5,
            maxWorkers: options.workers || 25,
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
                        type: options.type || 'png',
                        scale: options.scale,
                        width: options.width,
                        resources: options.resources,
                        callback: options.callback,
                        constr: options.constr,
                        tmpdir: options.tmpdir,
                        styledMode: options.styledMode,
                        allowFileResources: options.allowFileResources
                    }, next);
                });
            }
        });

        async.waterfall(func, function () {
            main.killPool();
        });

    } else {

        options.infile = options.infile;
        options.instr = options.instr || options.options;

        main.initPool({
            initialWorkers: options.workers || 1,
            maxWorkers: options.workers || 1 ,
            reaper: false
        });

        main.export(options, function (err, data) {
            main.killPool();
        });            
    }
}
