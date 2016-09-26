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

addOption('type', 'png', 'the format to export to');
addOption('scale', 1, 'the scale of the exported chart');
addOption('resources', false, 'additional resource');
addOption('callback', false, 'JavaScript file with code to run on construction');
addOption('width', false, 'the width of the exported chart, overrides chart settings');
addOption('constr', 'Chart', 'the constructor to use. Either Chart or Stock.');
addOption('tmpdir', '/tmp/', 'path to temporary files');

addOption('enableServer', false, 'start a server on 0.0.0.0');
addOption('host', '', 'start a server listening on the supplied hostname');
addOption('port', 7801, 'server port');

addOption('logLevel', 2, 'the log level. 0 = silent, 4 = verbose.');
addOption('workers', false, 'the number of workers to spawn');

addOption('logDest', false, 'path to log files. will also enable file logging.');

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

if (options.logDest) {
    main.enableFileLogging(options.logDest, 'higcharts-export-server');
}

if (options.enableServer || options.host.length) {

    main.initPool({
        initialWorkers: options.workers || 0,
        maxWorkers: options.workers || 25    
    });

    main.startServer(options.port);
} else {
 
    main.initPool({
        initialWorkers: options.workers || 1,
        maxWorkers: options.workers || 1 
    });

    main.export(options, function (err, data) {
        main.killPool();
    });    
}
