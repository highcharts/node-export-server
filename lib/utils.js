const { readFileSync } = require('fs');

const packageVersion = require('../package.json').version;

/** Fix to supported type format if MIME
 * @export utils
 * @param type {string} Type to be corrected
 */
const fixType = (type) => {
  // MIME types
  const mimeTypes = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'application/pdf': 'pdf',
    'image/svg+xml': 'svg'
  };

  // Return a correct type
  return (
    mimeTypes[type] ||
    ['png', 'jpeg', 'pdf', 'svg'].find((t) => t === type) ||
    'png'
  );
};

/** Check if provided data is or can be a correct JSON
 * @export utils
 * @param data {any} Data to be checked
 * @param toString {boolean} If true, return stringified representation
 */
const isCorrectJSON = (data, toString) => {
  try {
    // Get the string representation if not already before parsing
    const parsedData = JSON.parse(
      typeof data !== 'string' ? JSON.stringify(data) : data
    );

    // Return a stringified representation of a JSON if required
    if (toString) {
      return JSON.stringify(parsedData);
    }

    // Return a JSON
    return parsedData;
  } catch (error) {
    return false;
  }
};

/** Check if item is an object
 * @export utils
 * @param item {any} Item to be checked
 */
const isObject = (item) =>
  typeof item === 'object' && !Array.isArray(item) && item !== null;

/** Merge the new options to the options object. It omits undefined values
 * @export utils
 * @param options {any} Old options
 * @param newOptions {any} New options
 */
const mergeConfigOptions = (options, newOptions) => {
  for (const [key, value] of Object.entries(newOptions)) {
    options[key] = isObject(value)
      ? mergeConfigOptions(options[key], value)
      : value !== undefined
      ? value
      : options[key];
  }
  return options;
};

/** Pairs argument with a corresponding value
 * @export utils
 * @param options {object} All server options
 * @param args {string[]} Array of arguments from a user
 */
const pairArgumentValue = (options, args, defaultConfig, nestedArgs) => {
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
            options = printUsage(defaultConfig);
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
 * @param noLogo {boolean} Whether to display logo or text
 */
const printLogo = (noLogo) => {
  // Print text only
  if (noLogo) {
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
const printUsage = (defaultConfig) => {
  const pad = 48;
  const readme = 'https://github.com/highcharts/node-export-server#readme';

  // Display readme information
  console.log(
    'Usage of CLI arguments:'.bold,
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
  Object.keys(defaultConfig).forEach((category) => {
    // Only puppeteer and highcharts categories cannot be configured through CLI
    if (!['puppeteer', 'highcharts'].includes(category)) {
      console.log(`\n${category.toUpperCase()}`.red);
      cycleCategories(defaultConfig[category]);
    }
  });
  console.log('\n');
};

/** Casts the item to boolean
 * @export utils
 * @param item {any} Item to be cast
 */
const toBoolean = (item) =>
  ['0', 'false', 'NaN', 'null', 'undefined'].includes(item) ? false : !!item;

module.exports = {
  fixType,
  isObject,
  isCorrectJSON,
  mergeConfigOptions,
  pairArgumentValue,
  printLogo,
  printUsage,
  toBoolean
};
