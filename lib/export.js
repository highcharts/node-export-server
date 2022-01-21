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
const createImage = async (page, type, encoding, clip) =>
  await page.screenshot({
    type,
    encoding,
    clip
  });

/** Turn page into a PDF */
const createPDF = async (page, height, width, encoding) =>
  await page.pdf({
    height,
    width,
    encoding
  });

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
  try {
    const page = await browser.newPage();

    // Are we doing an SVG export?
    if (
      chart.indexOf &&
      (chart.indexOf('<svg') >= 0 || chart.indexOf('<?xml') >= 0)
    ) {
      // If input is also svg, just return it
      if (options.export.type === 'svg') {
        return chart;
      }

      log(4, '[export] - Treating as SVG.');
      await page.setContent(svgTemplate(chart));
    } else {
      log(4, '[export] - Treating as config.');
      await page.setContent(
        jsonTemplate(chart, options.customCode.callback, cache.highcharts())
      );
      /// TO DO - Add timeout function
    }

    await page.setViewport({
      width: parseFloat(options.export.width) || 800,
      height: parseFloat(options.export.height) || 1200,
      deviceScaleFactor: parseFloat(options.export.scale) || 1
    });

    // Get the clip region for the page
    const { height, width, x, y } = await getClipRegion(page);

    // Heuristically setting the height of tall charts
    const calcHeight = height; //// TO DO: Math.trunc(height > width * 1.25 ? width * 0.7 : height);

    // Set the final viewport now that we have the real height
    await page.setViewport({
      width,
      height: calcHeight,
      deviceScaleFactor: parseFloat(options.export.scale) || 1
    });

    let data;
    // Convert to one of available formats
    if (options.export.type === 'svg') {
      // SVG
      data = await createSVG(page);
    } else if (
      options.export.type === 'png' ||
      options.export.type === 'jpeg'
    ) {
      // PNG or JPEG
      data = await createImage(page, options.export.type, 'base64', {
        width,
        height: calcHeight,
        x,
        y
      });
    } else if (options.export.type === 'pdf') {
      // PDF
      data = await createPDF(page, height, width, 'base64');
    }

    // Close the page
    await page.close();

    // Save the data and output file
    return data;
  } catch (error) {
    log(1, `[export] - Error encountered during export: ${error}.`);
    return {
      ...error,
      message: 'Unable to process the chart, please check your input data.'
    };
  }
};
