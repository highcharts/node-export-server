/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Used to sanitize the strings coming from the exporting module
 * to prevent XSS attacks (with the DOMPurify library).
 **/

import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

import { envs } from './envs.js';
/**
 * Sanitizes a given HTML string by removing <script> tags.
 * This function uses a regular expression to find and remove all
 * occurrences of <script>...</script> tags and any content within them.
 *
 * @param {string} input The HTML string to be sanitized.
 * @returns {string} The sanitized HTML string.
 */
export function sanitize(input) {
  const forbidden = [];

  if (!envs.OTHER_ALLOW_XLINK) {
    forbidden.push('xlink:href');
  }

  const window = new JSDOM('').window;
  const purify = DOMPurify(window);
  return purify.sanitize(input, {
    ADD_TAGS: ['foreignObject'],
    FORBID_ATTR: forbidden
  });
}

export default sanitize;
