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
const formData = require("express-form-data");
const cors = require('cors');
const uuid = require('node-uuid');

const mime = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'image/svg+xml': 'svg'
};  

const mimeReverse = {
    'png' : 'image/png',
    'jpeg' : 'image/jpeg',
    'gif' : 'image/gif',
    'pdf' : 'application/pdf',
    'svg' : 'image/svg+xml'
};  

var rc = 0;

app.use(cors());
app.use(formData.parse());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({type: 'multipart/form-data', extended: false }));
app.use(bodyParser.json());

app.use('/charts', express.static(__dirname + '/../tmp'));

app.post('/', function (req, res) {
    if (!req.body) return res.send('Body is required');
    //if (!req.body.infile) return res.send('infile property is required!');

    var id = ++rc;

    log(4, 'got incoming HTTP request');

    chart({
            outfile: 'tmp/chart.' + uuid.v4().replace(/\-/g, '') + '.' + (mime[req.body.type] || 'png'),
            instr: req.body.infile || req.body.options,
            constr: req.body.constr,
            type: req.body.type || 'png',
            scale: req.body.scale,
            width: req.body.width || false,
            svg: req.body.svg,
            resources: req.body.resources || false,
            callback: req.body.callback || false
          }, 
          function (err, info) {

            if (!info || !info.filename) {
                log(1, 'return from chart is not even wrong. request', id);
                return res.send('error generating');
            }

            if (req.body.async && !req.body.b64) {
                return res.send('charts/' + info.filename.substr(info.filename.lastIndexOf('/') + 1));
            }

            //need to convert to using pipes, this is silly.
            fs.readFile(info.filename, function (err, data) {
                if (err) {
                    log(1, err);
                    return res.send('error generating - check your json');  
                } 

                
                if (!req.body.noDownload) {
                    res.attachment( (req.body.filename || 'chart') + '.' + ( mime[req.body.type] || 'png'));                    
                }

                if (req.body.b64) {
                    res.send(data.toString('base64'));                    
                } else {
                    res.header('Content-Type', req.body.type || 'image/png');
                    res.send(data);                    
                }
               
                fs.unlink(info.filename, function (err) {
                    if (err) return log(1, 'error when deleting temporary file:', err);                    
                });
            });
        }
    );
});

module.exports = {
    //Start the server
    start: function (port, sslPort) {
        var httpServer = http.createServer(app),
            httpsServer
        ;

        sslPort = sslPort || 443;

        httpServer.listen(port);
        

        //Try to start the https server too
        fs.readFile(__dirname + '/../ssl/server.key', function (err, skey) {
            if (err) return;
            fs.readFile(__dirname + '/../ssl/server.crt', function (err, cert) {
                httpsServer = https.createServer({
                    key: skey,
                    cert: cert
                }, app);

                httpsServer.listen(sslPort);
                log(3, 'https server starte on port', sslPort);
            });
        });

        log(3, 'http server started on port', port);        
    }
};