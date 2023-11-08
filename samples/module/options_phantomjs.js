import exporter from '../../lib/index.js';
import {
  mapToNewConfig,
  mergeConfigOptions,
  setOptions
} from '../../lib/config.js';

// Export settings with the old options structure (PhantomJS)
// Will be mapped appropriately to the new structure with the mapToNewConfig utility
const exportSettings = {
  type: 'png',
  constr: 'chart',
  async: true, // Will be removed as it is not supported anymore
  logLevel: 1,
  scale: 1,
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
  }
};

const start = async () => {
  // Set the new options
  const initOptions = setOptions();

  // Gather options
  const options = mergeConfigOptions(
    initOptions,
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
