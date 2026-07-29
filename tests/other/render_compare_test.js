/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * Compares the layout of exports produced by two servers.
 *
 * The point is to be able to tell whether a change - a dependency upgrade in
 * particular - moved anything in the rendered output. The functional tests only
 * establish that a request returns an image, not that the image is the same
 * image, so nothing else here would notice a shifted margin or a resized plot
 * area.
 *
 * Layout is compared rather than pixels. A different browser build shifts
 * antialiasing and font hinting across the whole image while changing no layout
 * at all, so pixel comparison reports differences that do not matter and buries
 * the ones that do. What is compared instead:
 *
 *   SVG - the plot background's position and size within the SVG, which is
 *         exactly the margin geometry, plus the overall dimensions and a count
 *         of the furniture (titles, legend items, axis labels).
 *   PNG - the overall dimensions and the bounding box of drawn content, giving
 *         the margins around it.
 *
 * The scenarios deliberately stress the things that move margins: long labels,
 * wrapping titles, legend placement, explicit margin and spacing options, and
 * scaling.
 *
 * Requests are sent sequentially with a delay. Keep it that way if either target
 * is a shared server - this is a correctness check, not a load test.
 *
 * Usage:
 *   node tests/other/render_compare_test.js
 *     [--reference http://127.0.0.1:7802] [--candidate http://127.0.0.1:7801]
 *     [--delay 150] [--tolerance 1] [--json out.json]
 *
 * Setting up a reference server, which is the part worth writing down. It has to
 * be frozen: its own checkout AND its own node_modules, or it will pick up the
 * dependency versions being tested and compare them against themselves.
 *
 *   git worktree add /tmp/nes-ref <the commit to compare against>
 *   cp package-lock.json /tmp/nes-ref/
 *   cd /tmp/nes-ref && npm ci
 *   ln -s <repo>/.cache /tmp/nes-ref/.cache
 *   SERVER_PORT=7802 PUPPETEER_TEMP_DIR=./tmp-ref/ node ./bin/cli.js --enableServer 1
 *
 * Share the .cache directory as above so that both servers run the same
 * Highcharts. Otherwise a Highcharts difference and a browser difference are
 * mixed together in the results. Give the reference its own PUPPETEER_TEMP_DIR
 * too, since Chrome will not start twice against one profile directory.
 *
 * Note what a local comparison can and cannot cover. It catches changes in how
 * this code drives the browser - the removal of captureBeyondViewport being the
 * case to watch, as it decides image clipping. It does not catch changes from a
 * new browser build unless the two servers really are running different browsers,
 * which is not so wherever PUPPETEER_EXECUTABLE_PATH points both at one system
 * install. Comparing browser versions needs an environment where each server uses
 * the browser its own Puppeteer brought with it.
 */

import { writeFileSync } from 'fs';

import 'colors';

import { pngGeometry, svgGeometry } from './render_geometry.js';

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

const config = {
  reference: arg('reference', 'http://127.0.0.1:7802'),
  candidate: arg('candidate', 'http://127.0.0.1:7801'),
  delay: parseInt(arg('delay', 150), 10),
  // Sub-pixel differences in reported geometry are not interesting; a moved
  // margin is whole pixels
  tolerance: parseFloat(arg('tolerance', 1)),
  json: typeof arg('json', null) === 'string' ? arg('json', null) : null
};

const baseSeries = [
  { name: 'Alpha', data: [29.9, 71.5, 106.4, 129.2, 144.0, 176.0] },
  { name: 'Beta', data: [144.0, 176.0, 135.6, 148.5, 216.4, 194.1] }
];

const categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const scenarios = [
  {
    name: 'default',
    options: {
      title: { text: 'Default layout' },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'no-title',
    options: {
      title: { text: null },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'long-wrapping-title',
    options: {
      title: {
        text: 'A deliberately long title that should wrap onto more than one line and push the plot area down'
      },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'subtitle-and-credits',
    options: {
      title: { text: 'With subtitle' },
      subtitle: { text: 'And a subtitle underneath it' },
      credits: { enabled: true, text: 'Credits text' },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'legend-bottom',
    options: {
      title: { text: 'Legend at the bottom' },
      legend: {
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal'
      },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'legend-right',
    options: {
      title: { text: 'Legend on the right' },
      legend: { align: 'right', verticalAlign: 'middle', layout: 'vertical' },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'legend-disabled',
    options: {
      title: { text: 'No legend' },
      legend: { enabled: false },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'long-y-labels',
    options: {
      title: { text: 'Wide y axis labels' },
      yAxis: { labels: { format: '{value:,.2f} thousand units' } },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'rotated-x-labels',
    options: {
      title: { text: 'Rotated x axis labels' },
      xAxis: {
        categories: categories.map((c) => `${c} of a long category name`),
        labels: { rotation: -45 }
      },
      series: baseSeries
    }
  },
  {
    name: 'explicit-margin',
    options: {
      chart: { margin: [60, 40, 80, 100] },
      title: { text: 'Explicit chart margin' },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'explicit-spacing',
    options: {
      chart: { spacing: [30, 30, 30, 30] },
      title: { text: 'Explicit chart spacing' },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'stacked-column',
    options: {
      chart: { type: 'column' },
      plotOptions: { column: { stacking: 'normal' } },
      title: { text: 'Stacked columns' },
      xAxis: { categories },
      series: baseSeries
    }
  },
  {
    name: 'pie-with-labels',
    options: {
      chart: { type: 'pie' },
      title: { text: 'Pie with data labels' },
      series: [
        {
          data: categories.map((c, i) => ({ name: `${c} slice`, y: i + 1 }))
        }
      ]
    }
  }
];

// Each scenario is exported at these sizes and types
const variants = [
  { type: 'svg' },
  { type: 'png' },
  { type: 'png', width: 300, height: 200 },
  { type: 'png', scale: 2 }
];

/**
 * Requests one export from a server.
 *
 * @param {string} url - The server base URL.
 * @param {Object} body - The request body.
 *
 * @returns {Promise<Object>} The response status and body.
 */
async function requestExport(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    return { ok: false, status: response.status, text: await response.text() };
  }

  return {
    ok: true,
    status: response.status,
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

/**
 * Extracts comparable geometry from an export result.
 *
 * @param {string} type - The export type.
 * @param {Buffer} buffer - The returned bytes.
 *
 * @returns {Object} The geometry.
 */
function geometryOf(type, buffer) {
  return type === 'svg'
    ? svgGeometry(buffer.toString('utf8'))
    : pngGeometry(buffer);
}

/**
 * Compares two geometry objects, returning the paths that differ.
 *
 * @param {*} a - Reference geometry.
 * @param {*} b - Candidate geometry.
 * @param {string} path - Current property path, used in recursion.
 *
 * @returns {Array<Object>} One entry per differing leaf.
 */
function diff(a, b, path = '') {
  const differences = [];

  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > config.tolerance) {
      differences.push({ path, reference: a, candidate: b });
    }
    return differences;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      differences.push(...diff(a[key], b[key], path ? `${path}.${key}` : key));
    }
    return differences;
  }

  if (a !== b) {
    differences.push({ path, reference: a, candidate: b });
  }

  return differences;
}

/**
 * Runs the comparison and reports.
 *
 * @returns {Promise<void>} Resolves once reported.
 */
async function run() {
  console.log(
    'Highcharts Export Server render comparison'.yellow.bold,
    `\n  reference : ${config.reference}`.green,
    `\n  candidate : ${config.candidate}`.green,
    `\n  cases     : ${scenarios.length * variants.length}`.green,
    `\n  tolerance : ${config.tolerance}px`.green,
    '\n'
  );

  const results = [];
  let compared = 0;
  let differing = 0;
  let errored = 0;

  for (const scenario of scenarios) {
    for (const variant of variants) {
      const label = `${scenario.name} [${variant.type}${variant.width ? ` ${variant.width}x${variant.height}` : ''}${variant.scale ? ` @${variant.scale}x` : ''}]`;

      const body = {
        type: variant.type,
        infile: scenario.options,
        ...(variant.width ? { width: variant.width } : {}),
        ...(variant.height ? { height: variant.height } : {}),
        ...(variant.scale ? { scale: variant.scale } : {})
      };

      const [reference, candidate] = [
        await requestExport(config.reference, body),
        await new Promise((resolve) =>
          setTimeout(
            () => resolve(requestExport(config.candidate, body)),
            config.delay
          )
        )
      ];

      if (!reference.ok || !candidate.ok) {
        errored++;
        console.log(
          `  ${'ERROR'.red} ${label}: reference ${reference.status}, candidate ${candidate.status}`
        );
        results.push({
          label,
          error: true,
          referenceStatus: reference.status,
          candidateStatus: candidate.status,
          referenceBody: reference.text?.slice(0, 200),
          candidateBody: candidate.text?.slice(0, 200)
        });
        continue;
      }

      let differences;

      try {
        differences = diff(
          geometryOf(variant.type, reference.buffer),
          geometryOf(variant.type, candidate.buffer)
        );
      } catch (error) {
        errored++;
        console.log(`  ${'ERROR'.red} ${label}: ${error.message}`);
        results.push({ label, error: true, message: error.message });
        continue;
      }

      compared++;

      if (differences.length) {
        differing++;
        console.log(`  ${'DIFF '.red} ${label}`);
        for (const d of differences) {
          console.log(
            `        ${d.path}: reference ${d.reference} -> candidate ${d.candidate}`
              .red
          );
        }
      } else {
        console.log(`  ${'same '.green} ${label}`);
      }

      results.push({ label, differences });

      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }
  }

  console.log('');
  console.log(`  compared : ${compared}`);
  console.log(`  differing: ${differing}`[differing ? 'red' : 'green']);
  console.log(`  errored  : ${errored}`[errored ? 'red' : 'green']);

  if (config.json) {
    writeFileSync(config.json, JSON.stringify(results, null, 2));
    console.log(`\n  wrote ${config.json}`.green);
  }

  if (errored || differing) {
    console.log(
      '\n[FAIL] The two servers do not lay out these charts identically.'.red
        .bold
    );
    process.exit(1);
  }

  console.log('\n[PASS] Layout is identical across every case.'.green.bold);
}

run().catch((error) => {
  console.log(`[ERROR] ${error.stack}`.red);
  process.exit(1);
});
