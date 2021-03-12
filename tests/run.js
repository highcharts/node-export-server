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

const fs = require('fs');
const files = fs.readdirSync(__dirname);
const exporter = require('../lib/index.js');
const async = require('async');

var funs = [];
var fails = 0;

require('colors');

exporter.initPool({});
exporter.logLevel(2);

console.log('Highcharts Export Server Automagic Test Runner'.yellow);
console.log('Loads all JSON files in the test folder and runs them. Results are stored in ./results.');

console.log('');

files.forEach(function (file) {
    if (file.indexOf('.json') > 0) {
        console.log(('Preparing test ' + file).bold.gray);
        funs.push(function (next) {
            var options;

            try {
                options = require(__dirname + '/' + file);

                options.outfile = __dirname +
                                 '/results/' +
                                 file.replace('.json', '.png');

                options.async = true;
                options.reqID = file;


                exporter.export(options, function (err, result, status, t) {
                    if (err) {
                        console.log(('Test ' + file + ' failed: ' + err).red);
                    } else {
                        console.log(('Test ' + file + ' processed [' + t + 'ms]').green);
                    }

                    next();
                });

            } catch(e) {
                console.error('[bad test format]'.red, e);
                next();
            }
        });
    }
});

console.log('');
console.log('Executing tests'.yellow);
console.log('');

async.waterfall(funs, function (err) {
    console.log('');

    if (fails > 0) {
        console.log('Completed with errors'.red,
                    (funs.length - fails) + '/' + funs.length,
                    'passed.');
    } else {
        console.log((funs.length + '/' + funs.length + ' tests ran OK.').bold.green);
    }

    console.log('');
    console.log('Look in', (__dirname + '/results').bold, 'for tentative results.');
    console.log('Results needs to be manually verified if tests "pass".');
    process.exit(1);
});
