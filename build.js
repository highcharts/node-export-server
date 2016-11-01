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

const prompt = require('prompt');
const fs = require('fs');
const request = require('request');
const async = require('async');
const template = fs.readFileSync(__dirname + '/phantom/template.html').toString();
const package = require('package.json');

const cdnScripts = [
    "https://code.highcharts.com/stock/highstock.js",
    "https://code.highcharts.com/adapters/standalone-framework.js",
    "https://code.highcharts.com/highcharts-more.js",
    "https://code.highcharts.com/highcharts-3d.js",
    "https://code.highcharts.com/modules/data.js",
    "https://code.highcharts.com/modules/exporting.js",
    "https://code.highcharts.com/modules/funnel.js",
    "https://code.highcharts.com/modules/solid-gauge.js"
];

var schema = {
    properties: {
        agree: {
            description: 'Agree to the license terms? y/n',
            required: true,
            message: 'Please enter (y)es or (n)o',
            conform: function (value) {
                value = value.toUpperCase();
                return value === 'Y' || value === 'N' || value === 'YES' || value === 'NO';
            }
        }
    }
};

require('colors');

function embed() {
    var funs = [],
        scriptBody = ''
    ;

    cdnScripts.forEach(function (script) {
        funs.push(function (next) {
            request(script, function (error, response, body) {
                if (error) return next(error);                
                scriptBody += body;                
                next();
            });
        });
    });

    async.waterfall(funs, function (err) {
        if (err) return console.log('error fetching Highcharts:', err);
        console.log('CDN fetch complete, creating export template');

        fs.writeFile(__dirname + '/phantom/export.html', template.replace('"{{highcharts}}";', scriptBody), function (err) {
            if (err) return console.log('Error creating template:');
            console.log('Baking complete.');
        });
    });
}

console.log(fs.readFileSync(__dirname + '/msg/licenseagree.msg').toString().bold);

prompt.message = '';
prompt.start();

prompt.get(schema, function (err, result) {
    result.agree = result.agree.toUpperCase();

    if (result.agree === 'Y' || result.agree === 'YES') {
        console.log('Pulling latest Highcharts');
        embed();
    } else {
        console.log('License terms not accepted, aborting'.red);
    }
});