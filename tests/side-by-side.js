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
const spawn = require('child_process').exec;
const urls = [
    'http://127.0.0.1:7801',
    'http://127.0.0.1:7802'
];

const types = [
    'png',
    'jpeg',
    'svg',
    'pdf'
];

fs.readdir(__dirname + '/../testcharts/', function (err, files) {
    files.forEach(function (file) {        

        fs.readFile(__dirname + '/../testcharts/' + file, function (err, data) {
            if (err) return console.log(err);

            data = data.toString().trim()

            urls.forEach(function (url, i) {
                var cmd = '', payload;

                types.forEach(function (type) {
                    var reqStart = (new Date()).getTime();
                
                    if (file.indexOf('.json') > 0 || file.indexOf('.svg') > 0) {

                        payload = {
                            scale: 3.5,
                            //width: 100,
                            type: type,
                            infile: data.replace(/\'/g, ""),
                            callback: 'function(chart) {chart.renderer.label("This label is added in the callback", 100, 100).attr({fill : "#90ed7d",padding: 10,r: 10,zIndex: 10}).css({color: "black",width: "100px"}).add();}'
    
                        };

                        cmd = [
                            'curl',
                            '-H "Content-Type: application/json"',
                            "-X POST",
                            '-d'
                        ];

                        cmd.push("'" + JSON.stringify(payload) + "'");
                                            
                        cmd = cmd.concat([url,
                            '-o',
                            'tmp/' + file + '.' + i + '.' + type
                        ]).join(' ');

                        proc = spawn(cmd);

                        proc.on('close', function (code) {
                            console.log(i, 'done with', file, 'took', (new Date()).getTime() - reqStart, 'ms', code);

                            //The old phantom stuff spits out base64, so we need to open the result
                            //and convert it..
                            if (i === 1 && type !== 'svg' && type !== 'pdf') {
                                fs.readFile('tmp/' + file + '.' + i + '.' + type, function (err, res) {
                                    if (err) return console.log(err);
                                    fs.writeFile('tmp/' + file + '.' + i + '.' + type, Buffer.from(res.toString(), 'base64'), function (err) {
                                        if (err) return console.log(err);
                                    });
                                });                                
                            }
                        });
                    }
                });
            });
        });
    });
});