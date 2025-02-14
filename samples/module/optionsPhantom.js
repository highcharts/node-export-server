/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import exporter, { initExport } from '../../lib/index.js';

// Old options structure (PhantomJS)
const oldOptions = {
  options: {
    chart: {
      type: 'column'
    },
    title: {
      text: 'PhantomJS options structure'
    },
    xAxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr']
    },
    yAxis: [
      {
        title: {
          text: 'Primary axis'
        }
      },
      {
        opposite: true,
        title: {
          text: 'Secondary axis'
        }
      }
    ],
    series: [
      {
        yAxis: 0,
        data: [1, 3, 2, 4]
      },
      {
        yAxis: 1,
        data: [5, 3, 4, 2]
      }
    ]
  },
  outfile: './samples/module/optionsPhantom.png',
  type: 'png',
  constr: 'chart',
  width: 1000,
  scale: 1,
  globalOptions: './samples/resources/optionsGlobal.json',
  allowFileResources: true,
  callback: './samples/resources/callback.js',
  resources: './samples/resources/resources.json',
  fromFile: './samples/resources/customOptions.json',
  workers: 1,
  workLimit: 5,
  logLevel: 4,
  logFile: 'phantom.log',
  logDest: './samples/module/log',
  logToFile: false
};

(async () => {
  try {
    // Map to fit the new options structure (Puppeteer)
    const newOptions = exporter.mapToNewOptions(oldOptions);

    // Init a pool for one export
    await initExport(newOptions);

    // Perform an export
    await exporter.singleExport(newOptions);
  } catch (error) {
    // Log the error with stack
    exporter.logWithStack(1, error);

    // Gracefully shut down the process
    await exporter.shutdownCleanUp(1);
  }
})();
