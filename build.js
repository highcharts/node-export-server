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
const path = require('path');
const template = fs.readFileSync(__dirname + '/phantom/template.html').toString();
const package = require(__dirname + '/package.json');

let npmLocation = __dirname + '/node_modules/highcharts/';

let highchartsPackage = {};
let officialCDNURL = 'https://code.highcharts.com/';
let cdnURL = officialCDNURL;
let useNPM = true;

// We allow the fetch for these to fail without error.
// This is because it's only available in version 6+
const cdnScriptsOptional = {
  '{{version}}/modules/sunburst.js': 1,
  '{{version}}/modules/xrange.js': 1,
  '{{version}}/modules/streamgraph.js': 1,
  '{{version}}/modules/sankey.js': 1,
  '{{version}}/modules/tilemap.js': 1,
  '{{version}}/modules/histogram-bellcurve.js': 1,
  '{{version}}/modules/bullet.js': 1,
  '{{version}}/modules/organization.js': 1,
  '{{version}}/modules/funnel3d.js': 1,
  '{{version}}/modules/pyramid3d.js': 1,
  '{{version}}/modules/dependency-wheel.js': 1,
  '{{version}}/modules/item-series.js': 1,
  '{{version}}/modules/timeline.js': 1,
  '{{version}}/modules/pareto.js': 1,
  '{{version}}/modules/coloraxis.js': 1,
  '{{version}}/modules/venn.js': 1
};

// The scripts here will appear as user prompts
const cdnScriptsQuery = {
  "wordcloud": "{{version}}/modules/wordcloud.js",
  "annotations": "{{version}}/modules/annotations.js"
};

// Push raw URL's here to force include them
const cdnAdditional = [];

// Push map collection includes here
const cdnMapCollection = [];

const cdnScriptsCommon = [
    "{{version}}/highcharts-3d.js",
    "{{version}}/modules/data.js",
    "{{version}}/modules/funnel.js",
    "{{version}}/modules/solid-gauge.js",
    "{{version}}/modules/heatmap.js",
    "{{version}}/modules/treemap.js"
].concat(Object.keys(cdnScriptsOptional));

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
    'maps/{{version}}/modules/map.js'
];

const cdnGantt = [
    '{{version}}/modules/gantt.js'
];

const cdnMoment = [
    'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.13/moment-timezone-with-data-2012-2022.min.js'
];

const rawScripts = [];

const cachedScripts = {};


////////////////////////////////////////////////////////////////////////////////

const boolConform = (value) => {
  value = value.toUpperCase();
  return value === 'Y'   ||
         value === 'N'   ||
         value === 'YES' ||
         value === 'NO';
};

let schema = {
    properties: {
        agree: {
            description: 'Agree to the license terms? y/n',
            required: true,
            default: 'no',
            message: 'Please enter (y)es or (n)o',
            conform: boolConform
        },
        version: {
            description: 'Select your Highcharts version (e.g. 4.2.2):',
            required: true,
            message: 'Enter as e.g. 4.2.2. Default is latest.',
            default: process.env.HIGHCHARTS_VERSION || 'latest'
        },
        maps: {
            description: 'Include Maps? (requires Maps license)',
            default: 'no',
            required: true,
            conform: boolConform
        },
        gantt: {
          description: 'Include Gantt? (requires Gantt license, and >V6.2)',
          default: 'no',
          required: true,
          conform: boolConform
        },
        styledMode: {
            description: 'Enable styled mode? (requires Highcharts/Highstock 5+ license)',
            default: 'no',
            required: true,
            conform: boolConform
        },
        moment: {
          description: 'Include moment.js for date/time handling?',
          default: 'no',
          required: true,
          conform: boolConform
        },
        cdnURL: {
          description: 'Which CDN would you like to use?',
          default: process.env.HIGHCHARTS_CDN || cdnURL
        }
    }
};

////////////////////////////////////////////////////////////////////////////////

// Augment the schema with the query CDN scripts

Object.keys(cdnScriptsQuery).forEach((name) => {
  schema.properties[name] = {
    description: `Enable ${name} support? y/n`,
    required: false,
    default: 'no',
    conform: boolConform
  };
});

////////////////////////////////////////////////////////////////////////////////

require('colors');

function embed(version, scripts, out, fn, optionals) {
    var funs = [],
        scriptBody = ''
    ;

    optionals = optionals || {};

    if (version) {
        version = version.trim();
    }

    if (version && parseInt(version[0]) < 5 && version[0] !== 'c')  {
        scripts = scripts.concat(cdnLegacy);
    }

    scripts.forEach(function (script) {
        let scriptOriginal = script;
        let fullURL = '';

        if (version !== 'latest' && version && !useNPM) {
            script = script.replace('{{version}}', version);
        } else {
            script = script.replace('{{version}}/', '');
        }

        // Allow using full URLs in the include arrays
        if (useNPM) {
          fullURL = path.join(npmLocation, script.replace('stock/', ''));
        } else if (script.indexOf('http') >= 0) {
          fullURL = script;
        } else {
          fullURL = cdnURL + script;
        }

        funs.push(function (next) {
            // If we've allready fetched the required script, just return it.
            if (cachedScripts[fullURL]) {
              console.log(('   using cached fetch for ' + fullURL).gray);
              scriptBody += cachedScripts[fullURL] + ';';
              return next();
            }

            console.log('  ', (fullURL).gray);

            const handleScript = (error, body) => {

                // if ((error || body.trim().indexOf('<!DOCTYPE') === 0)) {
                //   console.log(optionals, scriptOriginal);
                //   if (optionals[scriptOriginal]) {
                //     console.log(`  notice: ${script} is not available for v${version}, skipped.`.yellow)
                    // return next();
                  // }
                  // return next(error, fullURL);
                // }

                if ((body || '').trim().indexOf('<!DOCTYPE') === 0) {
                  if (optionals[scriptOriginal]) {
                    console.log(`   ${script.substr(script.lastIndexOf('/') + 1)} is not available for v${version}, skipped..`.yellow);
                    return next();
                  }

                  return next(404, script);
                }

                cachedScripts[fullURL] = body;
                scriptBody += body + ';\n';
                next();
            };

            if (useNPM) {
              // Fetch from npm package instead
              script = script.replace('stock/', '');
              fs.readFile(fullURL, 'utf8', (err, data) => {
                handleScript(err, data);
              });
            } else {
              request(fullURL, function (error, response, body) {
                handleScript(error, body);
              });
            }
        });
    });

    async.waterfall(funs, function (err, script) {
        if (err === 404) {
            console.log('Could not find', (script.toString()).bold);
            console.log('The version you requested is invalid!'.red);
            console.log('Please try again');
            return startPrompt();
        }

        if (err && !useNPM) {
            return console.log('error fetching Highcharts:', err, `
            If you're behind a proxy, please follow this guide:
            https://github.com/request/request#controlling-proxy-behaviour-using-environment-variables`);
        }

        let additionalScripts = rawScripts.map((s) => `<script src="${s}"></script>`).join('') || '';

        console.log('Creating export template', out + '..');

        fs.writeFile(
            __dirname + '/phantom/' + out + '.html',
            template
                .replace('"{{highcharts}}";', scriptBody)
                .replace('<div style="padding:5px;">', '<div style="padding:5px;display:none;">')
                .replace('{{additionalScripts}}', additionalScripts)
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

function embedAll(version, includeStyled, includeMaps, includeMoment, includeGantt, optionals) {
    var standard = cdnScriptsStandard.concat(cdnScriptsCommon).concat(cdnAdditional),
        styled = cdnScriptsStyled.concat(cdnScriptsCommon).concat(cdnAdditional)
    ;

    optionals = optionals || {};

    if (includeMaps) {
        console.log('Including maps support'.green);
        standard = standard.concat(cdnMaps).concat(cdnMapCollection);
        styled = styled.concat(cdnMaps).concat(cdnMapCollection);

        // Map collections are user supplied, so we need to allow them to 404
        cdnMapCollection.forEach((url) => {
          optionals[url] = 1;
        });
    }

    if (includeGantt) {
        console.log('Including Gantt support'.green);

        standard = standard.concat(cdnGantt);
        styled = styled.concat(cdnGantt);

        // Gantt was introduced in 6.2. To avoid 404 errors if fetching an
        // older version by accident, let the fetch fail gracefully
        cdnGantt.forEach((url) => {
            optionals[url] = 1
        });
    }

    if (includeMoment) {
        console.log('Including moment.js support'.green);
        cdnMoment.forEach((t) => { rawScripts.push(t); });
    }

    useNPM = process.env.HIGHCHARTS_USE_NPM || cdnURL === 'npm';

    if (useNPM) {
      // Reset cdn url to official CDN in case we need to do a fallback
      cdnURL = officialCDNURL;

      // See if we need to check the parent folder instead
      if (!fs.existsSync(npmLocation)) {
        npmLocation = __dirname + '/../highcharts/';
      }

      // Check if the NPM package has been installed before doing anything.
      if (!fs.existsSync(npmLocation)) {
        console.log('Could not get Highcharts through NPM: the NPM package is not installed! Using fallback to CDN.'.red);
        useNPM = false;
      } else {
        highchartsPackage = require(path.join(npmLocation, 'package.json'));
        version = highchartsPackage.version || version;
        console.log(`Bundling in Highcharts from NPM package @${highchartsPackage.version}..`.gray);
      }
    } else {
      console.log(('Pulling Highcharts from CDN (' + version + ')..').gray);
    }

    embed(
      version,
      standard,
      'export',
      function () {
        if (includeStyled) {
            console.log('Including styled mode support'.green);
            embed(
              false,
              styled,
              'export_styled',
              endMsg,
              optionals
            );
        } else {
         endMsg();
        }
      },
      optionals
    );
}

function affirmative(str) {
  str = (str || '').toUpperCase();
  return str === 'YES' || str === 'Y' || str === '1';
}

function getOptionals(include, forceInclude) {
  let optionalScripts = {};

  Object.keys(cdnScriptsOptional).forEach((url) => {
    optionalScripts[url] = 1;
  });

  // Build list of optionals
  Object.keys(cdnScriptsQuery).forEach((name) => {
    if (forceInclude || (!include || affirmative(include[name]))) {
      optionalScripts[cdnScriptsQuery[name]] = 1;
      cdnAdditional.push(cdnScriptsQuery[name]);
    }
  });

  return optionalScripts;
}

function startPrompt() {
  prompt.message = '';
  prompt.start();

  prompt.get(schema, function (err, result) {
    result.agree = result.agree.toUpperCase();

    cdnURL = result.cdnURL || cdnURL;

    if (result.agree === 'Y' || result.agree === 'YES') {
        embedAll(result.version,
                 affirmative(result.styledMode),
                 affirmative(result.maps),
                 affirmative(result.moment),
                 affirmative(result.gantt),
                 getOptionals(result)
        );
    } else {
        console.log('License terms not accepted, aborting'.red);
    }
  });
}

function useIfDefined(what, def) {
  return (typeof what === 'undefined' ? def : what);
}

if (process.env.ACCEPT_HIGHCHARTS_LICENSE) {

    cdnURL = process.env.HIGHCHARTS_CDN || cdnURL;

    embedAll(
      useIfDefined(process.env.HIGHCHARTS_VERSION, 'latest'),
      useIfDefined(process.env.HIGHCHARTS_USE_STYLED, true),
      useIfDefined(process.env.HIGHCHARTS_USE_MAPS, true),
      useIfDefined(process.env.HIGHCHARTS_MOMENT, false),
      useIfDefined(process.env.HIGHCHARTS_USE_GANTT, true),
      getOptionals(cdnScriptsOptional, true)
    );
} else {
    console.log(fs.readFileSync(__dirname + '/msg/licenseagree.msg').toString().bold);
    startPrompt();
}
