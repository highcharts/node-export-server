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


var webpage = require('webpage'),
    fs = require('fs'),
    system = require('system'),
    currentFile = system.args[3],
    curFilePath = fs.absolute(currentFile).split('/'),
    cachedContent = ''
;

//So page.open doesn't seem to like relative local paths.
//So we're doing it manually.
curFilePath = curFilePath.join('/') + '/phantom'
if (fs.exists(curFilePath + '/export.html')) {
    cachedContent = fs.read(curFilePath + '/export.html');    
} else {
    cachedContent = fs.read(curFilePath + '/template.html');        
}

function doDone(data) {
    try {
        data = JSON.stringify(data);
    } catch (e) {

    }

    system.stdout.writeLine(data);

    loop();
}

function loop() {
    var page = webpage.create(),
        data = system.stdin.readLine(),
        res = {}
    ;

    try {
        data = JSON.parse(data);
    } catch (e) {
        system.stderr.writeLine('worker.js - ' + e);
        return;
    }

    page.onLoadFinished = function (status) {
        if (status !== 'success') {
            return;
        }

        //Create the chart
        page.evaluate(function (chartJson) {
          if (typeof window['Highcharts'] !== 'undefined') {        
            
            //Disable animations
            Highcharts.SVGRenderer.prototype.Element.prototype.animate = Highcharts.SVGRenderer.prototype.Element.prototype.attr;

              Highcharts.setOptions({
                plotOptions: {
                  series: {
                    animation: false
                  }
                }
              });

              var chart = new Highcharts.Chart('highcharts', chartJson || {});
          }
        }, data.chart);

        //We're done drawing the page, now render it.
        //We should render to /dev/stdout eventually to
        //avoid going through the filesystem.
        page.render(data.out, {
            format: data.format || 'png'
        });

        doDone({
            filename: data.out
        });
    };

    page.content = cachedContent;    
}

loop();