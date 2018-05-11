/**
 * Exports a set of charts.
 * @param {Array<Object>} charts - an array of the chart configurations to export
 * @param {Object} exportOptions? - the export options (filetype etc.) common for all charts
 * @returns {Promise}
 */
const exportCharts = (charts, exportOptions) => {

  // If you "steal" this funciton, change the below to require('highcharts-export-server'),
  // and make sure that the export server is included as a dependency in your project,
  // or that it's installed globally (not recommended for module usage).
  const exporter = require('./../../lib/index.js');

  // If exportOptions is blank, default to an empty object
  exportOptions = exportOptions || {};

  let promises = [];
  let chartResults = [];

  exporter.initPool();

  charts.forEach((chart, i) => {
    promises.push(
      new Promise((resolve, reject) => {

        // Use common option (e.g. filetype etc)
        let exportData = Object.assign({}, exportOptions);
        exportData.options = chart;

        exporter.export(exportData, (err, res) => {
          if (err) return reject(err);

          // Add the data to chartData
          chartResults.push(res.data);

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
    .catch(e => {
      exporter.killPool();
      return Promise.reject(e);
    });
};

////////////////////////////////////////////////////////////////////////////////

// Export a couple of charts

exportCharts([
  {
    title: {
      text: 'Chart 1'
    }
  },
  {
    title: {
      text: 'Chart 2'
    }
  }
]).then(charts => {
  // Result of export is in charts, which is an array of base64 encoded files.
  console.log('All done!');
})
.catch(e => {
  console.log('Something went wrong:', e);
});
