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
const log = require('./logger.js').log;
const express = require('express');
const http = require('http');
const https = require('https');
const app = express();
const bodyParser = require('body-parser');
const chart = require('./chart.js');
const formData = require('express-form-data');
const cors = require('cors');
const uuid = require('uuid/v4');
const RateLimit = require('express-rate-limit');

const mime = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'image/svg+xml': 'svg'
};

const mimeReverse = {
    'png': 'image/png',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'svg': 'image/svg+xml'
};

var rc = 0,
    beforeRequest = [],
    afterRequest = [],
    tmpDir = false,
    limiter = function (req, res, next) {
        next();
    }
;

function doCallbacks(which, req, res, data, id, uniqueid, type) {
    var res = true;

    which.some(function (fn) {
        var cres;
        if (fn) {
            cres = fn(req, res, data, id, uniqueid, type);
            if (cres !== undefined && cres !== true) {
                res = cres;
                return true;
            } else {
                return true;
            }
        }
    });

    return res;
}

app.use(cors());
app.use(formData.parse({
    maxFieldsSize: '50mb'
}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
//application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
app.use(bodyParser.urlencoded({ type: 'multipart/form-data', extended: false, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));

app.use('/charts', express.static('tmp/'));

app.get('/health', function (req, res) {
    res.send('OK');
});

function enableRateLimiting(options) {
    var msg = 'Too many requests, you have been rate limited. Please try again later.',
        op = {
            max: options.max || 30,
            window: options.window || 1,
            delay: options.delay || 0,
            trustProxy: options.trustProxy || false,
            skipKey: options.skipKey || false,
            skipToken: options.skipToken || false
        }
    ;

    log(3,
        'enabling rate limiting:',
        op.max,
        'requests per.',
        op.window,
        'minute per. IP'
    );

    if (op.trustProxy) {
        log(3, 'trusting proxy');
        app.enable('trust proxy');
    }

    limiter = new RateLimit({
      windowMs: op.window * 60 * 1000,
      max: op.max, // limit each IP to 100 requests per windowMs
      delayMs: op.delay, // disable delaying - full speed until the max limit is reached
      handler: function (req, res) {
        res.format({
            json: function () {
                res.status(429).send({message: msg});
            },
            default: function () {
                res.status(429).send(msg);
            }
        });
      },
      skip: function (req, res) {
        //We allow bypassing the limiter if a valid key/token has been sent
        if (op.skipKey !== false &&
            op.skipToken !== false &&
            req.query.key === op.skipKey &&
            req.query.access_token === op.skipToken
        ) {
            log(4, 'skipping rate limiter');
            return true;
        }
        return false;
      }
    });
}

 //Flush temporary files in t minutes
function flushIn(t, filename) {
    if (!t) {
        return;
    }

    setTimeout(function () {
        if (filename) {
            fs.unlink(filename, function (err) {
                if (err) return log(1, 'error when deleting temporary file:', err);
            });
        }
    }, t * 60 * 1000);
}

function handlePost(req, res) {
    var cres = false;
    var id = ++rc;
    var uniqueid = uuid().replace(/\-/g, '');
    var type = (mime[req.body.type] || 'png');
    var connectionAborted = false;

    if (!req.body) return res.status(400).send('Body is required. Sending a body? Make sure your Content-type header is correct. Accepted is application/json and multipart/form-data.');

    if (!req.body.infile && !req.body.options && !req.body.svg && !req.body.data) {
        log(2,
            'request',
            uniqueid,
            'from',
            req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            'was empty:',
            JSON.stringify(req.body, undefined, '  '),
            'headers:',
            JSON.stringify(req.headers, undefined, '  ')
        );

        return res.status(400).send('No chart data found. Please make sure you are using application/json or multipart/form-data headers, and that the chart data is in the options attribute if sending JSON.');
    }

    cres = doCallbacks(beforeRequest, req, res, req.body, id, uniqueid, type);
    if (cres !== true) {
        //Block request
        return res.send(cres);
    }

    log(4, 'got incoming HTTP request', uniqueid);

    req.on('close', function () {
      connectionAborted = true;
    });

    chart({
            outfile: 'tmp/' + (req.params.filename || ('chart.' + uniqueid + '.' + type)),
            instr: req.body.infile || req.body.options || req.body.data,
            constr: req.body.constr,
            type: req.body.type || 'png',
            scale: req.body.scale,
            width: req.body.width || false,
            svg: req.body.svg,
            resources: req.body.resources || false,
            callback: req.body.callback || false,
            styledMode: req.body.styledMode || false,
            asyncRendering: req.body.asyncRendering || false,
            globalOptions: req.body.globaloptions || req.body.globalOptions || false,
            themeOptions: req.body.themeoptions || req.body.themeOptions || false,
            customCode: req.body.customcode || req.body.customCode || false,
            dataOptions: req.body.dataoptions || req.body.dataOptions || false,
            tmpdir: tmpDir,
            async: req.body.async || false,
            reqID: uniqueid
          },
          function (err, info, status) {

            if (info && info.filename) {
                flushIn(15, info.filename);
            }

            if (connectionAborted) {
              // If the connection was closed, do nothing
              log(3, 'the client closed the connection before the chart was done processing');
              return;
            }

            if (err) {
                log(1, 'work', uniqueid, 'could not be completed, sending:', err);
                return res.status(status || 400).send(err);
            }

            if (!info || (!info.filename && !info.data)) {
                log(1, 'return from chart is not even wrong. request', uniqueid, 'is', info);
                return res.status(400).send('unexpected return from chart generation - please check your input data');
            }

            doCallbacks(afterRequest, req, res, {
                data: req.body.data,
                filename: info.filename
            }, id);

            if (req.body.async && info.filename) {
                return res.send('charts/' + info.filename.substr(info.filename.lastIndexOf('/') + 1));
            } else if (info.data) {

                if (!req.body.noDownload) {
                    res.attachment( (req.body.filename || 'chart') + '.' + ( mime[req.body.type] || req.body.type || 'png'));
                }

                if (req.body.b64) {
                    return res.send(info.data);
                }

                res.header('Content-Type', req.body.type || 'image/png');
                return res.send(Buffer.from(info.data, 'base64'));
            }

            //need to convert to using pipes, this is silly.
            fs.readFile(info.filename, function (err, data) {
                if (err) {
                    log(1, uniqueid, err);
                    return res.status(400).send('error generating - check your json');
                }

                if (!req.body.noDownload) {
                    res.attachment( (req.body.filename || 'chart') + '.' + ( mime[req.body.type] || req.body.type || 'png'));
                }

                if (req.body.b64) {
                    res.send(data.toString('base64'));
                } else {
                    res.header('Content-Type', req.body.type || 'image/png');
                    res.send(data);
                }
            });
        }
    );
}

//Sets up route handling for chart conversions
function setup () {
    //Main route
    app.post('/', limiter, handlePost);

    //Compatibility route
    app.post('/json/:filename', limiter, handlePost);

    //Shorthand - :filename becomes the filename to return
    app.post('/:filename', limiter, handlePost);
}

module.exports = {
    //Start the server
    start: function (port, sslPort, sslPath, fn, sslOnly, newTmpDir, host) {
        var httpServer = http.createServer(app),
            httpsServer
        ;

        tmpDir = newTmpDir || tmpDir;

        function errorHandler(err, socket) {
          log(1, 'socket error:', err);
          // socket.end('HTTP/1.1 400 Bad request\r\n\r\n');
        }

        httpServer.on('clientError', errorHandler);
        httpServer.on('error', errorHandler);

        httpServer.on('connection', function (socket) {
          socket.on('error', function (err) {
            errorHandler(err, socket);
          });
        });

        setup();

        port = port || 80;
        sslPort = sslPort || 443;

        if (!sslOnly) {
            httpServer.listen(port, host);
        }

        function handleSSLLoadError(err) {
            log(1, 'error loading SSL certs:', err);
            if (sslOnly) {
                log(1, 'running in SSL mode only, but failed to load certs - No server started!');
            } else {
                log(1, 'HTTPS server NOT started');
            }
        }

        //Try to start the https server too
        if (sslPath) {
            if (sslPath && sslPath[sslPath.length - 1] !== '/') {
               sslPath += '/';
            }

            fs.readFile(sslPath + 'server.key', function (err, skey) {
                if (err) return handleSSLLoadError(err);
                fs.readFile(sslPath + 'server.crt', function (err, cert) {
                    if (err) return handleSSLLoadError(err);
                    httpsServer = https.createServer({
                        key: skey,
                        cert: cert
                    }, app);

                    httpsServer.on('clientError', errorHandler);
                    httpsServer.on('error', errorHandler);

                    httpsServer.listen(sslPort);
                    log(3, 'https server started on port', sslPort);

                    if (fn && sslOnly) {
                        fn(httpServer);
                    }
                });
            });
        }

        if (!sslOnly) {
            if (fn) {
                fn(httpServer);
            }

            log(3, 'http server started on', (host || '0.0.0.0') + ':' + port);
        }

        if (sslOnly && !sslPath) {
            log(1, 'no server started!');
            log(1, 'running in SSL mode only, but no path to certificates set! use --sslPath <path>');
        }
    },

    setup: setup,

    express: function () {
        return express;
    },

    app: function () {
        return app;
    },

    use: function (a, b) {
        app.use(a, b);
    },

    get: function (path, fn) {
        app.get(path, fn);
    },

    post: function (path, fn) {
        app.post(path, fn);
    },

    setTempDir: function (ndir) {
      tmpDir = ndir;
    },

    enableRateLimiting: enableRateLimiting,

    useFilter: function (when, fn) {
        if (when === 'beforeRequest') {
            beforeRequest.push(fn);
        } else {
            afterRequest.push(fn);
        }
    }
};
