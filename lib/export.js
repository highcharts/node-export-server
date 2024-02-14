/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { readFileSync } from 'fs';
import path from 'path';
import * as url from 'url';

import cache from './cache.js';
import { log, logWithStack } from './logger.js';
import svgTemplate from './../templates/svg_export/svg_export.js';

import ExportError from './errors/ExportError.js';

const __basedir = url.fileURLToPath(new URL('.', import.meta.url));

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
const createPDF = (page, height, width, encoding) =>
  page.pdf({
    // This will remove an extra empty page in PDF exports
    height: height + 1,
    width,
    encoding
  });

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
const setAsConfig = (page, chart, options) =>
  page.evaluate(
    // eslint-disable-next-line no-undef
    (chart, options) => window.triggerExport(chart, options),
    chart,
    options
  );

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
  /**
   * Keeps track of all resources added on the page with addXXXTag. etc
   * It's VITAL that all added resources ends up here so we can clear things
   * out when doing a new export in the same page!
   */
  const injectedResources = [];

  /** Clear out all state set on the page with addScriptTag/addStyleTag. */
  const clearInjected = async (page) => {
    for (const res of injectedResources) {
      await res.dispose();
    }

    // Reset all CSS and script tags
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      const [, ...scriptsToRemove] = document.getElementsByTagName('script');
      // eslint-disable-next-line no-undef
      const [, ...stylesToRemove] = document.getElementsByTagName('style');
      // eslint-disable-next-line no-undef
      const [...linksToRemove] = document.getElementsByTagName('link');

      // Remove tags
      for (const element of [
        ...scriptsToRemove,
        ...stylesToRemove,
        ...linksToRemove
      ]) {
        element.remove();
      }
    });
  };

  try {
    log(4, '[export] Determining export path.');

    const exportOptions = options.export;

    // Force a rAF
    // See https://github.com/puppeteer/puppeteer/issues/7507
    // eslint-disable-next-line no-undef
    await page.evaluate(() => requestAnimationFrame(() => {}));

    // Decide whether display error or debbuger wrapper around it
    const displayErrors =
      exportOptions?.options?.chart?.displayErrors &&
      cache.getCache().activeManifest.modules.debugger;

    // eslint-disable-next-line no-undef
    await page.evaluate((d) => (window._displayErrors = d), displayErrors);

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
      await page.setContent(svgTemplate(chart));
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
          options
        );
      } else {
        // Basic configuration export
        chart.chart.height = exportOptions.height;
        chart.chart.width = exportOptions.width;

        await setAsConfig(page, chart, options);
      }
    }

    // Use resources
    const resources = options.customCode.resources;
    if (resources) {
      // Load custom JS code
      if (resources.js) {
        injectedResources.push(
          await page.addScriptTag({
            content: resources.js
          })
        );
      }

      // Load scripts from all custom files
      if (resources.files) {
        for (const file of resources.files) {
          try {
            const isLocal = !file.startsWith('http') ? true : false;

            // Add each custom script from resources' files
            injectedResources.push(
              await page.addScriptTag(
                isLocal
                  ? {
                      content: readFileSync(file, 'utf8')
                    }
                  : {
                      url: file
                    }
              )
            );
          } catch (error) {
            logWithStack(
              2,
              error,
              `[export] The JS file ${file} cannot be loaded.`
            );
          }
        }
      }

      // Load CSS
      if (resources.css) {
        let cssImports = resources.css.match(/@import\s*([^;]*);/g);
        if (cssImports) {
          // Handle css section
          for (let cssImportPath of cssImports) {
            if (cssImportPath) {
              cssImportPath = cssImportPath
                .replace('url(', '')
                .replace('@import', '')
                .replace(/"/g, '')
                .replace(/'/g, '')
                .replace(/;/, '')
                .replace(/\)/g, '')
                .trim();

              // Add each custom css from resources
              if (cssImportPath.startsWith('http')) {
                injectedResources.push(
                  await page.addStyleTag({
                    url: cssImportPath
                  })
                );
              } else if (options.customCode.allowFileResources) {
                injectedResources.push(
                  await page.addStyleTag({
                    path: path.join(__basedir, cssImportPath)
                  })
                );
              }
            }
          }
        }

        // The rest of the CSS section will be content by now
        injectedResources.push(
          await page.addStyleTag({
            content: resources.css.replace(/@import\s*([^;]*);/g, '') || ' '
          })
        );
      }
    }

    // Get the real chart size
    const size = isSVG
      ? await page.$eval(
          '#chart-container svg:first-of-type',
          (element, scale) => ({
            chartHeight: element.height.baseVal.value * scale,
            chartWidth: element.width.baseVal.value * scale
          }),
          parseFloat(exportOptions.scale)
        )
      : await page.evaluate(() => {
          // eslint-disable-next-line no-undef
          const { chartHeight, chartWidth } = window.Highcharts.charts[0];
          return {
            chartHeight,
            chartWidth
          };
        });

    // Set final height and width for viewport
    const viewportHeight = Math.ceil(size?.chartHeight || exportOptions.height);
    const viewportWidth = Math.ceil(size?.chartWidth || exportOptions.width);

    // Set the viewport for the first time
    // NOTE: the call to setViewport is expensive - can we get away with only
    // calling it once, e.g. moving this one into the isSVG condition below?
    await page.setViewport({
      height: viewportHeight,
      width: viewportWidth,
      deviceScaleFactor: isSVG ? 1 : parseFloat(exportOptions.scale)
    });

    // Prepare a zoom callback for the next evaluate call
    const zoomCallback = isSVG
      ? // In case of SVG the zoom must be set directly for body
        (scale) => {
          // Set the zoom as scale
          // eslint-disable-next-line no-undef
          document.body.style.zoom = scale;

          // Set the margin to 0px
          // eslint-disable-next-line no-undef
          document.body.style.margin = '0px';
        }
      : // No need for such scale manipulation in case of other types of exports
        () => {
          // Reset the zoom for other exports than to SVGs
          // eslint-disable-next-line no-undef
          document.body.style.zoom = 1;
        };

    // Set the zoom accordingly
    await page.evaluate(zoomCallback, parseFloat(exportOptions.scale));

    // Get the clip region for the page
    const { height, width, x, y } = await getClipRegion(page);

    if (!isSVG) {
      // Set the final viewport now that we have the real height
      await page.setViewport({
        width: Math.round(width),
        height: Math.round(height),
        deviceScaleFactor: parseFloat(exportOptions.scale)
      });
    }

    let data;
    // RASTERIZATION
    if (exportOptions.type === 'svg') {
      // SVG
      data = await createSVG(page);
    } else if (exportOptions.type === 'png' || exportOptions.type === 'jpeg') {
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
      data = await createPDF(page, viewportHeight, viewportWidth, 'base64');
    } else {
      throw new ExportError(
        `[export] Unsupported output format ${exportOptions.type}.`
      );
    }

    // Destroy old charts after the export is done
    await page.evaluate(() => {
      // We are not guaranteed that Highcharts is loaded, e,g, when doing SVG
      // exports
      if (typeof Highcharts !== 'undefined') {
        // eslint-disable-next-line no-undef
        const oldCharts = Highcharts.charts;

        // Check in any already existing charts
        if (Array.isArray(oldCharts) && oldCharts.length) {
          // Destroy old charts
          for (const oldChart of oldCharts) {
            oldChart && oldChart.destroy();
            // eslint-disable-next-line no-undef
            Highcharts.charts.shift();
          }
        }
      }
    });

    await clearInjected(page);
    return data;
  } catch (error) {
    await clearInjected(page);
    return error;
  }
};
