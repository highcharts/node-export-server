const { writeFileSync } = require('fs');

// Include the exporter module
const exporter = require('../../lib/index.js');

// Get the default options
const { mergeConfigOptions } = require('../../lib/utils.js');
const { initDefaultOptions } = require('../../lib/config');
const { defaultConfig } = require('../../lib/schemas/config.js');

// Export settings with new options structure (Puppeteer)
const exportSettings = {
  export: {
    type: 'jpeg',
    constr: 'chart',
    outfile: './samples/module/new_options.jpeg',
    height: 800,
    width: 1200,
    scale: 2,
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
            allowOverlap: true,
            formatter: function () {
              return `${this.series.name}${this.y}`;
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
          type: 'line',
          data: [5, 3, 4, 2]
        }
      ]
    },
    globalOptions: {
      chart: {
        borderWidth: 2,
        plotBackgroundColor: 'rgba(255, 255, 255, .9)',
        plotBorderWidth: 1,
        plotShadow: true
      },
      subtitle: {
        text: 'Global options subtitle'
      }
    },
    themeOptions: {
      colors: [
        '#058DC7',
        '#50B432',
        '#ED561B',
        '#DDDF00',
        '#24CBE5',
        '#64E572',
        '#FF9655',
        '#FFF263',
        '#6AF9C4'
      ],
      chart: {
        backgroundColor: {
          linearGradient: [0, 0, 500, 500],
          stops: [
            [0, 'rgb(123, 142, 200)'],
            [1, 'rgb(156, 122, 213)']
          ]
        }
      },
      subtitle: {
        text: 'Theme options subtitle',
        style: {
          color: '#666666',
          font: 'bold 12px Trebuchet MS, Verdana, sans-serif'
        }
      },
      legend: {
        itemStyle: {
          font: '9pt Trebuchet MS, Verdana, sans-serif',
          color: 'black'
        }
      }
    }
  },
  customCode: {
    allowCodeExecution: true,
    allowFileResources: true,
    callback: './samples/cli/callback.js',
    customCode: './samples/cli/custom_code.js',
    resources: {
      js: "Highcharts.charts[0].update({title: {text: 'Resources title'}});",
      css: '.highcharts-yaxis .highcharts-axis-line { stroke-width: 1px; stroke: #90ed7d; };'
    }
  }
};

const start = async () => {
  // Gather options
  const options = mergeConfigOptions(
    initDefaultOptions(defaultConfig),
    exportSettings,
    ['options', 'globalOptions', 'themeOptions', 'resources']
  );

  // Init a pool for one export
  await exporter.initPool(options);

  // Perform an export
  exporter.startExport(options, (info, error) => {
    // Exit process when error
    if (error) {
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
