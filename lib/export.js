/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This module handles chart export functionality using Puppeteer.
 * It supports exporting charts as SVG, PNG, JPEG, and PDF formats. The module
 * manages page resources, sets up the export environment, and processes chart
 * configurations or SVG inputs for rendering. Exports to a chart from a page
 * using Puppeteer.
 */

import { addPageResources, clearPageResources } from './browser.js';
import { createChart } from './highcharts.js';
import { log } from './logger.js';

import svgTemplate from '../templates/svgExport/svgExport.js';

import ExportError from './errors/ExportError.js';

/**
 * Exports to a chart from a page using Puppeteer.
 *
 * @async
 * @function puppeteerExport
 *
 * @param {Object} page - Puppeteer page object.
 * @param {Object} exportOptions - The configuration object containing `export`
 * options.
 * @param {Object} customLogicOptions - The configuration object containing
 * `customLogic` options.
 *
 * @returns {Promise<(string|Buffer|ExportError)>} A Promise that resolves
 * to the exported data or rejecting with an `ExportError`.
 *
 * @throws {ExportError} Throws an `ExportError` if export to an unsupported
 * output format occurs.
 */
export async function puppeteerExport(page, exportOptions, customLogicOptions) {
  // Injected resources array (additional JS and CSS)
  const injectedResources = [];

  try {
    let isSVG = false;

    // Decide on the export method
    if (exportOptions.svg) {
      log(4, '[export] Treating as SVG input.');

      // If the `type` is also SVG, return the input
      if (exportOptions.type === 'svg') {
        return exportOptions.svg;
      }

      // Mark as SVG export for the later size corrections
      isSVG = true;

      // SVG export
      await page.setContent(svgTemplate(exportOptions.svg), {
        waitUntil: 'domcontentloaded'
      });
    } else {
      log(4, '[export] Treating as JSON config.');

      // Options export
      await page.evaluate(createChart, exportOptions, customLogicOptions);
    }

    // Keeps track of all resources added on the page with addXXXTag. etc
    // It's VITAL that all added resources ends up here so we can clear things
    // out when doing a new export in the same page!
    injectedResources.push(
      ...(await addPageResources(page, customLogicOptions))
    );

    // Get the real chart size and set the zoom accordingly
    const size = isSVG
      ? await page.evaluate((scale) => {
          const svgElement = document.querySelector(
            '#chart-container svg:first-of-type'
          );

          // Get the values correctly scaled
          const chartHeight = svgElement.height.baseVal.value * scale;
          const chartWidth = svgElement.width.baseVal.value * scale;

          // In case of SVG the zoom must be set directly for body as scale
          // eslint-disable-next-line no-undef
          document.body.style.zoom = scale;

          // Set the margin to 0px
          // eslint-disable-next-line no-undef
          document.body.style.margin = '0px';

          return {
            chartHeight,
            chartWidth
          };
        }, parseFloat(exportOptions.scale))
      : await page.evaluate(() => {
          // eslint-disable-next-line no-undef
          const { chartHeight, chartWidth } = window.Highcharts.charts[0];

          // No need for such scale manipulation in case of other types
          // of exports. Reset the zoom for other exports than to SVGs
          // eslint-disable-next-line no-undef
          document.body.style.zoom = 1;

          return {
            chartHeight,
            chartWidth
          };
        });

    // Get the clip region for the page
    const { x, y } = await _getClipRegion(page);

    // Set final `height` for viewport
    const viewportHeight = Math.abs(
      Math.ceil(size.chartHeight || exportOptions.height)
    );

    // Set final `width` for viewport
    const viewportWidth = Math.abs(
      Math.ceil(size.chartWidth || exportOptions.width)
    );

    // Set the final viewport now that we have the real height
    await page.setViewport({
      height: viewportHeight,
      width: viewportWidth,
      deviceScaleFactor: isSVG ? 1 : parseFloat(exportOptions.scale)
    });

    let result;
    // Rasterization process
    switch (exportOptions.type) {
      case 'svg':
        result = await _createSVG(page);
        break;
      case 'png':
      case 'jpeg':
        result = await _createImage(
          page,
          exportOptions.type,
          {
            width: viewportWidth,
            height: viewportHeight,
            x,
            y
          },
          exportOptions.rasterizationTimeout
        );
        break;
      case 'pdf':
        result = await _createPDF(
          page,
          viewportHeight,
          viewportWidth,
          exportOptions.rasterizationTimeout
        );
        break;
      default:
        throw new ExportError(
          `[export] Unsupported output format: ${exportOptions.type}.`,
          400
        );
    }

    // Clear previously injected JS and CSS resources
    await clearPageResources(page, injectedResources);
    return result;
  } catch (error) {
    await clearPageResources(page, injectedResources);
    return error;
  }
}

/**
 * Retrieves the clipping region coordinates of the specified page element
 * with the 'chart-container' id.
 *
 * @async
 * @function _getClipRegion
 *
 * @param {Object} page - Puppeteer page object.
 *
 * @returns {Promise<Object>} A Promise that resolves to an object containing
 * `x`, `y`, `width`, and `height` properties.
 */
async function _getClipRegion(page) {
  return page.$eval('#chart-container', (element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return {
      x,
      y,
      width,
      height: Math.trunc(height > 1 ? height : 500)
    };
  });
}

/**
 * Creates an SVG by evaluating the `outerHTML` of the first 'svg' element
 * inside an element with the id 'container'.
 *
 * @async
 * @function _createSVG
 *
 * @param {Object} page - Puppeteer page object.
 *
 * @returns {Promise<string>} A Promise that resolves to the SVG string.
 */
async function _createSVG(page) {
  return page.$eval(
    '#container svg:first-of-type',
    (element) => element.outerHTML
  );
}

/**
 * Creates an image using Puppeteer's page `screenshot` functionality with
 * specified options.
 *
 * @async
 * @function _createImage
 *
 * @param {Object} page - Puppeteer page object.
 * @param {string} type - Image type.
 * @param {Object} clip - Clipping region coordinates.
 * @param {number} rasterizationTimeout - Timeout for rasterization
 * in milliseconds.
 *
 * @returns {Promise<Buffer>} A Promise that resolves to the image buffer
 * or rejecting with an `ExportError` for timeout.
 */
async function _createImage(page, type, clip, rasterizationTimeout) {
  return Promise.race([
    page.screenshot({
      type,
      clip,
      encoding: 'base64',
      fullPage: false,
      optimizeForSpeed: true,
      captureBeyondViewport: true,
      ...(type !== 'png' ? { quality: 80 } : {}),
      // Always render on a transparent page if the expected type format is PNG
      omitBackground: type == 'png' // #447, #463
    }),
    new Promise((_resolve, reject) =>
      setTimeout(
        () => reject(new ExportError('Rasterization timeout', 408)),
        rasterizationTimeout || 1500
      )
    )
  ]);
}

/**
 * Creates a PDF using Puppeteer's page `pdf` functionality with specified
 * options.
 *
 * @async
 * @function _createPDF
 *
 * @param {Object} page - Puppeteer page object.
 * @param {number} height - PDF height.
 * @param {number} width - PDF width.
 * @param {number} rasterizationTimeout - Timeout for rasterization
 * in milliseconds.
 *
 * @returns {Promise<Buffer>} A Promise that resolves to the PDF buffer.
 */
async function _createPDF(page, height, width, rasterizationTimeout) {
  await page.emulateMediaType('screen');
  return page.pdf({
    // This will remove an extra empty page in PDF exports
    height: height + 1,
    width,
    encoding: 'base64',
    timeout: rasterizationTimeout || 1500
  });
}

export default {
  puppeteerExport
};
