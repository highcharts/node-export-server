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
    imagePollTimeout = false,
    importRe = /@import\s*([^;]*);/g
;

//So page.open doesn't seem to like relative local paths.
//So we're doing it manually. This makes sense in any case
//as we can cache it so we don't have to load from file
//each time we process an export.
//We're actually getting the module root path from node based on __dirname.
//This is to make everything work nicely when the export server is used as a module.
curFilePath = system.args[1] + 'phantom';

if (fs.exists(curFilePath + '/export.html')) {
    cachedContent = fs.read(curFilePath + '/export.html');
} else {
    cachedContent = fs.read(curFilePath + '/template.html');
}

if (fs.exists(curFilePath + '/export_styled.html')) {
    cachedContentStyled = fs.read(curFilePath + '/export_styled.html');
} else {
    cachedContentStyled = cachedContent;
}

function doDone(data) {
    try {
        data = JSON.stringify(data);
    } catch (e) {
        system.stderr.writeLn('Error generating chart');
        system.stderr.flush();
        return console.log('doDone:', e);
    }

    system.stdout.write(data);
    system.stdout.flush();

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
        jsIncludes = '',
        imports
    ;

    page.settings.localToRemoteUrlAccessEnabled = true;
   // page.settings.XSSAuditingEnabled = true;
    page.settings.resourceTimeout = 5000;

    //User agent to force gfonts to serve woff and not woff2
    //Fixes issues with font-weight/font-style
    page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0';

    function injectJSString(name, script) {

        if (typeof script !== 'string' && !(script instanceof String)) {
          try {
            script = JSON.stringify(script);
          } catch(e) {}
        }

        page.evaluate(function (name, js) {
            if (js === 'null' || typeof js === 'undefined' || !js) {
                return;
            }


            var script = document.createElement('script');
            script.type = 'text/javascript';

            if (name) {
                script.innerHTML = 'var ' + name + ' = ' + js;
            } else {
                script.innerHTML = js;
            }

            try {
                document.head.appendChild(script);
            } catch (e) {}

        }, name, script);
    }

    //Inject potential raw JS into new script nodes
    //This is called after the page content is set.
    function injectRawJS() {
        if (data.resources && data.resources.js) {
            injectJSString(false, data.resources.js);
        }

        if (data.customCode) {
            if (data.customCode.trim().indexOf('function') === 0) {
                injectJSString('customCode', data.customCode);
            } else {
                injectJSString(
                    'customCode',
                    'function (options) { ' + data.customCode + '}'
                );
            }
        }

        if (data.globalOptions) {
            injectJSString('globalOptions', data.globalOptions);
        }

        if (data.themeOptions) {
            injectJSString('themeOptions', data.themeOptions);
        }

        if (data.callback) {
            injectJSString('cb', data.callback);
        }

        if (data.dataOptions) {

            injectJSString('dataOptions', data.dataOptions);
        }
    }

    //Build the actual chart
    function buildChart(onDone) {

        var pollTimeout = 2000;
        var pollStart = 0;

        function isDone() {
          return page.evaluate(function () {
            return window.isDoneLoadingImages;
          });
        }

        function pollForImages() {
          pollStart = pollStart || (new Date()).getTime();
          if (!isDone() && (new Date()).getTime() - pollStart < pollTimeout) {
            imagePollTimeout = setTimeout(pollForImages, 0);
          } else {
            onDone();
          }
        }

        if (data.chart) {
            page.evaluate(function (chartJson, constr) {
                var options = chartJson;

                window.isDoneLoadingImages = false;

                function doChart(options) {
                    //Create the actual chart
                    window.chart = new (Highcharts[constr] || Highcharts.Chart)(
                        'highcharts',
                        options || {},
                        typeof cb !== 'undefined' ? cb : false
                    );
                }

                function parseData(completeHandler, chartOptions, dataConfig) {
                    if (dataConfig) {
                        try {
                            dataConfig.complete = completeHandler;
                            Highcharts.data(dataConfig, chartOptions);
                        } catch (error) {
                            completeHandler(undefined);
                        }
                    } else {
                        completeHandler(chartOptions);
                    }
                }

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

                    Highcharts.addEvent(Highcharts.Chart.prototype, 'load', function () {
                      window.isDoneLoadingImages = true;
                    });

                    //document.getElementById('highcharts').innerHTML = JSON.stringify(chartJson, undefined, '  ');

                    if (window['globalOptions']) {
                        Highcharts.setOptions(globalOptions);
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

                            options = __chartData;
                        }

                        if (window.themeOptions && typeof window.themeOptions !== 'undefined' && Object.keys(window.themeOptions).length) {
                            options = Highcharts.merge(true, themeOptions, options);
                        }

                        if (typeof window['dataOptions'] !== 'undefined') {

                            parseData(function (opts) {
                                var mergedOptions;

                                if (options.series) {
                                    Highcharts.each(options.series, function (series, i) {
                                        options.series[i] = Highcharts.merge(series, opts.series[i]);
                                    });
                                }

                                mergedOptions = Highcharts.merge(true, opts, options);

                                if (window['customCode']) {
                                    window.customCode(mergedOptions);
                                }

                                doChart(mergedOptions);
                            }, options, dataOptions);

                        } else if (typeof window['customCode'] !== 'undefined') {
                            customCode(options);
                            doChart(options);
                        } else {
                            doChart(options);
                        }

                    } catch (e) {
                        document.getElementById('highcharts').innerHTML = '<h1>Chart input data error</h1>' + e;
                    }
                }
            }, data.chart, data.constr);
        } else {
          return onDone();
        }

        pollForImages();
    }

    //Applies the style to the svg: <defs><style> goes here </style></defs>
    function applyStyleToSVG() {
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

    function handleForeignObjects() {

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
              //  foreignObjectElem.appendChild(bodyElem);
            }
        });
    }

    function clip() {
        var clipW, clipH;

        clipW = page.evaluate(function (scale) {
                    var svg = document.querySelector('svg');
                    return svg ?
                          (svg.width.baseVal.value * scale) :
                          (600 * scale);
                }, data.scale);

        clipH = page.evaluate(function (scale) {
                    var svg = document.querySelector('svg');
                    return svg ?
                          (svg.height.baseVal.value * scale) :
                          (400 * scale);
                }, data.scale || 1);

        page.clipRect = {
            width: clipW,
            height: clipH,
            top: 0,
            left: 0
        };

        page.viewportSize = {
            width: clipW,
            height: clipH,
            top: 0,
            left: 0
        };

        if (data.format === 'pdf') {
            //Set the page size to fit our chart
            page.paperSize = {
                width: clipW ,
                height: clipH,
                margin: '0px'
            };
        }
    }

    function process(onDone) {
        ////////////////////////////////////////////////////////////////////////
        //CREATE THE CHART

        buildChart(function () {

            if (data.svgstr && !data.chart && data.styledMode) {
                applyStyleToSVG();
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

            //Set up clipping
            clip();
            //Handle foreign object elements
            handleForeignObjects();

            ////////////////////////////////////////////////////////////////////////
            //HANDLE RENDERING

            if (data.format === 'jpeg') {
                page.evaluate(function () {
                    document.body.style.backgroundColor = 'white';
                });
            }

            if (data.format === 'svg') {
                if (data.svgstr && !data.chart) {
                    if (data.svgstr.indexOf('<?xml') >= 0) {
                        fs.write(data.out, data.svgstr, 'w');
                    } else {
                        fs.write(data.out, xmlDoctype + data.svgstr, 'w');
                    }
                } else {
                    //This temporary file nonesense has to go at some point.
                    fs.write(data.out, xmlDoctype + page.evaluate(function (data) {
                        var element = document.body.querySelector('#highcharts').firstChild;
                        //When we're in styled mode, prefer getChartHTML.
                        //getChartHTML will only be defined if the styled libraries are
                        //included, which they always are if the overall
                        //settings are styledMode = true
                        if (data.styledMode && window.chart && window.chart.getChartHTML) {
                            return window.chart.getChartHTML();
                        } else if (window.chart && window.chart.getSVG) {
                          return window.chart.getSVG();
                        }

                        //Fall back to just using the SVG as it is on the page
                        return element ? element.innerHTML : '';
                    }, data).replace(/\n/g, ''), 'w');
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
                }

                //We're done drawing the page, now render it.
                //We should render to /dev/stdout or something eventually to
                //avoid going through the filesystem.
                //We could also render b64 to the out data,
                //but this likely won't work correctly for pdf's.
                //Note that the base64 rendering is much slower than writing to a
                //temporary file...
                if (data.async || data.format === 'pdf') {
                    page.render(data.out, {
                        format: data.format || 'png'
                    });

                    doDone({
                        filename: data.out
                    });
                } else {
                    doDone({
                        data: page.renderBase64(data.format || 'png')
                    });
                }
            }

            // onDone();
        });
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

    //Polls for document.readyState === 'complete'
    function softPoll() {
        var readyState = page.evaluate(function () {
            return document.readyState;
        });

        if (readyState === 'complete') {
            process();
        } else {
            setTimeout(softPoll);
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    clearTimeout(imagePollTimeout);

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

            page.evaluate(function () {
              window.isDoneLoadingImages = false;
            });

            injectRawJS();
            softPoll();
        };
    }

    page.onResourceError = function (err) {
        system.stderr.writeLine('worker.js resource error - ' +
                                JSON.stringify(err, undefined, ' ')
                               );
    };

    page.zoomFactor = parseFloat(data.scale);

     if (data.resources && data.resources.files) {
        data.resources.files.forEach(function (f) {
            if (f.indexOf('http') === 0) {
                jsIncludes += '<script type="text/javascript" src="' + f + '"></script>';
            }
        });
    }

    if (data.svgstr && !data.chart) {

        if (data.svgstr.indexOf('<?xml') >= 0) {
            //There's already an xml start tag..
            page.content = data.svgstr;
        } else {
            page.content = xmlDoctype + data.svgstr;
        }

    } else {
        //Inject the CSS into the template
        if (data.styledMode) {
            cachedCopy = cachedContentStyled.replace('{{css}}', css);
        } else {
            cachedCopy = cachedContent.replace('{{css}}', css);
        }

        //Inject JS includes into template
        //We can't use inject functions because Phantom won't wait for
        //those to be loaded before calling onLoadFinished..

        cachedCopy = cachedCopy.replace('{{js}}', jsIncludes);

        page.content = cachedCopy;
    }

    //Inject required script files
    if (data.resources && data.resources.files) {
        data.resources.files.forEach(function (f) {
            if (f.indexOf('http') !== 0) {
                page.injectJs(f);
            }
        });
    }
}

//Start listening for stdin messages
loop();
