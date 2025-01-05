/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Used to sanitize the strings coming from the exporting module
 * to prevent XSS attacks (with the DOMPurify library).
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

/**
 * Sanitizes a given HTML string by removing <script> tags. This function uses
 * a regular expression to find and remove all occurrences of <script></script>
 * tags and any content within them.
 *
 * @function sanitize
 *
 * @param {string} input - The HTML string to be sanitized.
 *
 * @returns {string} The sanitized HTML string.
 */
export function sanitize(input) {
  // Get the virtual DOM
  const window = new JSDOM('').window;

  // Create a purifying instance
  const purify = DOMPurify(window);

  // Return sanitized input
  return purify.sanitize(input, { ADD_TAGS: ['foreignObject'] });
}

export default {
  sanitize
};
