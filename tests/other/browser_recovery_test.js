/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * Checks that the server recovers when the browser process is killed.
 *
 * This is the failure that happens in production when the browser is killed by
 * an out of memory reaper. A page belonging to a dead browser still reports
 * isClosed() === false, so without the generation check the pool cannot tell
 * that its workers are stale and keeps handing them out, failing every export
 * indefinitely while still reporting healthy workers.
 *
 * The test performs an export, kills the browser, and then requires exports to
 * start succeeding again within a timeout.
 *
 * NOTE: This test kills processes. It only ever kills a browser process that is
 *       a direct child of the export server it was pointed at, found by parent
 *       pid, so it will not touch an unrelated browser. It is POSIX only and
 *       skips itself elsewhere. It is not part of any automated suite - run it
 *       deliberately against a server started for the purpose.
 *
 * Usage:
 *   node tests/other/browser_recovery_test.js [--url http://127.0.0.1:7801]
 *     [--server-pid N] [--timeout MS]
 */

import { execSync } from 'child_process';

import 'colors';

const args = process.argv.slice(2);

/**
 * Reads a `--key value` argument, falling back to a default.
 *
 * @param {string} name - The flag name, without dashes.
 * @param {*} fallback - Value to use when the flag is absent.
 *
 * @returns {*} The parsed argument value.
 */
function arg(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
}

const url = arg('url', 'http://127.0.0.1:7801');
const recoveryTimeout = parseInt(arg('timeout', 60000), 10);

if (process.platform === 'win32') {
  console.log(
    '[SKIP] This test relies on POSIX process tools and does not run on Windows.'
      .yellow
  );
  process.exit(0);
}

console.log(
  'Highcharts Export Server browser recovery test'.yellow.bold,
  `\n  target  : ${url}`.green,
  `\n  timeout : ${recoveryTimeout}ms`.green,
  '\n'
);

const chart = { type: 'png', infile: { series: [{ data: [1, 2, 3] }] } };

/**
 * Attempts a single export.
 *
 * @returns {Promise<boolean>} True when the export succeeded.
 */
async function tryExport() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chart),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      return false;
    }

    return (await response.arrayBuffer()).byteLength > 0;
  } catch {
    return false;
  }
}

/**
 * Finds candidate pids for the export server process.
 *
 * More than one process can match, because a shell wrapper's command line
 * contains the server's command line too. All matches are returned and the
 * browser is then located as a child of any of them, which sidesteps having to
 * work out which is the real one.
 *
 * @returns {number[]} The candidate server pids.
 */
function findServerPids() {
  const explicit = arg('server-pid', null);

  if (explicit) {
    return [parseInt(explicit, 10)];
  }

  const pids = execSync('ps -eo pid,args', { encoding: 'utf8' })
    .split('\n')
    .filter(
      (line) => line.includes('bin/cli.js') && !line.includes('recovery_test')
    )
    .map((line) => parseInt(line.trim().split(/\s+/)[0], 10))
    .filter((pid) => !Number.isNaN(pid) && pid !== process.pid);

  if (!pids.length) {
    throw new Error(
      'Could not find the export server process. Pass --server-pid explicitly.'
    );
  }

  return pids;
}

/**
 * Finds browser processes that are direct children of any of the given pids.
 *
 * Matching on the parent is what keeps this safe: an unrelated browser running
 * on the machine is never a child of the export server.
 *
 * @param {number[]} parentPids - Candidate parent process ids.
 *
 * @returns {number[]} The matching child pids.
 */
function findBrowserChildren(parentPids) {
  return execSync('ps -eo pid,ppid,args', { encoding: 'utf8' })
    .split('\n')
    .filter((line) => {
      const parts = line.trim().split(/\s+/);
      return (
        parentPids.includes(parseInt(parts[1], 10)) &&
        /chrom(e|ium)/i.test(line) &&
        !/crashpad/i.test(line)
      );
    })
    .map((line) => parseInt(line.trim().split(/\s+/)[0], 10));
}

/**
 * Runs the recovery check.
 *
 * @returns {Promise<void>} Resolves once the check has been reported.
 */
async function run() {
  if (!(await tryExport())) {
    console.log(
      '[FAIL] The server could not export before the browser was killed. Start a healthy server first.'
        .red.bold
    );
    process.exit(1);
  }
  console.log('  export before kill : ok'.green);

  const serverPids = findServerPids();
  const browserPids = findBrowserChildren(serverPids);

  if (!browserPids.length) {
    console.log(
      `[FAIL] Found no browser process parented to the server (candidate pids ${serverPids.join(', ')}).`
        .red.bold
    );
    process.exit(1);
  }

  for (const pid of browserPids) {
    console.log(`  killing browser    : pid ${pid}`);
    try {
      process.kill(pid, 'SIGKILL');
    } catch (error) {
      console.log(`  could not kill ${pid}: ${error.message}`.yellow);
    }
  }

  const deadline = Date.now() + recoveryTimeout;
  let attempts = 0;
  let recovered = false;

  while (Date.now() < deadline) {
    attempts++;

    if (await tryExport()) {
      recovered = true;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('');

  if (!recovered) {
    console.log(
      `[FAIL] The server did not recover within ${recoveryTimeout}ms (${attempts} attempts). Exports are still failing.`
        .red.bold
    );
    process.exit(1);
  }

  // A recovered server must also keep working
  let consecutive = 0;

  for (let i = 0; i < 5; i++) {
    if (await tryExport()) {
      consecutive++;
    }
  }

  if (consecutive < 5) {
    console.log(
      `[FAIL] Recovered, but only ${consecutive}/5 subsequent exports succeeded.`
        .red.bold
    );
    process.exit(1);
  }

  console.log(
    `[PASS] Recovered after ${attempts} attempt(s), and 5/5 subsequent exports succeeded.`
      .green.bold
  );
}

run().catch((error) => {
  console.log(`[ERROR] ${error.stack}`.red);
  process.exit(1);
});
