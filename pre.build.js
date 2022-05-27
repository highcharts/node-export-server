
const pkg = require(__dirname + '/package.json');
const fs = require('fs');

const version = process.env.HIGHCHARTS_VERSION;
const useNPM = process.env.HIGHCHARTS_USE_NPM || (process.env.HIGHCHARTS_CDN === 'npm');

if (useNPM) {

  pkg.dependencies.highcharts = version || '*';

  console.log(`Preinstall: adding Highcharts@${pkg.dependencies.highcharts} dependency to ${__dirname}/package.json`);

  fs.writeFileSync(__dirname + '/package.json', JSON.stringify(pkg, 0, '  '));
} else {
  console.log('Preinstall: no tasks to be done, skipping');
}
