import { writeFileSync } from 'fs';

import exporter from '../../lib/index.js';

// Export settings with the old options structure (PhantomJS)
// Will be mapped appropriately to the new structure with the mapToNewConfig utility
const exportSettings = {
  type: 'png',
  constr: 'chart',
  outfile: './samples/module/options_phantom.jpeg',
  async: true, // Will be removed as it is not supported anymore
  logLevel: 4,
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
  // Map to fit the new options structure
  const mappedOptions = exporter.mapToNewConfig(exportSettings);

  // Set the new options
  const options = exporter.setOptions(mappedOptions);

  // Init a pool for one export
  await exporter.initPool(options);

  // Perform an export
  exporter.startExport(options, (info, error) => {
    // Exit process and display error
    if (error) {
      exporter.log(1, error.message);
      process.exit(1);
    }
    const { outfile, type } = info.options.export;

    // Save the base64 from a buffer to a correct image file
    writeFileSync(
      outfile,
      type !== 'svg' ? Buffer.from(info.data, 'base64') : info.data
    );

    // Kill the pool
    exporter.killPool();
  });
};

start();
