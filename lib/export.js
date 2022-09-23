/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const fs = require('fs');
const path = require('path');

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
    log(4, '[export] Getting browser page.');

    const page = await browser.newPage();

    log(4, '[export] Determining export path.');

    const exportOptions = options.export;

    // Decide whether display error or debbuger wrapper around it
    const displayErrors =
      exportOptions?.options?.chart?.displayErrors &&
      cache.getCache().activeManifest.modules.debugger;

    page.on('pageerror', async (err) => {
      if (!displayErrors) {
        await page.$eval(
          '#container',
          (element, errorMessage) => {
            element.innerHTML = errorMessage;
          },
          `<h1>Chart input data error</h1>${err.toString()}`
        );
      }
    });

    let isSVG;
    // Are we doing an SVG export?
    if (
      chart.indexOf &&
      (chart.indexOf('<svg') >= 0 || chart.indexOf('<?xml') >= 0)
    ) {
      // If input is also svg, just return it
      if (exportOptions.type === 'svg') {
        return chart;
      }

      log(4, '[export] Treating as SVG.');
      isSVG = true;
      await page.setContent(svgTemplate(chart));
    } else {
      log(4, '[export] Treating as config.');
      // Need to perform straight inject
      if (exportOptions.strInj) {
        await page.setContent(
          jsonTemplate(
            {
              chart: {
                height: exportOptions.height,
                width: exportOptions.width
              }
            },
            options,
            cache.highcharts()
          )
        );
      } else {
        // Set the final chart size
        chart.chart.height = exportOptions.height;
        chart.chart.width = exportOptions.width;

        // Set page's content
        await page.setContent(jsonTemplate(chart, options, cache.highcharts()));
      }
    }

    // Use resources
    const resources = options.customCode.resources;
    if (resources) {
      // Load custom JS code
      if (resources.js) {
        await page.addScriptTag({
          content: resources.js
        });
      }

      // Load scripts from all custom files
      if (resources.files) {
        for (const file of resources.files) {
          try {
            const isLocal = !file.startsWith('http') ? true : false;

            // Add each custom script from resources' files
            await page.addScriptTag(
              isLocal
                ? {
                    content: fs.readFileSync(path.join(__basedir, file), 'utf8')
                  }
                : {
                    url: file
                  }
            );
          } catch (notice) {
            log(4, '[export] JS file not found.');
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
                .replace(/\"/g, '')
                .replace(/\'/g, '')
                .replace(/\;/, '')
                .replace(/\)/g, '')
                .trim();

              // Add each custom css from resources
              if (cssImportPath.startsWith('http')) {
                await page.addStyleTag({
                  url: cssImportPath
                });
              } else if (options.customCode.allowFileResources) {
                await page.addStyleTag({
                  path: path.join(__basedir, cssImportPath)
                });
              }
            }
          }
        }

        // The rest of the CSS section will be content by now
        await page.addStyleTag({
          content: resources.css.replace(/@import\s*([^;]*);/g, '')
        });
      }
    }

    // Get the real chart size
    const size = isSVG
      ? await page.$eval(
          '#chart-container svg:first-of-type',
          async (element) => {
            const bBox = element.getBBox();
            return {
              chartHeight: bBox.height,
              chartWidth: bBox.width
            };
          }
        )
      : await page.evaluate(async () => {
          const { chartHeight, chartWidth } = window.Highcharts.charts[0];
          return {
            chartHeight,
            chartWidth
          };
        });

    await page.setViewport({
      height: Math.ceil(size?.chartHeight || exportOptions.height),
      width: Math.ceil(size?.chartWidth || exportOptions.width),
      deviceScaleFactor: parseFloat(exportOptions.scale)
    });

    // Get the clip region for the page
    const { height, width, x, y } = await getClipRegion(page);

    // Set the final viewport now that we have the real height
    await page.setViewport({
      width: Math.round(width),
      height: Math.round(height),
      deviceScaleFactor: parseFloat(exportOptions.scale)
    });

    let data;
    // Convert to one of available formats
    if (exportOptions.type === 'svg') {
      // SVG
      data = await createSVG(page);
    } else if (exportOptions.type === 'png' || exportOptions.type === 'jpeg') {
      // PNG or JPEG
      data = await createImage(page, exportOptions.type, 'base64', {
        width,
        height,
        x,
        y
      });
    } else if (exportOptions.type === 'pdf') {
      // PDF
      data = await createPDF(page, height, width, 'base64');
    }

    // Close the page
    await page.close();

    // Save the data and output file
    return data;
  } catch (error) {
    log(1, `[export] Error encountered during export: ${error}`);
    return {
      ...error,
      message: 'Unable to process the chart, please check your input data.'
    };
  }
};
