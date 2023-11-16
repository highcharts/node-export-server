import { writeFileSync } from 'fs';

import exporter from '../../lib/index.js';

const exportCharts = async (charts, exportOptions = {}) => {
  // Set the new options
  const options = exporter.setOptions(exportOptions);

  // Init the pool
  await exporter.initPool(options);

  const promises = [];
  const chartResults = [];

  // Start exporting charts
  charts.forEach((chart) => {
    promises.push(
      new Promise((resolve, reject) => {
        const settings = { ...options };
        settings.export.options = chart;

        exporter.startExport(settings, (info, error) => {
          if (error) {
            return reject(error);
          }

          // Add the data to the chartResults
          chartResults.push(info.data);
          resolve();
        });
      })
    );
  });

  return Promise.all(promises)
    .then(() => {
      exporter.killPool();
      return Promise.resolve(chartResults);
    })
    .catch((error) => {
      exporter.killPool();
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
    logging: {
      level: 4
    }
  }
)
  .then((charts) => {
    // Result of export is in charts, which is an array of base64 encoded files
    charts.forEach((chart, index) => {
      // Save the base64 from a buffer to a correct image file
      writeFileSync(
        `./samples/module/promise_${index + 1}.jpeg`,
        Buffer.from(chart, 'base64')
      );
    });
    exporter.log(4, 'All done!');
  })
  .catch((error) => {
    exporter.log(4, `Something went wrong: ${error.message}`);
  });
