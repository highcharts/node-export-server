/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * Checks that concurrent exports cannot see each other's chart state.
 *
 * Worker pages are reused between exports, and the page is cleared when a
 * worker is released back to the pool. If that clearing is not guaranteed to
 * have finished before the page is handed to the next export, then under
 * saturation an export can render against the previous chart's state, or have
 * its container wiped part way through rendering.
 *
 * This drives many concurrent SVG exports, alternating between two charts with
 * distinguishable titles and series lengths, and asserts every response
 * contains only its own chart. SVG is used because the output can be inspected
 * directly as text.
 *
 * NOTE: This is a guard, not a reproducer. It was written alongside the fix that
 *       makes page clearing complete before a worker is handed out, and it
 *       passes both with and without that fix - because export.js separately
 *       calls clearPageResources at the end of every export, which destroys the
 *       old charts and so masks the overlap. It is kept because the invariant it
 *       checks is the one that matters, and it would catch a regression in
 *       either cleanup path.
 *
 * The server must be running, with the pool saturated by the concurrency used
 * here for the check to be meaningful - a pool that is never contended will
 * pass trivially.
 *
 * Usage:
 *   node tests/other/page_isolation_test.js [--concurrency N] [--rounds N]
 *     [--url http://127.0.0.1:7801]
 */

import http from 'http';

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

const url = new URL(arg('url', 'http://127.0.0.1:7801'));
const concurrency = parseInt(arg('concurrency', 30), 10);
const rounds = parseInt(arg('rounds', 6), 10);

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: concurrency + 4
});

// Two charts that are trivially distinguishable in the rendered SVG. The point
// counts differ as well as the titles, so a partially cleared page shows up
// either as the wrong title or as the wrong number of data points.
const charts = [
  {
    marker: 'ISOLATIONCHARTALPHA',
    other: 'ISOLATIONCHARTBETA',
    config: {
      title: { text: 'ISOLATIONCHARTALPHA' },
      series: [{ data: [1, 2, 3] }]
    }
  },
  {
    marker: 'ISOLATIONCHARTBETA',
    other: 'ISOLATIONCHARTALPHA',
    config: {
      title: { text: 'ISOLATIONCHARTBETA' },
      series: [{ data: [10, 20, 30, 40, 50, 60, 70, 80] }]
    }
  }
];

/**
 * Performs a single SVG export and checks the result against its own chart.
 *
 * @param {Object} chart - One of the entries of the charts array.
 *
 * @returns {Promise<Object>} Resolves to a result record describing the outcome.
 */
function exportAndCheck(chart) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ type: 'svg', infile: chart.config });

    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: '/',
        method: 'POST',
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (response) => {
        let raw = '';

        response.on('data', (chunk) => {
          raw += chunk;
        });

        response.on('end', () => {
          if (response.statusCode !== 200) {
            // A rejected export is a capacity result, not an isolation failure
            return resolve({ status: 'rejected', code: response.statusCode });
          }

          if (raw.includes(chart.other)) {
            return resolve({
              status: 'contaminated',
              detail: `response for ${chart.marker} contained ${chart.other}`
            });
          }

          if (!raw.includes(chart.marker)) {
            return resolve({
              status: 'missing',
              detail: `response for ${chart.marker} did not contain its own title`
            });
          }

          resolve({ status: 'ok' });
        });
      }
    );

    request.on('error', (error) =>
      resolve({ status: 'error', detail: error.code || error.message })
    );

    request.end(body);
  });
}

/**
 * Runs the rounds of concurrent exports and reports the outcome.
 *
 * @returns {Promise<void>} Resolves once the check has been reported.
 */
async function run() {
  console.log(
    'Highcharts Export Server page isolation test'.yellow.bold,
    `\n  target      : ${url.origin}`.green,
    `\n  concurrency : ${concurrency}`.green,
    `\n  rounds      : ${rounds}`.green,
    '\n'
  );

  const tally = { ok: 0, rejected: 0, contaminated: 0, missing: 0, error: 0 };
  const failures = [];

  for (let round = 0; round < rounds; round++) {
    const batch = Array.from({ length: concurrency }, (_, i) =>
      exportAndCheck(charts[i % charts.length])
    );

    for (const result of await Promise.all(batch)) {
      tally[result.status]++;

      if (
        (result.status === 'contaminated' || result.status === 'missing') &&
        failures.length < 10
      ) {
        failures.push(result.detail);
      }
    }

    console.log(
      `  round ${round + 1}/${rounds}: ok=${tally.ok} rejected=${tally.rejected} contaminated=${tally.contaminated} missing=${tally.missing}`
    );
  }

  console.log('');

  if (tally.contaminated || tally.missing) {
    console.log('[FAIL] Page state leaked between exports.'.red.bold);
    for (const failure of failures) {
      console.log(`  ${failure}`.red);
    }
    process.exit(1);
  }

  if (!tally.ok) {
    console.log(
      '[FAIL] No export succeeded, so isolation was never exercised.'.red.bold
    );
    process.exit(1);
  }

  console.log(
    `[PASS] ${tally.ok} exports, none contaminated.`.green.bold,
    tally.rejected ? `(${tally.rejected} rejected for capacity)`.yellow : ''
  );

  agent.destroy();
}

run().catch((error) => {
  console.log(`[ERROR] ${error.stack}`.red);
  process.exit(1);
});
