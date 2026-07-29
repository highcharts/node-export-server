/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * Checks that a page is not left open when setting it up fails.
 *
 * newPage() creates a browser page and then configures it, the expensive step
 * being the injection of the Highcharts bundle. If any of the configuration
 * steps throws, the caller receives the error but never had a reference to the
 * page, so anything not closed here stays open for the lifetime of the browser.
 * That matters because the pool retries creation on an interval, so a sustained
 * create failure would leak a browser tab on every attempt.
 *
 * The failure is induced by pointing the Highcharts cache path at a directory
 * that does not exist, which makes the script injection throw.
 *
 * Unlike the other scripts in this folder, this one does not need a running
 * server - it drives the browser module directly.
 *
 * Usage:
 *   node tests/other/page_leak_test.js [--attempts N]
 */

import { rmSync } from 'fs';

import { setOptions, getOptions } from '../../lib/config.js';
import { create, newPage, close, get } from '../../lib/browser.js';

import 'colors';

const args = process.argv.slice(2);
const attemptsIndex = args.indexOf('--attempts');
const attempts =
  attemptsIndex !== -1 && args[attemptsIndex + 1]
    ? parseInt(args[attemptsIndex + 1], 10)
    : 5;

console.log(
  'Highcharts Export Server page leak test'.yellow.bold,
  `\n  attempts : ${attempts}`.green,
  '\n'
);

// Load the default options, then launch a browser with them
setOptions({}, {});
const options = getOptions();

// NOTE: Use a profile directory of our own. Chrome refuses to start a second
//       instance against a user data directory another live process holds, so
//       sharing the default one would make this test fail whenever a server
//       happened to be running alongside it.
const profileDir = `./tmp-page-leak-test-${process.pid}/`;
options.puppeteer.tempDir = profileDir;

await create(options.puppeteer?.args ?? []);
const browser = get();

const before = (await browser.pages()).length;
console.log(`  pages after browser create : ${before}`);

// Break the cache path so that injecting the Highcharts bundle fails
options.highcharts.cachePath = '.cache-does-not-exist-page-leak-test';

let failures = 0;

for (let attempt = 0; attempt < attempts; attempt++) {
  try {
    await newPage();
  } catch {
    failures++;
  }
}

const after = (await browser.pages()).length;

console.log(`  failed newPage() calls     : ${failures}`);
console.log(`  pages after failures       : ${after}`);
console.log('');

await close();

// Leave nothing behind
rmSync(profileDir, { recursive: true, force: true });

if (failures !== attempts) {
  console.log(
    `[FAIL] Expected all ${attempts} attempts to fail, but ${attempts - failures} succeeded. The test is no longer inducing the failure it checks for.`
      .red.bold
  );
  process.exit(1);
}

if (after > before) {
  console.log(
    `[FAIL] ${after - before} page(s) were left open by failed setup.`.red.bold
  );
  process.exit(1);
}

console.log(
  `[PASS] No pages left open across ${attempts} failed setups.`.green.bold
);
process.exit(0);
