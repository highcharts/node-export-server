/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/
import { join } from 'path';

import exporter, { initExport } from '../../lib/index.js';
import { __projDir } from '../../lib/utils.js';

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
  outfile: join(__projDir, './samples/module/optionsPhantom.png'),
  type: 'png',
  constr: 'chart',
  width: 1000,
  scale: 1,
  globalOptions: join(__projDir, './samples/resources/optionsGlobal.json'),
  allowFileResources: true,
  callback: join(__projDir, './samples/resources/callback.js'),
  resources: join(__projDir, './samples/resources/resources.json'),
  fromFile: join(__projDir, './samples/resources/customOptions.json'),
  workers: 1,
  workLimit: 5,
  logLevel: 4,
  logFile: 'phantom.log',
  logDest: join(__projDir, './samples/module/log'),
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
