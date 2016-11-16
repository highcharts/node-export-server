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

//Don't want to deal with mime types inside the worker..
function fixType(type) {
    if (!type) {
        return 'png';
    }

    if (type === 'image/svg+xml') {
        return 'svg';
    }
    
    type = type.split('/');
    return type[type.length - 1];
}

function guessType(str) {
    var i = str.lastIndexOf('.'),
        e = str.substr(i + 1);
    return e;
}

function doExport(exportOptions, chartJson, startTime, fn) {
    var phantomStart = (new Date()).getTime(),
        outfile = exportOptions.outfile || 
                 (exportOptions.tmpdir + 'chart.' + fixType(exportOptions.type)),
        oldWidth
    ;

    if (!exportOptions.type) {
        //Guess export type based on file extension.
        exportOptions.type = guessType(outfile);
    }    

    //Clean properties - we want to avoid doing this in the phantom worker
    //to keep it lean and mean.
    if (chartJson) {    

        chartJson.chart = chartJson.chart || {};
        chartJson.exporting = chartJson.exporting || {};
        chartJson.exporting.enabled = false;

        if (chartJson.exporting.sourceWidth) {
            chartJson.chart.width = chartJson.exporting.sourceWidth;
        }

        if (chartJson.exporting.sourceHeight) {
            chartJson.chart.height = chartJson.exporting.sourceHeight;
        }

        chartJson.chart.width = chartJson.chart.width || 600;
        chartJson.chart.height = chartJson.chart.height || 400;
    }

    if (fixType(exportOptions.type) === 'svg') {
        exportOptions.width = false;
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

    if (exportOptions.scale && parseInt(exportOptions.scale, 10) > 5) {
        exportOptions.scale = 5;
    }

    if (exportOptions.scale && parseInt(exportOptions.scale, 10) < 1) {
        exportOptions.scale = 1;
    }

    function exec() {
        //Post the work to the pool
        ppool.postWork({
            width: exportOptions.width,
            callback: exportOptions.callback || false,
            resources: exportOptions.resources || false,
            scale: exportOptions.scale || 1,
            constr: exportOptions.constr,
            chart: chartJson || exportOptions.str,
            svgstr: exportOptions.svg,
            format: fixType(exportOptions.type) || 'png',
            out: outfile,
            styledMode: exportOptions.styledMode,
            asyncRendering: exportOptions.asyncRendering
        }, fn);        
    }

    //This is kind of hacky, but looking for braces is a good way of knowing
    //if this is a file or not without having to waste time stating.
    //'Cause no one uses curly braces in filename, right? ...right?
    //One interesting thing here is that this is a huge security issue
    //if this is a file and the options are coming from the http server
    //since it's possible to inject random files from the filesystem with it.
    //It *should* just cause a crash though.
    //
    //UPDATE: Added allowFileResources which is always set to false for HTTP 
    //requests to avoid injecting arbitrary files from the fs.
    if (exportOptions.allowFileResource && 
        exportOptions.callback && 
        exportOptions.callback.indexOf('{') < 0) 
    {
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
    var addQuote = false,
        j,
        c2,
        c,
        res,
        controlChar = {
            ':': true,
            '{': true,
            '}': true,
            ']': true,
            '[': true,
            ',': true
        };

    string = string.trim();

    //Check if it's svg
    if (string.indexOf('<svg') >= 0 || string.indexOf('<?xml') >= 0) {
        log(4, 'parsing input as svg');
        exportOptions.svg = string;
        return doExport(exportOptions, false, startTime, fn);
    }
    
    try {
        return doExport(
                    exportOptions, 
                    JSON.parse(
                        exportOptions.instr.
                            replace(/\t/g, '').
                            replace(/\n/g, '').
                            replace(/\r/g, '')
                    ), 
                    startTime, 
                    fn
        );
    } catch (e) {        

        //Pass it directly to the phantom script which will run an eval in the
        //document context. This is not cool, but there are some crazy edge cases
        //that the below parser doesn't account for.
        exportOptions.str = exportOptions.instr;
        return doExport(exportOptions, false, startTime, fn); 

        exportOptions.str = exportOptions.instr.trim().
                            replace(/\t/g, '').
                            replace(/\n/g, '')
        ;

        if (exportOptions.str[0] === '{') {

            log(4, 'found possible pure JavaScript object, attempting to parse');

            //So this is likely unqoted json.
            //Don't want to run eval to avoid codeinjections, 
            //so let's try to parse it.
            res = '';
            exportOptions.str = exportOptions.str.replace(/\'/g, '"');

            for (var i = 0; i < exportOptions.str.length; i++) {
                addQuote = true;
                c = exportOptions.str[i];

                if (c === ':') {
                    //Go backwards until we hit a space or a control 
                    //character and insert a quote
                    j = i - 1; 
                    c2 = exportOptions.str[i - 1];
                    
                    while(c2) {
                        if (c2.match(/[a-zA-z]/) === null) {//controlChar[c2] || c2 === ' ' || c2 === '\s' || c2 === '\t' || c2 === '\n') {                            
                            res = (res.substr(0, j - 1) + '"' + res.substr(j + 1, 1 + (i - j)));                          
                            break;
                        }
                        c2 = exportOptions.str[--j];
                    }
                    res += '":';
                } else {
                    res += c;
                }
            }

            res = res.replace(/\;/g, '');

            console.log(res);

            try {             
                return doExport(exportOptions, JSON.parse(res), startTime, fn);
            } catch (ex) {
                log(0, 'The input is not valid:', ex);
                return fn && fn('unable to do anything with the input: ' +  ex);
            }
        }
        //No idea what this is. Pass it to the worker and see if highcharts can figure it out.
        return doExport(exportOptions, false, startTime, fn);        
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