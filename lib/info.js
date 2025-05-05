/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module provides simple functions for displaying information
 * about the Highcharts Export Server, including version details, license
 * information, and CLI usage instructions.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { __dirname } from './utils.js';

import defaultConfig from './schemas/config.js';

/**
 * Prints the Highcharts Export Server logo or text with the version and license
 * information.
 *
 * @function printInfo
 *
 * @param {boolean} [noLogo=false] - If `true`, the text with the version number
 * is only printed, without the logo. The default value is `false`.
 * @param {boolean} [noLicense=false] - If `true`, the license information will
 * not be displayed. The default value is `false`.
 */
export function printInfo(noLogo = false, noLicense = false) {
  // Get package version either from `.env` or from `package.json`
  const packageVersion = JSON.parse(
    readFileSync(join(__dirname, 'package.json'), 'utf8')
  ).version;

  // Print text only
  if (noLogo) {
    console.log(`Highcharts Export Server v${packageVersion}`);
  } else {
    // Print the logo
    console.log(
      readFileSync(join(__dirname, 'msg', 'startup.msg'), 'utf8').toString()
        .bold.yellow,
      `v${packageVersion}\n`.bold
    );
  }

  // Print the license information, if needed
  if (!noLicense) {
    console.log(
      'This software requires a valid Highcharts license for commercial use.\n'
        .yellow,
      '\nFor a full list of CLI options, type:',
      '\nhighcharts-export-server --help\n'.green,
      '\nIf you do not have a license, one can be obtained here:',
      '\nhttps://shop.highsoft.com/\n'.green,
      '\nTo customize your installation, please refer to the README file at:',
      '\nhttps://github.com/highcharts/node-export-server#readme\n'.green
    );
  }
}

/**
 * Prints usage information for CLI arguments, displaying available options
 * and their descriptions. It can list properties recursively if categories
 * contain nested options.
 *
 * @function printUsage
 */
export function printUsage() {
  // Display README and general usage information
  console.log(
    '\nUsage of CLI arguments:'.bold,
    '\n-----------------------',
    `\nFor more detailed information, visit the README file at: ${'https://github.com/highcharts/node-export-server#readme'.green}.\n`
  );

  // Iterate through each category in the `defaultConfig` and display usage info
  Object.keys(defaultConfig).forEach((category) => {
    console.log(`${category.toUpperCase()}`.bold.red);
    _cycleCategories(defaultConfig[category]);
    console.log('');
  });
}

/**
 * Recursively traverses the options object to print the usage information
 * for each option category and individual option.
 *
 * @function _cycleCategories
 *
 * @param {Object} options - The options object containing CLI options. It may
 * include nested categories and individual options.
 */
function _cycleCategories(options) {
  for (const [name, option] of Object.entries(options)) {
    // If the current entry is a category and not a leaf option, recurse into it
    if (!Object.prototype.hasOwnProperty.call(option, 'value')) {
      _cycleCategories(option);
    } else {
      // Prepare description
      const descName = ` --${option.cliName || name}`;

      // Get the value
      let optionValue = option.value;

      // Prepare value for option that is not null and is array of strings
      if (optionValue !== null && option.types.includes('string[]')) {
        optionValue =
          '[' + optionValue.map((item) => `'${item}'`).join(', ') + ']';
      }

      // Prepare value for option that is not null and is a string
      if (optionValue !== null && option.types.includes('string')) {
        optionValue = `'${optionValue}'`;
      }

      // Display correctly aligned messages
      console.log(
        descName.green,
        `${('<' + option.types.join('|') + '>').yellow}`,
        `${String(optionValue).bold}`.blue,
        `- ${option.description}.`
      );
    }
  }
}

export default {
  printInfo,
  printUsage
};
