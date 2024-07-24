import { writeFileSync } from 'fs';

import exporter from '../../lib/index.js';

// Export settings with the old options structure (PhantomJS)
// Will be mapped appropriately to the new structure with the mapToNewConfig utility
const exportSettings = {
  type: 'png',
  constr: 'chart',
  outfile: './samples/module/options_phantom.jpeg',
  logLevel: 4,
  scale: 1,
  workers: 1,
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
  try {
    // Map to fit the new options structure
    const mappedOptions = exporter.mapToNewConfig(exportSettings);

    // Set the new options
    const options = exporter.setOptions(mappedOptions);

    // Init a pool for one export
    await exporter.initExport(options);

    // Perform an export
    await exporter.startExport(options, async (error, info) => {
      // Exit process and display error
      if (error) {
        throw error;
      }
      const { outfile, type } = info.options.export;

      // Save the base64 from a buffer to a correct image file
      writeFileSync(
        outfile,
        type !== 'svg' ? Buffer.from(info.result, 'base64') : info.result
      );

      // Kill the pool
      await exporter.killPool();
    });
  } catch (error) {
    // Log the error with stack
    exporter.logWithStack(1, error);

    // Gracefully shut down the process
    await exporter.shutdownCleanUp(1);
  }
};

start();
