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
    cachedContent = '',
    xmlDoctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
;

//So page.open doesn't seem to like relative local paths.
//So we're doing it manually. This makes sense in any case
//as we can cache it so we don't have to load from file
//each time we process an export.

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
        return console.log(e);
    }

    system.stdout.writeLine(data);

    loop();
}

function loop() {
    var page = webpage.create(),
        incoming = system.stdin.readLine(),
        data = '',
        res = {}
    ;    

    while(incoming !== 'EOL') {
        data += incoming;
        incoming = system.stdin.readLine();
    }

    try {
        data = JSON.parse(data);
    } catch (e) {
        system.stderr.writeLine('worker.js - ' + e);
        return;
    }

    //Inject required script files
    if (data.resources && data.resources.files) {
        data.resources.files.forEach(function (f) {
            if (f.indexOf('http') === 0) {
                page.includeJs(f, function () {});
            } else {
                page.injectJs(f);
            }
        });
    }

    page.onLoadFinished = function (status) {
        var clipW, clipH;

        if (status !== 'success') {
            return;
        }

        ////////////////////////////////////////////////////////////////////////
        //CREATE THE CHART

        if (data.chart) {            
            page.evaluate(function (chartJson, constr, callback) {
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

                    if (callback) {
                        var script = document.createElement('script');
                        script.innerHTML = 'var cb = ' + callback;
                        document.head.appendChild(script);
                    }

                    //Create the actual chart
                    var create = Highcharts[constr] || Highcharts.Chart;
                    window.chart = new create(
                                        'highcharts', 
                                        chartJson || {}, 
                                        typeof cb !== 'undefined' ? cb : false
                    );
              }
            }, data.chart, data.constr, data.callback);
        } else {
            //This is needed for SVG input to get the image to appear at [0,0]
            page.evaluate(function () {
                document.querySelector('body').style.margin = '0px';
            });            
        }

        //If the width is set, calculate a new zoom factor
        if (data.width) {
            data.scale = parseFloat(data.width) / page.evaluate(function () {
                return document.querySelector('svg').width.baseVal.value;
            });

            page.zoomFactor = data.scale;
        }

        clipW = page.evaluate(function (scale) {
                    return (document.querySelector('svg').width.baseVal.value * scale);
                }, data.scale);

        clipH = page.evaluate(function (scale) {
                    return (document.querySelector('svg').height.baseVal.value * scale);
                }, data.scale);

        page.clipRect = {
            width: clipW,
            height: clipH,
            top: 0,
            left: 0
        };

        ////////////////////////////////////////////////////////////////////////
        //HANDLE RESOURCES 
        if (data.resources && (data.resources.css || data.resources.js)) {
            page.evaluate(function (css, js) {
                
                if (css) {
                    document.head.querySelector('style').innerHTML += css;
                }

                if (js) {
                    var script = document.createElement('script');
                    script.innerHTML = js;
                    document.head.appendChild(script);
                }

            }, data.resources.css, data.resources.js);
        }

        ////////////////////////////////////////////////////////////////////////
        //HANDLE RENDERING
        if (data.format === 'svg') {
            if (data.svgstr && !data.chart) {
                fs.write(data.out, xmlDoctype + data.svgstr, 'w');
            } else {                
                //This temporary file nonesense has to go at some point.
                fs.write(data.out, xmlDoctype + page.evaluate(function () {    
                    var element = document.body.querySelector('#highcharts').firstChild;

                    if (window.chart && window.chart.getSVG) {                                         
                        return window.chart.getSVG();
                    }

                    //Fall back to just using the SVG as it is on the page
                    return element ? element.innerHTML : '';
                }).replace(/\n/g, ''), 'w');
            }

            doDone({                
                 filename: data.out
            });
        } else {            

            if (data.format === 'pdf') {
                page.zoomFactor = 1;
                //Scale everything - zoomFactor is a bit shabby still with PDF's.
                //It does set the paper size to what it should be, but it doesn't 
                //actually scale the contents.
                page.evaluate(function (zoom) {                  
                    document.body.style['zoom'] = zoom;
                }, data.scale);

                //Set the page size to fit our chart - we need some margins to
                //prevent overflow
                page.paperSize = {
                    width: clipW ,
                    height: clipH,
                    margin: '0px'
                };
            } 

            //We're done drawing the page, now render it.
            //We should render to /dev/stdout or something eventually to
            //avoid going through the filesystem.
            //We could also render b64 to the out data, 
            //but this likely won't work correctly for pdf's.
            //Note that the base64 rendering is much slower than writing to a
            //temporary file...
            page.render(data.out, {
                format: data.format || 'png'
            });

            doDone({
                filename: data.out
            });
        }
    };

    page.zoomFactor = parseFloat(data.scale);

    if (data.svgstr && !data.chart) {
        page.content = xmlDoctype + data.svgstr;
    } else {
        page.content = cachedContent;            
    }
}

loop();