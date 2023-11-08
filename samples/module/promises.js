import exporter from '../../lib/index.js';
import { mergeConfigOptions, setOptions } from '../../lib/config.js';

const exportCharts = async (charts, exportOptions = {}) => {
  // Set the new options
  const initOptions = setOptions();

  // Init the options
  const allOptions = mergeConfigOptions(initOptions, exportOptions);

  // Init the pool
  await exporter.initPool(allOptions);

  const promises = [];
  const chartResults = [];

  // Start exporting charts
  charts.forEach((chart) => {
    promises.push(
      new Promise((resolve, reject) => {
        const settings = { ...allOptions };
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
      level: 1
    }
  }
)
  .then((charts) => {
    // Result of export is in charts, which is an array of base64 encoded files
    charts.forEach((chart, index) => {
      console.log(`${index}. ${chart}\n`);
    });
    console.log('All done!');
  })
  .catch((error) => {
    console.log(`Something went wrong: ${error}`);
  });
