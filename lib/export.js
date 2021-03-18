/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const { join } = require('path').posix;
const configTemplate = require('./../templates/json_export/json_export.js');
const svgTemplate = require('./../templates/svg_export/svg_export.js');
const log = require('./logger').log;
const configHandler = require('./config');
const cache = require('./cache');

// /////////////////////////////////////////////////////////////////////////////

/** Get the clip region for the chart DOM node */
const getClipRegion = (page) =>
  page.$eval('#chart-container', (el) => {
    const { x, y, width, height } = el.getBoundingClientRect();
    return {
      x,
      y,
      width,
      height: Math.trunc(height > 1 ? height : 500)
    };
  });

/** Rasterize the page to an image (png or jpeg) */
const createImage = async (page, type, screenProps, width, height, x, y) =>
  await page.screenshot(
    Object.assign(
      {
        type: type,
        clip: {
          width,
          height: height,
          x,
          y
        }
      },
      screenProps
    )
  );

/** Turn page into a PDF */
const createPDF = async (page, screenProps, width, height) =>
  await page.pdf(
    Object.assign(
      {
        width,
        height: height
      },
      screenProps
    )
  );

/** Export as SVG */
const createSVG = async (page, chart) => false;

/**
 *
 * Echo input
 *
 * Should just return the input directly.
 * Used for svg -> svg export
 */
const echoInput = async (input, screenProps) => false;

// /////////////////////////////////////////////////////////////////////////////

/**
 * Do an export for a given browser
 */
module.exports = async (browser, settings, chart) => {
  let output = {};

  try {
    const page = await browser.newPage();
    const hcCfg = configHandler.config.highcharts || {};

    // Are we doing an SVG export?
    if (chart.svgstr) {
      log(4, 'export.js - treating as SVG');
      await page.setContent(svgTemplate(chart));
    } else {
      log(4, 'export.js - treating as config');
      await page.setContent(configTemplate(chart, cache.highcharts()));

      // @TODO: add timeout function
    }

    await page.setViewport({
      width: parseInt(chart.width) || hcCfg.defaultWidth || 800,
      height: hcCfg.defaultHeight || 1200,
      deviceScaleFactor: parseFloat(chart.scale) || hcCfg.defaultScale || 1
    });

    // Get the clip region for the page
    const { height, width, x, y } = await getClipRegion(page);

    // Heuristically setting the height of tall charts
    const calcHeight = Math.trunc(height > width * 1.25 ? width * 0.7 : height);

    // Set the final viewport now that we have the real height
    await page.setViewport({
      width: width,
      height: calcHeight,
      deviceScaleFactor: parseFloat(chart.scale) || hcCfg.defaultScale || 1
    });

    // Let the rasterization begin.

    const sprops = {};

    // We need different output strategies based on the async property
    if (chart.async) {
      sprops.path = chart.out;
    } else {
      sprops.encoding = 'base64';
    }

    let shot;

    if (chart.format === 'svg') {
      // Must do an eval here unless the input is also svg, in which case
      // just return the input.

      if (chart.svgstr) {
        shot = echoInput(chart.svgstr, sprops);
      } else {
        // Run Highcharts toSVG function
      }
    }
    if (chart.format === 'png' || chart.format === 'jpeg') {
      shot = await createImage(
        page,
        chart.format,
        sprops,
        width,
        calcHeight,
        x,
        y
      );
    } else {
      // PDF
      shot = await createPDF(page, sprops, width, height);
    }

    // If we're doing async output, return the filename, otherwise return the
    // buffer containing the result.
    if (chart.async) {
      output.filename = chart.out;
    } else {
      output.data = shot;
    }

    await page.close();
  } catch (e) {
    log(1, `export.js - error encountered during export: ${e}`);
    output = {
      error: true,
      message: 'Unable to process the chart, please check your input data'
    };
  }

  return output;
};
