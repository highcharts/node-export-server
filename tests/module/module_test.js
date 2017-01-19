//Include the exporter module
const exporter = require('./../../lib/index.js');

//Export settings 
var exportSettings = {
    type: 'png',
    outfile: 'module_test.png',
    async: true,
    options: {
        title: {
            text: 'My Chart'
        },
        xAxis: {
            categories: ["Jan", "Feb", "Mar", "Apr", "Mar", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
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
        ],
        plotOptions: {
            series: {
              dataLabels: {
                enabled: true,
                allowOverlap: true          
              }
            }
        }
    },
    customCode: function (options) {
        options.title = { 
            text: 'Changed through custom code!'
        };
    }
};

//Set log level
exporter.logLevel(4);

//Set up a pool of PhantomJS workers
exporter.initPool({
    maxWorkers: 1
});

//Perform an export
/*
    Export settings corresponds to the available CLI arguments described
    above.
*/
exporter.export(exportSettings, function (err, res) {
    //The export result is now in res.
    //If the output is not PDF or SVG, it will be base64 encoded (res.data).
    //If the output is a PDF or SVG, it will contain a filename (res.filename).

    //Kill the pool when we're done with it, and exit the application
    exporter.killPool();
    process.exit(1);
});