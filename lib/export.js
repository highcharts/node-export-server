/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format
const cache = require('./cache');
const { log } = require('./logger');

const jsonTemplate = require('./../templates/json_export/json_export.js');
const svgTemplate = require('./../templates/svg_export/svg_export.js');

/** Get the clip region for the chart DOM node */
const getClipRegion = (page) =>
  page.$eval('#chart-container', (element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return {
      x,
      y,
      width,
      height: Math.trunc(height > 1 ? height : 500)
    };
  });

/** Rasterize the page to an image (PNG or JPEG) */
const createImage = async (page, type, screenProps, clip) =>
  await page.screenshot(
    Object.assign(
      {
        type,
        clip
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
        height
      },
      screenProps
    )
  );

/** Export as a SVG */
const createSVG = async (page) =>
  await page.$eval(
    '#container svg:first-of-type',
    (element) => element.outerHTML
  );

/**
 * Do an export for a given browser
 */
module.exports = async (browser, chart, options) => {
  let output = {};

  try {
    const page = await browser.newPage();

    // Are we doing an SVG export?
    if (options.payload.svg) {
      // If input is also svg, just return it
      if (options.export.type === 'svg') {
        return {
          data: options.payload.svg
        };
      }

      log(4, '[export] - Treating as SVG.');
      await page.setContent(svgTemplate(chart));
    } else {
      log(4, '[export] - Treating as config.');
      await page.setContent(jsonTemplate(chart, cache.highcharts()));
      /// TO DO - Add timeout function
    }

    await page.setViewport({
      width: parseInt(chart.width) || options.export.width || 800,
      height: options.export.height || 1200,
      deviceScaleFactor: parseFloat(chart.scale) || options.export.scale || 1
    });

    // Get the clip region for the page
    const { height, width, x, y } = await getClipRegion(page);

    // Heuristically setting the height of tall charts
    const calcHeight = Math.trunc(height > width * 1.25 ? width * 0.7 : height);

    // Set the final viewport now that we have the real height
    await page.setViewport({
      width: width,
      height: calcHeight,
      deviceScaleFactor: parseFloat(chart.scale) || options.export.scale || 1
    });

    // Let the rasterization begin
    const sprops = {
      encoding: 'base64'
    };

    let shot;
    if (options.export.type === 'svg') {
      // SVG
      shot = await createSVG(page);
    } else if (
      options.export.type === 'png' ||
      options.export.type === 'jpeg'
    ) {
      // PNG or JPEG
      shot = await createImage(page, options.export.type, sprops, {
        width,
        height: calcHeight,
        x,
        y
      });
    } else if (options.export.type === 'pdf') {
      // PDF
      shot = await createPDF(page, sprops, width, height);
    }

    // Save the data and output file
    output = {
      data: shot,
      filename: options.export.outfile
    };
    await page.close();
  } catch (error) {
    log(1, `[export] - Error encountered during export: ${error}.`);
    output = {
      error: true,
      message: 'Unable to process the chart, please check your input data.'
    };
  }

  return output;
};
