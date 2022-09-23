/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const spawn = require('child_process').exec;
const { join } = require('path');
const fs = require('fs');

const { clearText } = require('../lib/utils.js');

const testPath = join(__dirname, '..', 'options');
const tempPath = join(__dirname, '..', '_temp');

// Urls of Puppeteer and PhantomJS export servers
const urls = ['http://127.0.0.1:7801' /*, 'http://127.0.0.1:7802'*/];

// Create temp folder if doesn't exist
!fs.existsSync(tempPath) && fs.mkdirSync(tempPath);

// Start to read demos files
fs.readdir(testPath, async (error, files) => {
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
          // Temp folder path
          const tempFile = join(tempPath, `${file}.${index}.${type}`);
          const startDate = new Date().getTime();

          if (file.indexOf('.json') > 0 || file.indexOf('.svg') > 0) {
            const jsonData =
              file.indexOf('.json') > 0 ? JSON.parse(content) : content;

            let { infile, ...serverOptions } = jsonData;

            // Check if there are extra body options or simply chart options
            if (!infile) {
              infile = jsonData;
              serverOptions = [];
            }

            // Create payload
            const payload = JSON.stringify({
              type,
              infile,
              scale: 2,
              allowCodeExecution: true,
              callback:
                "function(chart) {chart.renderer.label('This label is added in the callback', 100, 100).attr({fill: '#90ed7d', padding: 10, r: 10, zIndex: 10}).css({color: 'black', width: '100px'}).add();}",
              ...serverOptions
            });

            // Complete the curl command
            let command = [
              'curl',
              '-H "Content-Type: application/json"',
              '-X POST',
              '-d',
              // Stringify again for a correct format for both Unix and Windows
              JSON.stringify(payload)
            ]
              .concat([url, '-o', tempFile])
              .join(' ');

            // Launch command in a new process
            proc = spawn(command);
            proc.on('close', () => {
              const message = clearText(
                `[${index}] done with file: ${file}, took
                ${new Date().getTime() - startDate}ms.`
              );
              console.log(message);

              // The old phantom stuff spits out base64, so we need to open the
              // result and convert it
              if (index === 1 && type !== 'svg' && type !== 'pdf') {
                fs.readFile(tempFile, (error, res) => {
                  if (error) {
                    return console.log(error);
                  }

                  fs.writeFile(
                    tempFile,
                    Buffer.from(res.toString(), 'base64'),
                    (error) => {
                      if (error) {
                        return console.log(error);
                      }
                    }
                  );
                });
              }
            });
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }
});
