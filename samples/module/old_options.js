// Include the exporter module
const exporter = require('../../lib/index.js');
const { mapToNewConfig } = require('../../lib/utils.js');

// Export settings
const exportSettings = {
  type: 'png',
  constr: 'chart',
  outfile: 'module_test.png',
  async: true, // Will be removed as it is not supported anymore
  options: {
    title: {
      text: 'My Chart'
    },
    xAxis: {
      categories: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mar',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ]
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
  // Init a pool for one export
  await exporter.initPool();

  // Perform an export
  exporter.startExport(mapToNewConfig(exportSettings), (info, error) => {
    // Throw an error
    if (error) {
      throw error;
    }
    console.log(info.data);

    // Kill the pool
    exporter.killPool();
  });
};

start();
