/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { readFileSync } from 'fs';
import { join } from 'path';

import { __dirname } from './lib/utils.js';
import { style } from './lib/logger.js';

const pkgFile = JSON.parse(readFileSync(join(__dirname, 'package.json')));

console.log(
  `${style.green}
Highcharts Export Server v${pkgFile.version}

${style.yellow}This software requires a valid Highcharts license for commercial use.${style.reset}

${style.yellow}
If you do not have a license, one can be obtained here:
https://shop.highsoft.com/
${style.reset}

To customize your installation (include additional/fewer modules and so on),
please refer to the readme file.
${style.reset}
`
);
