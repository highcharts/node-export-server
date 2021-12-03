const { readFileSync } = require('fs');

const { cli: configCli, nestedArgs } = require('./schemas/configCli.js');
const packageVersion = require('../package.json').version;

/** Check if item is an object
 * @export utils
 * @param item {any} Item to be checked
 */
const isObject = (item) =>
  typeof item === 'object' && !Array.isArray(item) && item !== null;

/** Pairs argument with a corresponding value
 * @export utils
 * @param options {object} All server options
 * @param args {string[]} Array of arguments from a user
 */
const pairArgumentValue = (options, args) => {
  for (let i = 0; i < args.length; i++) {
    let option = args[i].replace(/\-/g, '');

    // Find the right place for property's value
    const propertiesChain = nestedArgs[option]
      ? nestedArgs[option].split('.')
      : [];

    propertiesChain.reduce((obj, prop, index) => {
      if (propertiesChain.length - 1 === index) {
        // Finds an option and set a corresponding value
        if (typeof obj[prop] !== 'undefined') {
          if (args[++i]) {
            obj[prop] = args[i] || obj[prop];
          } else {
            console.log(`Missing argument value for ${option}!`.red, '\n');
            return printUsage();
          }
        }
      }
      return obj[prop];
    }, options);
  }

  return options;
};

/** Prints the export server logo
 * @export utils
 * @param nologo {boolean} Whether to display logo or text
 */
const printLogo = (nologo) => {
  // Print text only
  if (nologo) {
    console.log(`Starting highcharts export server v${packageVersion}...`);
    return;
  }

  // Print the logo
  console.log(
    readFileSync(__dirname + '/../msg/startup.msg').toString().bold.yellow,
    `v${packageVersion}`
  );
};

/** Prints the CLI usage. If required, it can list properties recursively
 * @export utils
 */
const printUsage = () => {
  const pad = 48;
  const readme = 'https://github.com/highcharts/node-export-server#readme';

  // Display readme information
  console.log(
    'Usage:'.bold,
    '\n------',
    `\nFor more detailed information visit readme at: ${readme.bold.yellow}.`
  );

  const cycleCategories = (categories) => {
    for (const [name, option] of Object.entries(categories)) {
      // If category has more levels, go further
      if (!option.hasOwnProperty('value')) {
        cycleCategories(option);
      } else {
        let descName = `  --${option.cliName || name} ${
          ('<' + option.type + '>').green
        } `;
        if (descName.length < pad) {
          for (let i = descName.length; i < pad; i++) {
            descName += '.';
          }
        }

        // Display correctly aligned messages
        console.log(
          descName,
          option.description,
          `[Default: ${option.value.toString().bold}]`.blue
        );
      }
    }
  };

  // Cycle through options of each categories and display the usage info
  Object.keys(configCli).forEach((category) => {
    console.log(`\n${category.toUpperCase()}`.red);
    cycleCategories(configCli[category]);
  });
  console.log('\n');
};

module.exports = {
  isObject,
  pairArgumentValue,
  printLogo,
  printUsage
};
