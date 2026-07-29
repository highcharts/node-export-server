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

// The purifier, built on first use and then reused.
//
// NOTE: Building a DOM and a purifier per call is by far the most expensive part
//       of sanitizing, and this runs on every SVG export. It is also synchronous,
//       so the cost is paid on the event loop and delays every other request in
//       flight, not just this one.
//
//       Only the instance is shared. The options stay per call, since FORBID_ATTR
//       depends on configuration that can be read at any time, and DOMPurify
//       applies the options it is given on each call.
let purifier;

/**
 * Returns the shared purifier, building it if this is the first call.
 *
 * @returns {Object} The DOMPurify instance.
 */
function getPurifier() {
  if (!purifier) {
    purifier = DOMPurify(new JSDOM('').window);
  }

  return purifier;
}

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

  return getPurifier().sanitize(input, {
    ADD_TAGS: ['foreignObject'],
    FORBID_ATTR: forbidden,
    HTML_INTEGRATION_POINTS: { foreignobject: true }
  });
}

export default sanitize;
