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
const highcharts = require('highcharts');
const log = require('./logger').log;
const ppool = require('./phantompool.js');

function doExport(exportOptions, chartJson, startTime, fn) {
    var phantomStart = (new Date()).getTime(),
        outfile = exportOptions.outfile || (exportOptions.tmpdir + 'chart.png')
    ;


    ppool.postWork({
        chart: chartJson,
        format: '',
        out: outfile
    }, fn);
}

/** Function to export a chart
 *  @module chart
 *  @param exportOptions {object} - the export options
 *  @param fn {function} - the function to call when done
 */
module.exports = function (exportOptions, fn) {
    var startTime = (new Date()).getTime();

    log(4, 'starting export');

    if (exportOptions.infile && exportOptions.infile.length) {
        log(4, 'attempting to export from input file');
        
        return fs.readFile(exportOptions.infile, function (err, data) {
            if (err) return log('error loading input file:', err);
            try {
                doExport(exportOptions, JSON.parse(data), startTime, fn);
            } catch (e) {
                //This is either an invalid JSON file, or not JSON at all.
                //For now, only JSON is supported, so return an error
                log(1, 'parsing input file:', e);
                return fn && fn(e);
            }
        });
    } else if (exportOptions.instr && exportOptions.instr !== '') {
        log(4, 'attempting to export from raw input');

        if (typeof exportOptions.instr === 'string') {
            try {
                return doExport(exportOptions, JSON.parse(exportOptions.instr), startTime, fn);
            } catch (e) {
                log(1, 'parsing input string:', e);
                return fn && fn(e);
            }            
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