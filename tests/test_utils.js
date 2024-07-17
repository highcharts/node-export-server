import { style } from '../lib/logger.js';

export function showStartingTestMessage() {
  console.log(
    `${style.yellow} ${style.bold} Highcharts Export Server CLI Test Runner ${style.reset}
  \n${style.green} This tool simulates the CLI commands sent to Highcharts Export Server.
  \nLoads all JSON files from the ./tests/cli folder and runs them sequentially.'
  \nThe results are stored in the ./tests/cli/_results.\n${style.reset}`
  );
}

export function showProcessingTestMessage(file) {
  console.log(
    `${style.blue} [Test runner] ${style.reset}`,
    `Processing test ${file}.`
  );
}

export function showFailOrSuccessMessage(didFail, message) {
  console.log(
    didFail ? `${style.red}[Fail] ` : `${style.green}[Success] `,
    `${message} ${style.reset}\n`
  );
}

export function showTestResults(testCounter, failsCounter) {
  console.log(
    '--------------------------------\n',
    failsCounter
      ? `${style.red}${testCounter} tests done, ${failsCounter} error(s) found!${style.reset}\n`
      : `${style.green}${testCounter} tests done, no errors found.${style.reset}\n`,
    '--------------------------------'
  );
}

export function showConnectionErrorMessage(url) {
  console.log(
    `${style.red}[ERROR] Couldn't connect to ${url}.${style.reset}`,
    `${style.red}Set your server before running tests.${style.reset}`
  );
}
