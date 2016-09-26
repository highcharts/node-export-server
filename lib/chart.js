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
const log = require('./logger').log;
const ppool = require('./phantompool.js');

function doExport(exportOptions, chartJson, startTime, fn) {
    var phantomStart = (new Date()).getTime(),
        outfile = exportOptions.outfile || (exportOptions.tmpdir + 'chart.png')
    ;

    //Clean properties
    if (chartJson) {    
        chartJson.exporting = {enabled: false};

        if (exportOptions.width) {
            chartJson.chart = chartJson.chart || {};
            chartJson.chart.width = exportOptions.width;

            //Width should override the scale factor
            exportOptions.scale = 1;
        }
    }

    if (exportOptions.constr !== 'Chart' && exportOptions.const !== 'Stock') {
        exportOptions.constr = 'Chart';
    }

    if (exportOptions.resources && typeof exportOptions.resources === 'string') {
        try {
            exportOptions.resources = JSON.parse(exportOptions.resources);
        } catch (e) {
            log(2, 'error parsing resources:', e);
            return fn('error parsing resources, check your JSON syntax');
        }
    }

    if (exportOptions.resources && exportOptions.resources.files) {
        try {
            exportOptions.resources.files = exportOptions.resources.files.split(',');
        } catch (e) {
            log(2, 'error organizing resource files:', e);
            return fn('error parsing resource files, make sure they are comma separated');
        }
    }

    function exec() {
        //Post the work to the pool
        ppool.postWork({
            callback: exportOptions.callback || false,
            resources: exportOptions.resources || false,
            scale: exportOptions.scale || 1,
            constr: exportOptions.constr,
            chart: chartJson,
            svgstr: exportOptions.svg,
            format: exportOptions.type || 'png',
            out: outfile
        }, fn);        
    }

    if (exportOptions.callback) {
        fs.readFile(exportOptions.callback, function (err, data) {
            if (err) {
                log(2, 'error loading callback:', err);
                return fn && fn('error loading callback script. Check the file path.');
            }
            exportOptions.callback = data;
            exec();
        });
    } else {
        exec();
    }
}

function exportAsString(string, exportOptions, startTime, fn) {
    string = string.trim();

    //Check if it's svg
    if (string.indexOf('<svg') === 0 || string.indexOf('<?xml') === 0) {
        log(4, 'parsing input as svg');
        exportOptions.svg = string;
        return doExport(exportOptions, false, startTime, fn);
    }

    try {
        return doExport(exportOptions, JSON.parse(exportOptions.instr), startTime, fn);
    } catch (e) {        
        log(1, 'error parsing input:', e);
        return fn && fn(e);
    }  
}

/** Function to export a chart
 *  @module chart
 *  @param exportOptions {object} - the export options
 *  @param fn {function} - the function to call when done
 */
module.exports = function (exportOptions, fn) {
    var startTime = (new Date()).getTime();

    log(4, 'starting export');

    if (exportOptions.svg && exportOptions.svg !== '') {
        return exportAsString(exportOptions.svg, exportOptions, startTime, fn);
    }

    if (exportOptions.infile && exportOptions.infile.length) {
        log(4, 'attempting to export from input file');
        
        return fs.readFile(exportOptions.infile, function (err, data) {
            if (err) return log('error loading input file:', err);
            try {
                return doExport(exportOptions, JSON.parse(data), startTime, fn);
            } catch (e) {
                return exportAsString(exportOptions.instr, exportOptions, startTime, fn);                
            }
        });
    } else if (exportOptions.instr && exportOptions.instr !== '') {
        log(4, 'attempting to export from raw input');

        if (typeof exportOptions.instr === 'string') {
            return exportAsString(exportOptions.instr, exportOptions, startTime, fn);                
        } else {
            return doExport(exportOptions, exportOptions.instr, startTime, fn);
        }

    } else {
        log(1, 'no input specified');
        return fn && fn('no input given');
    }

    log (1, 'invalid input specified');
    return fn && fn ('invalid input specified');
};