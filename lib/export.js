/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// TODO: remove this temp benchmark stuff. I had this idea of doing a general benchmarking
// system, but it adds so much bloat in the code that it shouldn't be there.

import benchmark from './benchmark.js';
import cache from './cache.js';
import { log } from './logger.js';
import svgTemplate from './../templates/svg_export/svg_export.js';

import { readFileSync } from 'fs';
import path from 'path';
import * as url from 'url';

const __basedir = url.fileURLToPath(new URL('.', import.meta.url));

// const jsonTemplate = require('./../templates/json_export/json_export.js');

/**
 * Gets the clip region for the chart DOM node.
 *
 * @param {object} page - A page of a browser instance.
 * @return {object} - A clipped region.
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
 * Rasterizes the page to an image (PNG or JPEG)
 *
 * @param {object} page - A page of a browser instance.
 * @param {string} type - The type of a result image.
 * @param {string} encoding - The type of encoding used.
 * @param {string} clip - The clip region.
 * @param {number} rasterizationTimeout - The rasterization timeout
 * in milliseconds.
 * @returns {string} - A string representation of a screenshot.
 */
const createImage = async (page, type, encoding, clip, rasterizationTimeout) =>
  Promise.race([
    page.screenshot({
      type,
      encoding,
      clip,

      // #447, #463 - always render on a transparent page if
      // the expected type format is PNG
      omitBackground: type == 'png'
    }),
    new Promise((_resolve, reject) =>
      setTimeout(
        () => reject(new Error('Rasterization timeout')),
        rasterizationTimeout || 1500
      )
    )
  ]);

/**
 * Turns page into a PDF.
 *
 * @param {object} page - A page of a browser instance.
 * @param {number} height - The height of a chart.
 * @param {number} width - The width of a chart.
 * @param {string} encoding - The type of encoding used.
 * @return {object} - A buffer with PDF representation.
 */
const createPDF = async (page, height, width, encoding) =>
  await page.pdf({
    // This will remove an extra empty page in PDF exports
    height: height + 1,
    width,
    encoding
  });

/**
 * Exports as a SVG.
 *
 * @param {object} page - A page of a browser instance.
 * @return {object} - The outerHTML element with the SVG representation.
 */
const createSVG = async (page) =>
  await page.$eval(
    '#container svg:first-of-type',
    (element) => element.outerHTML
  );

/** Load config into a page and render a chart */
const setAsConfig = async (page, chart, options) =>
  await page.evaluate(
    // eslint-disable-next-line no-undef
    (chart, options) => window.triggerExport(chart, options),
    chart,
    options
  );

/** Load SVG into a page */
// const setAsSVG = async (page, svgStr) => true;

/**
 * Does an export for a given browser.
 *
 * @param {object} browser - A browser instance.
 * @param {object} chart - Chart's options.
 * @param {object} options - All options object.
 * @return {object} - The data returned from one of the methods for exporting
 * a specific type of an image.
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
    const exportBench = benchmark('Puppeteer');

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

    const svgBench = benchmark('SVG handling');

    let isSVG;

    if (
      chart.indexOf &&
      (chart.indexOf('<svg') >= 0 || chart.indexOf('<?xml') >= 0)
    ) {
      // SVG INPUT HANDLING

      log(4, '[export] Treating as SVG.');

      // If input is also svg, just return it
      if (exportOptions.type === 'svg') {
        return chart;
      }

      isSVG = true;
      const setPageBench = benchmark('Setting content');
      await page.setContent(svgTemplate(chart));
      setPageBench();
    } else {
      // JSON Config handling

      log(4, '[export] Treating as config.');

      // Need to perform straight inject
      if (exportOptions.strInj) {
        // Injection based configuration export
        const setPageBench = benchmark('Setting page content (inject)');

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

        setPageBench();
      } else {
        // Basic configuration export

        chart.chart.height = exportOptions.height;
        chart.chart.width = exportOptions.width;

        const setContentBench = benchmark('Setting page content (config)');
        await setAsConfig(page, chart, options);
        setContentBench();
      }
    }

    svgBench();
    const resBench = benchmark('Applying resources');

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
          } catch (notice) {
            log(4, '[export] JS file not found.');
          }
        }
      }

      const cssBench = benchmark('Loading css');

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

      cssBench();
    }

    resBench();

    // Get the real chart size
    const size = isSVG
      ? await page.$eval(
          '#chart-container svg:first-of-type',
          async (element, scale) => {
            return {
              chartHeight: element.height.baseVal.value * scale,
              chartWidth: element.width.baseVal.value * scale
            };
          },
          parseFloat(exportOptions.scale)
        )
      : await page.evaluate(async () => {
          // eslint-disable-next-line no-undef
          const { chartHeight, chartWidth } = window.Highcharts.charts[0];
          return {
            chartHeight,
            chartWidth
          };
        });

    const vpBench = benchmark('Setting viewport');

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

    vpBench();

    let data;

    const expBenchmark = benchmark('Rasterizing chart');

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
      throw `Unsupported output format ${exportOptions.type}`;
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

    expBenchmark();
    exportBench();

    await clearInjected(page);

    return data;
  } catch (error) {
    await clearInjected(page);
    log(1, `[export] Error encountered during export: ${error}`);

    return error;
  }
};
