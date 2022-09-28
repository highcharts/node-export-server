/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

require('colors');

const spawn = require('child_process').exec;
const { join } = require('path');
const fs = require('fs');

const { clearText } = require('../lib/utils.js');

const tempPath = join(__dirname, '_temp');
const testPath = join(__dirname, 'options');
const newResultsPath = join(__dirname, '_results');

// Urls of Puppeteer and PhantomJS export servers
const urls = ['http://127.0.0.1:7801', 'http://127.0.0.1:7802'];

console.log(
  'Highcharts Export Server Side By Side comparator'.yellow,
  `\nPuppeteer: ${urls[0]}`.bold.green,
  `\nPhantomJS: ${urls[1]}\n`.bold.blue
);

// Create results folder if doesn't exist
!fs.existsSync(newResultsPath) && fs.mkdirSync(newResultsPath);

// Start to read demos files
fs.readdir(testPath, async (error, files) => {
  // Remove from the previous call
  fs.rmSync(tempPath, { recursive: true, force: true });

  for (const file of files) {
    try {
      // Read a file
      const content = clearText(
        fs.readFileSync(join(testPath, file)).toString(),
        /\s\s+/g,
        ''
      );

      // Run for all servers
      for (const [index, url] of urls.entries()) {
        // And all types
        for (const type of ['png', 'jpeg', 'svg', 'pdf']) {
          // Results filename
          const filename =
            (index ? 'phantom_' : 'puppeteer_') +
            `${file.replace('.json', '')}.${type}`;

          // Results folder path
          const resultsFile = join(newResultsPath, filename);
          const startDate = new Date().getTime();

          if (file.endsWith('.json')) {
            const fileData = JSON.parse(content);

            // Complete the curl command
            let command = [
              'curl',
              '-H "Content-Type: application/json"',
              '-X POST'
            ];

            let payload;
            let { infile, svg } = fileData;

            // Check if this is simply chart options or payload body
            if (!infile && !svg) {
              payload = JSON.stringify({
                type,
                infile: fileData,
                scale: 2,
                callback:
                  "function(chart) {chart.renderer.label('This label is added in the callback', 100, 100).attr({fill: '#90ed7d', padding: 10, r: 10, zIndex: 10}).css({color: 'black', width: '100px'}).add();}"
              });

              // Stringify again for a correct format for both Unix and Windows
              command.push('-d', JSON.stringify(payload));
            } else {
              // Create temp folder if doesn't exist
              !fs.existsSync(tempPath) && fs.mkdirSync(tempPath);
              const jsonFile = join(
                tempPath,
                `${file.replace('.json', '')}_${type}.json`
              );

              // Save with updated type
              fs.writeFileSync(
                jsonFile,
                JSON.stringify({
                  ...fileData,
                  type
                })
              );

              // Use the --data-binary if payload body found
              command.push('--data-binary', `"@${jsonFile}"`);
            }

            // Complete the curl command
            command = command.concat([url, '-o', resultsFile]).join(' ');

            // Launch command in a new process
            proc = spawn(command);
            proc.on('close', () => {
              const message = clearText(
                (index ? '[PhantomJS] ' : '[Puppeteer] ') +
                  `Done with file: ${file}, took
                ${new Date().getTime() - startDate}ms.`
              );
              console.log(index ? message.blue : message.green);
            });
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }
});
