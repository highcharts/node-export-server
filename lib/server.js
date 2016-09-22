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

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/', function (req, res) {
    if (!req.body) return res.send('Body is required');
    if (!req.body.infile) return res.send('infile property is required!');

    chart({
            outfile: 'tmp/tmp.png',
            instr: req.body.infile
          }, 
          function (err, info) {
           // res.set('Content-Type', 'image/png');
           // res.send(info);
            // //need to convert to using pipes, this is silly.
            fs.readFile(info.filename, function (err, data) {
                if (err) {
                    log(1, err);
                    return res.send('error generating - check your json');  
                } 
                res.send(data);
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