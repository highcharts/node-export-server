/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { addPageResources, clearPageResources } from './browser.js';
import { getCache } from './cache.js';
import { triggerExport } from './highcharts.js';
import { log } from './logger.js';

import svgTemplate from './../templates/svg_export/svg_export.js';

import ExportError from './errors/ExportError.js';

/**
 * Retrieves the clipping region coordinates of the specified page element with
 * the id 'chart-container'.
 *
 * @param {Object} page - Puppeteer page object.
 *
 * @returns {Promise<Object>} Promise resolving to an object containing
 * x, y, width, and height properties.
 */
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

/**
 * Creates an image using Puppeteer's page screenshot functionality with
 * specified options.
 *
 * @param {Object} page - Puppeteer page object.
 * @param {string} type - Image type.
 * @param {string} encoding - Image encoding.
 * @param {Object} clip - Clipping region coordinates.
 * @param {number} rasterizationTimeout - Timeout for rasterization
 * in milliseconds.
 *
 * @returns {Promise<Buffer>} Promise resolving to the image buffer or rejecting
 * with an ExportError for timeout.
 */
const createImage = (page, type, encoding, clip, rasterizationTimeout) =>
  Promise.race([
    page.screenshot({
      type,
      encoding,
      clip,
      captureBeyondViewport: true,
      fullPage: false,
      optimizeForSpeed: true,
      ...(type !== 'png' ? { quality: 80 } : {}),

      // #447, #463 - always render on a transparent page if the expected type
      // format is PNG
      omitBackground: type == 'png'
    }),
    new Promise((_resolve, reject) =>
      setTimeout(
        () => reject(new ExportError('Rasterization timeout')),
        rasterizationTimeout || 1500
      )
    )
  ]);

/**
 * Creates a PDF using Puppeteer's page pdf functionality with specified
 * options.
 *
 * @param {Object} page - Puppeteer page object.
 * @param {number} height - PDF height.
 * @param {number} width - PDF width.
 * @param {string} encoding - PDF encoding.
 *
 * @returns {Promise<Buffer>} Promise resolving to the PDF buffer.
 */
const createPDF = async (
  page,
  height,
  width,
  encoding,
  rasterizationTimeout
) => {
  await page.emulateMediaType('screen');
  return Promise.race([
    page.pdf({
      // This will remove an extra empty page in PDF exports
      height: height + 1,
      width,
      encoding
    }),
    new Promise((_resolve, reject) =>
      setTimeout(
        () => reject(new ExportError('Rasterization timeout')),
        rasterizationTimeout || 1500
      )
    )
  ]);
};

/**
 * Creates an SVG string by evaluating the outerHTML of the first 'svg' element
 * inside an element with the id 'container'.
 *
 * @param {Object} page - Puppeteer page object.
 *
 * @returns {Promise<string>} Promise resolving to the SVG string.
 */
const createSVG = (page) =>
  page.$eval('#container svg:first-of-type', (element) => element.outerHTML);

/**
 * Sets the specified chart and options as configuration into the triggerExport
 * function within the window context using page.evaluate.
 *
 * @param {Object} page - Puppeteer page object.
 * @param {any} chart - The chart object to be configured.
 * @param {Object} options - Configuration options for the chart.
 *
 * @returns {Promise<void>} Promise resolving after the configuration is set.
 */
const setAsConfig = async (page, chart, options, displayErrors) =>
  page.evaluate(triggerExport, chart, options, displayErrors);

/**
 * Exports to a chart from a page using Puppeteer.
 *
 * @param {Object} page - Puppeteer page object.
 * @param {any} chart - The chart object or SVG configuration to be exported.
 * @param {Object} options - Export options and configuration.
 *
 * @returns {Promise<string | Buffer | ExportError>} Promise resolving to
 * the exported data or rejecting with an ExportError.
 */
export default async (page, chart, options) => {
  // Injected resources array (additional JS and CSS)
  let injectedResources = [];

  try {
    log(4, '[export] Determining export path.');

    const exportOptions = options.export;

    // Decide whether display error or debbuger wrapper around it
    const displayErrors =
      exportOptions?.options?.chart?.displayErrors &&
      getCache().activeManifest.modules.debugger;

    let isSVG;
    if (
      chart.indexOf &&
      (chart.indexOf('<svg') >= 0 || chart.indexOf('<?xml') >= 0)
    ) {
      // SVG input handling
      log(4, '[export] Treating as SVG.');

      // If input is also SVG, just return it
      if (exportOptions.type === 'svg') {
        return chart;
      }

      isSVG = true;
      await page.setContent(svgTemplate(chart), {
        waitUntil: 'domcontentloaded'
      });
    } else {
      // JSON config handling
      log(4, '[export] Treating as config.');

      // Need to perform straight inject
      if (exportOptions.strInj) {
        // Injection based configuration export
        await setAsConfig(
          page,
          {
            chart: {
              height: exportOptions.height,
              width: exportOptions.width
            }
          },
          options,
          displayErrors
        );
      } else {
        // Basic configuration export
        chart.chart.height = exportOptions.height;
        chart.chart.width = exportOptions.width;

        await setAsConfig(page, chart, options, displayErrors);
      }
    }

    // Keeps track of all resources added on the page with addXXXTag. etc
    // It's VITAL that all added resources ends up here so we can clear things
    // out when doing a new export in the same page!
    injectedResources = await addPageResources(page, options);

    // Get the real chart size and set the zoom accordingly
    const size = isSVG
      ? await page.evaluate((scale) => {
          const svgElement = document.querySelector(
            '#chart-container svg:first-of-type'
          );

          // Get the values correctly scaled
          const chartHeight = svgElement.height.baseVal.value * scale;
          const chartWidth = svgElement.width.baseVal.value * scale;

          // In case of SVG the zoom must be set directly for body
          // Set the zoom as scale
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

          // No need for such scale manipulation in case of other types of exports
          // Reset the zoom for other exports than to SVGs
          // eslint-disable-next-line no-undef
          document.body.style.zoom = 1;

          return {
            chartHeight,
            chartWidth
          };
        });

    // Set final height and width for viewport
    const viewportHeight = Math.ceil(size.chartHeight || exportOptions.height);
    const viewportWidth = Math.ceil(size.chartWidth || exportOptions.width);

    // Get the clip region for the page
    const { x, y } = await getClipRegion(page);

    // Set the final viewport now that we have the real height
    await page.setViewport({
      height: viewportHeight,
      width: viewportWidth,
      deviceScaleFactor: isSVG ? 1 : parseFloat(exportOptions.scale)
    });

    let data;
    // Rasterization process
    if (exportOptions.type === 'svg') {
      // SVG
      data = await createSVG(page);
    } else if (['png', 'jpeg'].includes(exportOptions.type)) {
      // PNG or JPEG
      data = await createImage(
        page,
        exportOptions.type,
        'base64',
        {
          width: viewportWidth,
          height: viewportHeight,
          x,
          y
        },
        exportOptions.rasterizationTimeout
      );
    } else if (exportOptions.type === 'pdf') {
      // PDF
      data = await createPDF(
        page,
        viewportHeight,
        viewportWidth,
        'base64',
        exportOptions.rasterizationTimeout
      );
    } else {
      throw new ExportError(
        `[export] Unsupported output format ${exportOptions.type}.`
      );
    }

    // Clear previously injected JS and CSS resources
    await clearPageResources(page, injectedResources);
    return data;
  } catch (error) {
    await clearPageResources(page, injectedResources);
    return error;
  }
};
