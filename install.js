/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const packageVersion = require(__dirname + '/package.json').version;

require('colors');

console.log(
  `
Highcharts Export Server V${packageVersion}

${
  'This software requires a valid Highcharts license for commercial use.'.bold
    .yellow
}

If you do not have a licence, one can be gotten here:
https://shop.highsoft.com/

To customize your installation (include additional/fewer modules and so on),
please refer to the readme file.
`.green
);
