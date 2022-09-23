// Include the exporter module
const exporter = require('../../lib/index.js');

// Get the default options
const { mergeConfigOptions } = require('../../lib/utils.js');
const { initDefaultOptions } = require('../../lib/config');
const { defaultConfig } = require('../../lib/schemas/config.js');

// Utility for mapping old format of options to the new one
const { mapToNewConfig } = require('../../lib/utils.js');

// Export settings
const exportSettings = {
  type: 'png',
  constr: 'chart',
  async: true, // Will be removed as it is not supported anymore
  logLevel: 1,
  scale: 1,
  options: {
    title: {
      text: 'My Chart'
    },
    xAxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr']
    },
    plotOptions: {
      series: {
        dataLabels: {
          enabled: true,
          allowOverlap: true
        }
      }
    },
    series: [
      {
        type: 'line',
        data: [1, 3, 2, 4]
      },
      {
        type: 'line',
        data: [5, 3, 4, 2]
      }
    ]
  }
};

const start = async () => {
  // Gather options
  const options = mergeConfigOptions(
    initDefaultOptions(defaultConfig),
    mapToNewConfig(exportSettings),
    ['options']
  );

  // Init a pool for one export
  await exporter.initPool(options);

  // Perform an export
  exporter.startExport(options, (info, error) => {
    // Throw an error
    if (error) {
      throw error;
    }

    // Kill the pool
    exporter.killPool();

    // Display the results
    console.log(info.data);
  });
};

start();
