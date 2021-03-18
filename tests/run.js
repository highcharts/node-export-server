#!/usr/bin/env node

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

const testPath = __dirname;
const fs = require('fs');
const files = fs.readdirSync(testPath);
const exporter = require('../lib/index.js');

var funs = [];
var fails = 0;

require('colors');

exporter.initPool({});
exporter.logLevel(4);

console.log('Highcharts Export Server Automagic Test Runner'.yellow);
console.log(
  'Loads all JSON files in the test folder and runs them. Results are stored in ./results.'
);

console.log('');

Promise.all(
  files
    .filter(
      (file) => file.length > 5 && file.indexOf('.json') === file.length - 5
    )
    .map(
      (file) =>
        new Promise((resolve, reject) => {
          console.log(`[test runner] Processing test ${file}`.bold);

          const st = new Date().getTime();

          const options = require(testPath + '/' + file);

          options.outfile =
            __dirname + '/results/' + file.replace('.json', '.png');
          options.async = true;
          options.reqID = file;

          exporter.export(options, (err, result, status, t) => {
            const et = new Date().getTime();

            console.log(
              `[test runner] Done with ${file} - time: ${
                et - st
              }ms: err: ${err}`.bold
            );
            return err ? reject(err) : resolve();
          });
        })
    )
)
  .then(() => console.log('All done!'))
  .catch((e) => console.log(e));
