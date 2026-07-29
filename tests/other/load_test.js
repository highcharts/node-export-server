/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * Closed-loop saturation harness for the export server.
 *
 * Unlike stress_test.js (which fires a fixed trickle and only logs), this drives
 * a fixed number of concurrent virtual users against the server, samples the
 * /health endpoint for pool state, and reports latency percentiles, the error
 * breakdown and the peak acquire queue depth.
 *
 * The point is to make the failure modes that only show up at scale observable
 * locally: pool saturation, growing acquire queues, dropped requests and a
 * server that stops answering altogether.
 *
 * Usage:
 *   node tests/other/load_test.js [--concurrency N] [--duration S] [--type png]
 *     [--url http://127.0.0.1:7801] [--series N] [--points N]
 *     [--client-timeout MS] [--abort-after MS] [--json out.json]
 *
 * Notable flags:
 *   --client-timeout  abort the request from the client side after MS, the way
 *                     an ALB or an impatient caller would.
 *   --abort-after     abort every request after MS (models clients that give up
 *                     while the server is still working on their chart).
 */

import http from 'http';
import https from 'https';
import { writeFileSync } from 'fs';

import 'colors';

/**
 * Parses `--key value` and `--flag` style arguments into an object.
 *
 * @param {string[]} argv - Raw process arguments.
 *
 * @returns {Object} Parsed arguments keyed by flag name.
 */
function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[i + 1];

    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));

const config = {
  url: args.url || 'http://127.0.0.1:7801',
  concurrency: parseInt(args.concurrency || 10, 10),
  duration: parseInt(args.duration || 30, 10) * 1000,
  type: args.type || 'png',
  series: parseInt(args.series || 3, 10),
  points: parseInt(args.points || 25, 10),
  clientTimeout: args['client-timeout']
    ? parseInt(args['client-timeout'], 10)
    : 0,
  abortAfter: args['abort-after'] ? parseInt(args['abort-after'], 10) : 0,
  json: typeof args.json === 'string' ? args.json : null
};

const target = new URL(config.url);
const transport = target.protocol === 'https:' ? https : http;

// Reuse sockets so we measure the server, not TCP handshakes
const agent = new transport.Agent({
  keepAlive: true,
  maxSockets: config.concurrency + 8
});

/**
 * Builds a chart configuration of a controllable size, so the harness can model
 * both cheap and expensive exports.
 *
 * @returns {Object} A Highcharts configuration object.
 */
function buildChart() {
  const series = [];

  for (let s = 0; s < config.series; s++) {
    const data = [];

    for (let p = 0; p < config.points; p++) {
      // Deterministic, but varied enough to avoid trivially cacheable shapes
      data.push(Math.round(Math.sin((s + 1) * p) * 100) / 2 + 50);
    }

    series.push({ name: `Series ${s + 1}`, data });
  }

  return {
    title: { text: 'Load test' },
    xAxis: { categories: Array.from({ length: config.points }, (_, i) => i) },
    series
  };
}

const requestBody = JSON.stringify({
  type: config.type,
  infile: buildChart()
});

// Collected results
const results = {
  latencies: [],
  ok: 0,
  failed: 0,
  aborted: 0,
  byStatus: {},
  byError: {}
};

// Sampled pool state from /health
const poolSamples = [];
let healthFailures = 0;

/**
 * Increments a counter in a tally object.
 *
 * @param {Object} bucket - The tally object.
 * @param {string} key - The key to increment.
 */
function tally(bucket, key) {
  bucket[key] = (bucket[key] || 0) + 1;
}

/**
 * Issues a single export request and records its outcome.
 *
 * @returns {Promise<void>} Resolves once the request has settled.
 */
function doRequest() {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    let settled = false;

    /**
     * Records the outcome exactly once.
     *
     * @param {string} kind - One of 'ok', 'failed' or 'aborted'.
     * @param {string} label - Status code or error label.
     */
    const finish = (kind, label) => {
      if (settled) {
        return;
      }
      settled = true;

      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      results.latencies.push(ms);

      if (kind === 'ok') {
        results.ok++;
        tally(results.byStatus, label);
      } else if (kind === 'aborted') {
        results.aborted++;
      } else {
        results.failed++;
        tally(results.byError, label);
      }

      resolve();
    };

    const request = transport.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: 'POST',
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      },
      (response) => {
        // Drain the body so the socket can be reused
        let bytes = 0;

        response.on('data', (chunk) => {
          bytes += chunk.length;
        });

        response.on('end', () => {
          if (response.statusCode === 200 && bytes > 0) {
            finish('ok', String(response.statusCode));
          } else {
            finish('failed', `HTTP ${response.statusCode}`);
          }
        });

        response.on('error', (error) =>
          finish('failed', error.code || 'stream')
        );
      }
    );

    if (config.clientTimeout) {
      request.setTimeout(config.clientTimeout, () => {
        request.destroy();
        finish('failed', 'client-timeout');
      });
    }

    if (config.abortAfter) {
      setTimeout(() => {
        if (!settled) {
          request.destroy();
          finish('aborted', 'aborted');
        }
      }, config.abortAfter).unref();
    }

    request.on('error', (error) => {
      // A deliberate abort surfaces here as ECONNRESET/socket hang up
      if (settled) {
        return;
      }
      finish('failed', error.code || error.message);
    });

    request.end(requestBody);
  });
}

/**
 * Samples the /health endpoint, recording pool state and any unavailability.
 *
 * @returns {Promise<void>} Resolves once the sample has been taken.
 */
function sampleHealth() {
  return new Promise((resolve) => {
    const request = transport.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: '/health',
        method: 'GET',
        agent
      },
      (response) => {
        let raw = '';

        response.on('data', (chunk) => {
          raw += chunk;
        });

        response.on('end', () => {
          try {
            const body = JSON.parse(raw);
            poolSamples.push({ at: Date.now(), ...body.pool });
          } catch {
            healthFailures++;
          }
          resolve();
        });
      }
    );

    request.setTimeout(5000, () => {
      request.destroy();
      healthFailures++;
      resolve();
    });

    request.on('error', () => {
      healthFailures++;
      resolve();
    });

    request.end();
  });
}

/**
 * Returns the value at the given percentile of a numeric array.
 *
 * @param {number[]} sorted - A pre-sorted ascending array.
 * @param {number} percentile - The percentile, between 0 and 100.
 *
 * @returns {number} The percentile value, rounded to whole milliseconds.
 */
function percentile(sorted, percentile) {
  if (!sorted.length) {
    return 0;
  }

  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentile / 100) * sorted.length) - 1
  );

  return Math.round(sorted[Math.max(0, index)]);
}

/**
 * Runs the load phase, then prints and optionally writes the report.
 *
 * @returns {Promise<void>} Resolves once the run is reported.
 */
async function run() {
  console.log(
    'Highcharts Export Server load test'.yellow.bold,
    `\n  target      : ${config.url}`.green,
    `\n  concurrency : ${config.concurrency}`.green,
    `\n  duration    : ${config.duration / 1000}s`.green,
    `\n  export type : ${config.type}`.green,
    `\n  payload     : ${config.series} series x ${config.points} points`.green,
    config.clientTimeout
      ? `\n  client tmo  : ${config.clientTimeout}ms`.green
      : '',
    config.abortAfter ? `\n  abort after : ${config.abortAfter}ms`.green : '',
    '\n'
  );

  // Confirm the server is actually up before we start timing anything
  await sampleHealth();

  if (healthFailures) {
    console.log(
      `[ERROR] Could not reach ${config.url}/health.`.red,
      'Start the server before running this test.'.red
    );
    process.exit(1);
  }

  const deadline = Date.now() + config.duration;
  const sampler = setInterval(sampleHealth, 500);

  /**
   * A single virtual user, looping until the deadline.
   *
   * @returns {Promise<void>} Resolves when the deadline passes.
   */
  const worker = async () => {
    while (Date.now() < deadline) {
      await doRequest();
    }
  };

  const startedAt = Date.now();

  await Promise.all(Array.from({ length: config.concurrency }, () => worker()));

  const elapsed = (Date.now() - startedAt) / 1000;
  clearInterval(sampler);

  // Give the pool a moment to settle, then look at the drain behaviour
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await sampleHealth();

  const sorted = [...results.latencies].sort((a, b) => a - b);
  const total = results.ok + results.failed + results.aborted;
  const maxPending = poolSamples.reduce(
    (max, sample) => Math.max(max, sample.pending || 0),
    0
  );
  const maxUsed = poolSamples.reduce(
    (max, sample) => Math.max(max, sample.used || 0),
    0
  );
  const finalPool = poolSamples[poolSamples.length - 1] || {};

  const report = {
    config,
    elapsedSeconds: Number(elapsed.toFixed(1)),
    requests: total,
    ok: results.ok,
    failed: results.failed,
    aborted: results.aborted,
    throughputPerSecond: Number((total / elapsed).toFixed(2)),
    successRatePercent: total
      ? Number(((results.ok / total) * 100).toFixed(2))
      : 0,
    latencyMs: {
      min: percentile(sorted, 0),
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: percentile(sorted, 100)
    },
    byStatus: results.byStatus,
    byError: results.byError,
    pool: {
      maxPendingAcquires: maxPending,
      maxUsed: maxUsed,
      finalState: finalPool,
      healthCheckFailures: healthFailures,
      samples: poolSamples.length
    }
  };

  console.log('Results'.yellow.bold);
  console.log(`  requests      : ${report.requests}`);
  console.log(
    `  ok            : ${report.ok} (${report.successRatePercent}%)`[
      report.failed || report.aborted ? 'yellow' : 'green'
    ]
  );
  console.log(
    `  failed        : ${report.failed}`[report.failed ? 'red' : 'green']
  );
  console.log(`  aborted       : ${report.aborted}`);
  console.log(`  throughput    : ${report.throughputPerSecond} req/s`);
  console.log(
    `  latency ms    : p50=${report.latencyMs.p50} p95=${report.latencyMs.p95} p99=${report.latencyMs.p99} max=${report.latencyMs.max}`
  );
  console.log(
    `  pool          : maxUsed=${maxUsed} maxPending=${maxPending} final=${JSON.stringify(finalPool)}`
  );
  console.log(
    `  health misses : ${healthFailures}`[healthFailures ? 'red' : 'green']
  );

  if (Object.keys(report.byError).length) {
    console.log('  errors        :'.red);
    for (const [error, count] of Object.entries(report.byError)) {
      console.log(`    ${error}: ${count}`.red);
    }
  }

  if (config.json) {
    writeFileSync(config.json, JSON.stringify(report, null, 2));
    console.log(`\n  wrote ${config.json}`.green);
  }

  // Leave the process free to exit
  agent.destroy();
}

run().catch((error) => {
  console.log(`[ERROR] ${error.stack}`.red);
  process.exit(1);
});
