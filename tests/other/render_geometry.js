/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * Geometry extraction for rendered exports, used by render_compare_test.js.
 *
 * Comparing exports byte for byte, or even pixel for pixel, is too noisy to be
 * useful: a different Chrome build shifts antialiasing and font hinting
 * everywhere while the layout is unchanged. What actually matters when checking
 * an upgrade is whether the geometry moved - margins, plot area, overall size -
 * so that is what these measure.
 *
 * For SVG the geometry is read straight out of the markup, which is exact. For
 * PNG the image is decoded and the bounding box of non-transparent pixels is
 * found, which gives the margins around the drawn content.
 */

import { inflateSync } from 'zlib';

/**
 * Reads the dimensions and pixel data out of a PNG buffer.
 *
 * Supports 8 bit non-interlaced greyscale, RGB, greyscale+alpha and RGBA, which
 * covers what the export server produces. Anything else is reported rather than
 * guessed at.
 *
 * @param {Buffer} buffer - The PNG file contents.
 *
 * @returns {Object} An object with width, height, channels and pixel data.
 */
export function decodePng(buffer) {
  if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('Not a PNG file.');
  }

  let offset = 8;
  let header;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12]
      };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  if (!header) {
    throw new Error('PNG has no IHDR chunk.');
  }

  const channelsByColorType = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = channelsByColorType[header.colorType];

  if (header.bitDepth !== 8 || !channels || header.interlace !== 0) {
    throw new Error(
      `Unsupported PNG: bit depth ${header.bitDepth}, colour type ${header.colorType}, interlace ${header.interlace}.`
    );
  }

  const raw = inflateSync(Buffer.concat(idat));
  const { width, height } = header;
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);

  // Undo the per-scanline filtering
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= channels ? prev[i - channels] : 0;
      let value = line[i];

      if (filter === 1) {
        value += a;
      } else if (filter === 2) {
        value += b;
      } else if (filter === 3) {
        value += (a + b) >> 1;
      } else if (filter === 4) {
        // Paeth
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }

      out[i] = value & 0xff;
    }
  }

  return { width, height, channels, pixels };
}

/**
 * Finds the bounding box of drawn content in a PNG, and the margins around it.
 *
 * Exports are rendered on a transparent background, so alpha identifies content
 * directly. Where there is no alpha channel, anything differing from the top
 * left pixel is treated as content.
 *
 * @param {Buffer} buffer - The PNG file contents.
 *
 * @returns {Object} Image dimensions, content box and margins.
 */
export function pngGeometry(buffer) {
  const { width, height, channels, pixels } = decodePng(buffer);
  const hasAlpha = channels === 4 || channels === 2;

  // Reference colour for images without alpha
  const bg = [];
  for (let c = 0; c < channels; c++) {
    bg.push(pixels[c]);
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width * channels + x * channels;
      let content;

      if (hasAlpha) {
        content = pixels[i + channels - 1] > 8;
      } else {
        content = false;
        for (let c = 0; c < channels; c++) {
          if (Math.abs(pixels[i + c] - bg[c]) > 8) {
            content = true;
            break;
          }
        }
      }

      if (content) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    return { width, height, empty: true };
  }

  return {
    width,
    height,
    content: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    },
    margins: {
      top: minY,
      right: width - 1 - maxX,
      bottom: height - 1 - maxY,
      left: minX
    }
  };
}

/**
 * Reads layout geometry out of an exported SVG.
 *
 * The plot background rectangle is the most direct measure of margins there is -
 * its position and size within the SVG are exactly the space Highcharts left
 * around the plot area.
 *
 * @param {string} svg - The SVG markup.
 *
 * @returns {Object} The SVG dimensions and the geometry found within it.
 */
export function svgGeometry(svg) {
  /**
   * Reads a numeric attribute from the first element matching a pattern.
   *
   * @param {RegExp} pattern - Pattern whose first group is the attribute value.
   *
   * @returns {number|null} The value, or null when not present.
   */
  const num = (pattern) => {
    const match = svg.match(pattern);
    return match ? Math.round(parseFloat(match[1]) * 100) / 100 : null;
  };

  const plot = svg.match(
    /class="highcharts-plot-background"[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/
  );

  const geometry = {
    width: num(/<svg[^>]*\swidth="([\d.]+)"/),
    height: num(/<svg[^>]*\sheight="([\d.]+)"/),
    viewBox: (svg.match(/viewBox="([^"]+)"/) || [])[1] ?? null,
    plotBackground: plot
      ? {
          x: Math.round(parseFloat(plot[1]) * 100) / 100,
          y: Math.round(parseFloat(plot[2]) * 100) / 100,
          width: Math.round(parseFloat(plot[3]) * 100) / 100,
          height: Math.round(parseFloat(plot[4]) * 100) / 100
        }
      : null,
    // Counts, so that a missing or duplicated piece of furniture shows up
    counts: {
      axisLabels: (svg.match(/class="highcharts-axis-labels/g) || []).length,
      series: (svg.match(/class="highcharts-series /g) || []).length,
      legendItems: (svg.match(/class="highcharts-legend-item/g) || []).length,
      titles: (svg.match(/class="highcharts-title"/g) || []).length,
      subtitles: (svg.match(/class="highcharts-subtitle"/g) || []).length,
      credits: (svg.match(/class="highcharts-credits"/g) || []).length
    }
  };

  // Derived margins: the space the plot area leaves around itself
  if (geometry.plotBackground && geometry.width && geometry.height) {
    const p = geometry.plotBackground;

    geometry.margins = {
      top: p.y,
      right: Math.round((geometry.width - (p.x + p.width)) * 100) / 100,
      bottom: Math.round((geometry.height - (p.y + p.height)) * 100) / 100,
      left: p.x
    };
  }

  return geometry;
}

export default { decodePng, pngGeometry, svgGeometry };
