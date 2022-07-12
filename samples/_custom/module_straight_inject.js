const { writeFileSync } = require('fs');

// Include the exporter module
const exporter = require('./../../lib/index.js');

// Export settings
const exportSettings = {
  customCode: {
    allowCodeExecution: true
  },
  export: {
    instr: {
      title: {
        text: 'My Chart'
      },
      plotOptions: {
        series: {
          dataLabels: {
            enabled: true,
            formatter: function () {
              return this.series.name + '' + this.y;
            }
          }
        }
      },
      series: [
        {
          type: 'line',
          data: [1, 3, 2, 4]
        },
        {
          type: 'column',
          data: [5, 3, 4, 2]
        }
      ]
    }
  }
};

const start = async () => {
  // Init a pool for one export
  await exporter.initPool(exportSettings);

  // Perform an export
  exporter.startExport(exportSettings, (info, error) => {
    // Exit process when error
    if (error) {
      exporter.log(1, `[cli] ${error.message}`);
      process.exit(1);
    }

    const { outfile, type } = info.options.export;

    // Save the base64 from a buffer to a correct image file
    writeFileSync(
      outfile || 'chart.png',
      type !== 'svg' ? Buffer.from(info.data, 'base64') : info.data
    );

    // Kill the pool
    exporter.killPool();
  });
};

start();
