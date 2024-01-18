import { writeFileSync } from 'fs';

import exporter from '../../lib/index.js';

// Export settings with new options structure (Puppeteer)
const exportSettings = {
  pool: {
    minWorkers: 1,
    maxWorkers: 1
  },
  export: {
    type: 'jpeg',
    constr: 'chart',
    outfile: './samples/module/options_puppeteer.jpeg',
    height: 800,
    width: 1200,
    scale: 1,
    options: {
      chart: {
        type: 'column'
      },
      title: {
        text: 'Puppeteer options structure'
      },
      xAxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr']
      },
      yAxis: [
        {
          className: 'highcharts-color-0',
          title: {
            text: 'Primary axis'
          }
        },
        {
          className: 'highcharts-color-1',
          opposite: true,
          title: {
            text: 'Secondary axis'
          }
        }
      ],
      plotOptions: {
        series: {
          dataLabels: {
            enabled: true,
            allowOverlap: true,
            formatter: function () {
              return `${this.series.name}: ${this.y}`;
            }
          }
        }
      },
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
    callback: './samples/resources/callback.js',
    customCode: './samples/resources/custom_code.js',
    resources: {
      js: "Highcharts.charts[0].update({xAxis: {title: {text: 'Resources axis title'}}});",
      css: '.highcharts-yaxis .highcharts-axis-line { stroke-width: 2px; } .highcharts-color-0 { fill: #f7a35c; stroke: #f7a35c; }'
    }
  }
};

const start = async () => {
  // Set the new options
  const options = exporter.setOptions(exportSettings);

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
