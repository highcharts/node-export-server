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

const log = require('./logger.js').log;
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const chart = require('./chart.js');
const fs = require('fs');
const formData = require("express-form-data");
const cors = require('cors');

const mime = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'application/pdf': 'pdf',
    'image/svg+xml': 'svg'
};  

var rc = 0;

app.use(cors());
app.use(formData.parse());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({type: 'multipart/form-data', extended: false }));
app.use(bodyParser.json());

app.post('/', function (req, res) {
    if (!req.body) return res.send('Body is required');
    //if (!req.body.infile) return res.send('infile property is required!');

    var id = ++rc;

    chart({
            outfile: 'tmp/tmp.' + id + '.' + (mime[req.body.type] || 'png'),
            instr: req.body.infile,
            constr: req.body.constr,
            type: req.body.type || 'png',
            scale: req.body.scale,
            width: req.body.width,
            svg: req.body.svg,
            callback: req.body.callback || false
          }, 
          function (err, info) {

            if (!info || !info.filename) {
                log(1, 'return from chart is not even wrong. request', id);
                return res.send('error generating');
            }

            //need to convert to using pipes, this is silly.
            fs.readFile(info.filename, function (err, data) {
                if (err) {
                    log(1, err);
                    return res.send('error generating - check your json');  
                } 

                res.header('Content-Type', req.body.type || 'image/png');
                
                if (!req.body.noDownload) {
                    res.attachment( (req.body.filename || 'chart') + '.' + ( mime[req.body.type] || 'png'));                    
                }
               
                res.send(data);

                fs.unlink(info.filename, function (err) {
                    if (err) return log(1, 'error when deleting temporary file:', err);                    
                });
            });
        }
    );
});

module.exports = {
    //Start the server
    start: function (port) {
        app.listen(port, function () {
            log(3, 'server started on port', port);
        });
    }
};