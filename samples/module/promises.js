/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { writeFileSync } from 'fs';

import exporter, { initExport } from '../../lib/index.js';

const exportCharts = async (charts, initOptions) => {
  // Init the pool
  await initExport(initOptions);

  const promises = [];
  const chartResults = [];

  // Start exporting charts
  charts.forEach((options) => {
    promises.push(
      new Promise((resolve, reject) => {
        exporter.startExport(
          {
            export: {
              options
            }
          },
          (error, data) => {
            if (error) {
              return reject(error);
            }

            // Add the data to the chartResults
            chartResults.push(data.result);
            resolve();
          }
        );
      })
    );
  });

  return Promise.all(promises)
    .then(async () => {
      await exporter.killPool();
      return Promise.resolve(chartResults);
    })
    .catch(async (error) => {
      await exporter.killPool();
      return Promise.reject(error);
    });
};

// Export a couple of charts
exportCharts(
  [
    {
      title: {
        text: 'Chart 1'
      },
      series: [
        {
          data: [1, 2, 3]
        }
      ]
    },
    {
      title: {
        text: 'Chart 2'
      },
      series: [
        {
          data: [3, 2, 1]
        }
      ]
    }
  ],
  {
    pool: {
      minWorkers: 2,
      maxWorkers: 2
    },
    logging: {
      level: 4,
      toFile: false
    }
  }
)
  .then((charts) => {
    // Result of export is in charts, which is an array of base64 encoded files
    charts.forEach((chart, index) => {
      // Save the base64 from a buffer to a correct image file
      writeFileSync(
        `./samples/module/promise${index + 1}.jpeg`,
        Buffer.from(chart, 'base64')
      );
    });
    exporter.log(4, '[promises] All done!');
  })
  .catch((error) => {
    exporter.logWithStack(1, error, '[promises] Something went wrong!');
  });
