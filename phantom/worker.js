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
    cachedContentStyled = '',
    xmlDoctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
    maxWaitTime = 6000,
    pollInterval = 20,
    importRe = /@import\s*([^;]*);/g
;

//So page.open doesn't seem to like relative local paths.
//So we're doing it manually. This makes sense in any case
//as we can cache it so we don't have to load from file
//each time we process an export.
//We're actually getting the module root path from node based on __dirname.
//This is to make everything work nicely when the export server is used as a module.
curFilePath = system.args[1] + 'phantom';

if (fs.exists(curFilePath + '/export.html') && fs.exists(curFilePath + '/export_styled.html')) {
    cachedContent = fs.read(curFilePath + '/export.html');    
    cachedContentStyled = fs.read(curFilePath + '/export_styled.html');    
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
        res = {},
        pendingScripts = {},
        currentWaitTime = 0,
        cachedCopy = '',
        css = '',
        imports
    ;    

    page.settings.localToRemoteUrlAccessEnabled = true;
   // page.settings.XSSAuditingEnabled = true;

    //Inject the JS in data.resources.js into a new script node 
    function injectRawJS() {
        if (data.resources && data.resources.js) {
            page.evaluate(function (js) {                    
                if (js) {
                    var script = document.createElement('script');
                    script.innerHTML = js;
                    document.head.appendChild(script);
                }

            }, data.resources.js);
        }         
    }
 
    function process() {
        var clipW, clipH;

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

                    try {
                        if (typeof chartJson === 'string') {
                            //Right. So this is not cool. BUT: we allow callbacks
                            //and direct JS injection, so this doesn't really
                            //open up things that aren't already open.
                            var __chartData = eval('(' + chartJson + ')');  

                            if (__chartData) {
                                __chartData.chart = __chartData.chart || {};

                                if (__chartData.exporting) {
                                    if (__chartData.exporting.sourceWidth) {
                                        __chartData.chart.width = __chartData.exporting.sourceWidth;
                                    }
                                    if (__chartData.exporting.sourceHeight) {
                                        __chartData.chart.height = __chartData.exporting.sourceHeight;
                                    }
                                }
                                
                                __chartData.chart.width = __chartData.chart.width || 600;
                                __chartData.chart.height = __chartData.chart.height || 400;
                            }               
                        }

                        //Create the actual chart
                        var create = Highcharts[constr] || Highcharts.Chart;

                        window.chart = new create(
                                            'highcharts', 
                                            (typeof chartJson === 'string' ? __chartData : chartJson ) || {}, 
                                            typeof cb !== 'undefined' ? cb : false
                        );
                    } catch (e) {
                        document.getElementById('highcharts').innerHTML = '<h1>Chart input data error</h1>' + e;
                    }
              }
            }, data.chart, data.constr, data.callback);
        } 

        if (data.svgstr && !data.chart && data.styledMode) {
            page.evaluate(function (css) {
                //We need to apply the style to the SVG
                var defs = document.createElement('defs'),
                    style = document.createElement('style')
                ;

                style.innerHTML = css;

                defs.appendChild(style);
                document.querySelector('svg').appendChild(defs);
            }, css);
        }

        if (data.svgstr) {
            page.evaluate(function () {
                document.body.style.margin = '0';
            });
        }

        //If the width is set, calculate a new zoom factor
        if (data.width && parseFloat(data.width) > 0) {
            data.scale = parseFloat(data.width) / page.evaluate(function () {
                var svg = document.querySelector('svg');
                return svg ? svg.width.baseVal.value : 600;
            });

            page.zoomFactor = data.scale;
        }        

        clipW = page.evaluate(function (scale) {
                    var svg = document.querySelector('svg');
                    return svg ? (svg.width.baseVal.value * scale) : (600 * scale);
                }, data.scale);

        clipH = page.evaluate(function (scale) {
                    var svg = document.querySelector('svg');
                    return svg ? (svg.height.baseVal.value * scale) : (400 * scale);
                }, data.scale || 1);

        page.clipRect = {
            width: clipW - 1,
            height: clipH - 1,
            top: 0,
            left: 0
        };

        page.viewportSize = {
            width: clipW,
            height: clipH,
            top: 0,
            left: 0 
        };

        //Handle foreign object elements
        page.evaluate(function () {
            var bodyElem,
                foreignObjectElem = document.getElementsByTagName('foreignObject')[0]
            ;
            
            if (foreignObjectElem && !foreignObjectElem.getElementsByTagName('body').length) {
                bodyElem = document.body || document.createElement('body');
                bodyElem.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
                while (foreignObjectElem.firstChild) {
                    bodyElem.appendChild(foreignObjectElem.firstChild.cloneNode(true));
                    foreignObjectElem.removeChild(foreignObjectElem.firstChild);
                }
                foreignObjectElem.appendChild(bodyElem);
            }
        });

        ////////////////////////////////////////////////////////////////////////
        //HANDLE RENDERING

        if (data.format === 'jpeg') {
            page.evaluate(function () {
                document.body.style.backgroundColor = 'white';
            });
        }

        if (data.format === 'svg') {
            if (data.svgstr && !data.chart) {
                fs.write(data.out, xmlDoctype + data.svgstr, 'w');
            } else {                
                //This temporary file nonesense has to go at some point.
                fs.write(data.out, xmlDoctype + page.evaluate(function () {    
                    var element = document.body.querySelector('#highcharts').firstChild;

                    //When we're in styled mode, prefer getChartHTML.
                    //getChartHTML will only be defined if the styled libraries are 
                    //included, which they always are if the overall 
                    //settings are styledMode = true                    
                    if (window.chart && window.chart.getChartHTML) {
                        return window.chart.getChartHTML();
                    } else if (window.chart && window.chart.getSVG) {                                         
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
    }

    //Handles polling in cases where async rendering is enabled.
    //This expects that whatever javascript is included in resources
    //calls highexp.done() when done processing.
    function poll() {
        if (currentWaitTime > maxWaitTime) {
            //We have timed out.
            process();
        } else if (page.evaluate(function () {
            return highexp.isDone();
        })) {
            process();
        } else {
            currentWaitTime += pollInterval;
            setTimeout(poll, pollInterval);
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    //Parse the input - we need a loop in case the std buffer is long enough
    //to force a flush in the middle of the data stream.
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

    if (data.format === 'svg') {
        data.scale = false;
    }

    if (data.resources && data.resources.css) {
        //Extract @import urls and move them to link tags.
        //We want to avoid polling, and phantom doesn't wait for @import includes to load.
        imports = data.resources.css.match(importRe);

        (imports || []).forEach(function (imp) {
            if (!imp) return;

            //There's like a million ways to write the import statement, 
            //this extracts the URL from all of them. Hopefully.
            imp = imp.replace('url(', '')
                     .replace('@import', '')
                     .replace(/\"/g, '')
                     .replace(/\'/g, '')
                     .replace(/\;/, '')
                     .replace(/\)/g, '')
                     .trim()
            ;
            
            css += '<link href="' + imp + '" type="text/css" rel="stylesheet"/>\n';
        });

        //The rest of the sheet is inserted into a separate style tag
        css += '<style>' + data.resources.css + '</style>';
    }        

    if (data.asyncRendering || (data.resources && data.resources.asyncLoading)) {
        //We need to poll. This is not ideal, but it's the easiest way 
        //to ensure that users have control over when the rendering is "done".
        //Opens up for e.g. Ajax requests.
        page.onLoadFinished = function () {
            injectRawJS();   
            poll();
        };
        
    } else {
        //No async resources, so just listen to page load.        
        page.onLoadFinished = function (status) {
            if (status !== 'success') {
                return;
            }
            injectRawJS();
            process();
        };
    }

    page.onResourceError = function (err) {
        system.stderr.writeLine('worker.js resource error - ' + err);
    };

    //Inject the CSS int the template
    if (data.styledMode) {
        cachedCopy = cachedContentStyled.replace('{{css}}', css);            
    } else {
        cachedCopy = cachedContent.replace('{{css}}', css);
    }

   // fs.write('test.html', cachedCopy, 'w');

    page.zoomFactor = parseFloat(data.scale);

    if (data.svgstr && !data.chart) {
        page.content = xmlDoctype + data.svgstr;
    } else {
        page.content = cachedCopy;            
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
}

//Start listening for stdin messages
loop();
