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
const package = require(__dirname + '/package.json');
const cdnURL = 'https://code.highcharts.com/'

const cdnScriptsCommon = [
    "{{version}}/highcharts-3d.js",
    "{{version}}/modules/data.js",
    "{{version}}/modules/funnel.js",
    "{{version}}/modules/solid-gauge.js",
    "{{version}}/modules/heatmap.js",
    "{{version}}/modules/treemap.js",
    "{{version}}/modules/sunburst.js"
];

const cdnScriptsStyled = [
    "stock/js/highstock.js",
    "js/highcharts-more.js",
    "maps/js/modules/exporting.js"
];

const cdnScriptsStandard = [
    "stock/{{version}}/highstock.js",
    "{{version}}/highcharts-more.js",
    "{{version}}/modules/exporting.js"
];

const cdnLegacy = [    
    "{{version}}/adapters/standalone-framework.js"
];

const cdnMaps = [
    "maps/{{version}}/modules/map.js"
];

var schema = {
    properties: {
        agree: {
            description: 'Agree to the license terms? y/n',
            required: true,
            default: 'no',
            message: 'Please enter (y)es or (n)o',
            conform: function (value) {
                value = value.toUpperCase();
                return value === 'Y'   || 
                       value === 'N'   || 
                       value === 'YES' || 
                       value === 'NO';
            }
        },
        version: {
            description: 'Select your Highcharts version (e.g. 4.2.2):',
            required: true,
            message: 'Enter as e.g. 4.2.2. Default is latest.',
            default: 'latest'
        },
        maps: {
            description: 'Include Maps? (requires Maps license)',
            default: 'no',
            required: true,
            conform: function (value) {
                value = value.toUpperCase();
                return value === 'Y'   || 
                       value === 'N'   || 
                       value === 'YES' || 
                       value === 'NO'
                ;
            }
        },
        styledMode: {
            description: 'Enable styled mode? (requires Highcharts/Highstock 5 license)',
            default: 'no',
            required: true,
            conform: function (value) {
                value = value.toUpperCase();
                return value === 'Y'   || 
                       value === 'N'   || 
                       value === 'YES' || 
                       value === 'NO'
                ;
            }
        }
    }
};

require('colors');

function embed(version, scripts, out, fn) {
    var funs = [],
        scriptBody = ''
    ;

    if (version) {
        version = version.trim();        
    }

    console.log(version);

    if (version && parseInt(version[0]) < 5 && version[0] !== 'c')  {
        scripts = scripts.concat(cdnLegacy);
    }

    scripts.forEach(function (script) {

        if (version !== 'latest' && version) {
            script = script.replace('{{version}}', version);
        } else {
            script = script.replace('{{version}}/', '');
        }

        console.log('  ', (cdnURL + script).gray);

        funs.push(function (next) {
            request(cdnURL + script, function (error, response, body) {
                if (error) return next(error, cdnURL + script);     
                if (body.trim().indexOf('<!DOCTYPE') === 0) return next(404, script);           
                scriptBody += body;                
                next();
            });
        });
    });

    async.waterfall(funs, function (err, script) {
        if (err === 404) {
            console.log('Could not find', (script.toString()).bold);
            console.log('The version you requested is invalid!'.red);
            console.log('Please try again');
            return startPrompt();
        }

        if (err) { 
            return console.log('error fetching Highcharts:', err);
        }

        console.log('Creating export template', out + '..');

        fs.writeFile(
            __dirname + '/phantom/' + out + '.html', 
            template
                .replace('"{{highcharts}}";', scriptBody)
                .replace('<div style="padding:5px;">', '<div style="padding:5px;display:none;">')
                , 
            function (err) {
                if (err) return console.log('Error creating template:', err);
                if (fn) fn();                
            }
        );
    });
}

function endMsg() {
    console.log('All done! Happy charting!'.green);
    console.log('For documentation, see https://github.com/highcharts/node-export-server');
}

function embedAll(version, includeStyled, includeMaps) {
    var standard = cdnScriptsStandard.concat(cdnScriptsCommon),
        styled = cdnScriptsStyled.concat(cdnScriptsCommon)
    ;

    if (includeMaps) {
        standard = standard.concat(cdnMaps);
        styled = standard.concat(cdnMaps);
    }
 
    console.log('Pulling Highcharts from CDN (' + version + ')..');
    embed(version, 
          standard, 
          'export', 
          function () {        
            if (includeStyled) {
                embed(false, 
                      styled,
                      'export_styled', 
                      endMsg
                );
            } else {
                endMsg();
            }
        }
    );
}

function startPrompt() {
    prompt.message = '';
    prompt.start();

    prompt.get(schema, function (err, result) {
        result.agree = result.agree.toUpperCase();

        if (result.agree === 'Y' || result.agree === 'YES') {
            embedAll(result.version, 
                     result.styledMode.toUpperCase() === 'Y' || 
                     result.styledMode.toUpperCase() === 'YES',
                     result.maps.toUpperCase() === 'Y' || 
                     result.maps.toUpperCase() === 'YES'                    
            );
        } else {
            console.log('License terms not accepted, aborting'.red);
        }
    });
}

if (process.env.ACCEPT_HIGHCHARTS_LICENSE) {
    embedAll(process.env.HIGHCHARTS_VERSION || 'latest', 
             process.env.HIGHCHARTS_USE_STYLED || true,
             process.env.HIGHCHARTS_USE_MAPS || true
    );    
} else {    
    console.log(fs.readFileSync(__dirname + '/msg/licenseagree.msg').toString().bold);
    startPrompt();
}
