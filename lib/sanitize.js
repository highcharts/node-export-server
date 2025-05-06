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

import { envs } from './validation.js';

// List of class names to be excluded from sanitization of SVG
const excludedClasses = envs.OTHER_EXCLUDE_CLASSES || [];

/**
 * Registers a DOMPurify hook to remove elements with specific class names
 * during sanitization.
 *
 * @param {Window} window - The window object, used to access DOM constructors
 * like `Element`.
 * @param {DOMPurify.DOMPurifyI} purify - The DOMPurify instance to which the
 * hook will be added.
 */
export function excludeElementsByClass(window, purify) {
  // Add a hook to remove elements during sanitization
  purify.addHook('uponSanitizeElement', (node) => {
    excludedClasses.forEach((className) => {
      // Check if the element has the excluded class
      if (
        node instanceof window.Element &&
        node.getAttribute('class')?.includes(className)
      ) {
        // Remove the node from the DOM
        node.parentNode?.removeChild(node);
      }
    });
  });
}

/**
 * Sanitizes a given SVG string by removing potential element of specified class
 * names.
 *
 * @param {string} input The SVG string to be sanitized.
 * @param {Object} [options={}] Optional configuration options for DOMPurify.
 *
 * @returns {string} The sanitized SVG string.
 */
export function sanitizeSVG(input, options = {}) {
  // Check if sanitization is needed
  if (excludedClasses.length) {
    const window = new JSDOM('').window;
    const purify = DOMPurify(window);

    excludeElementsByClass(window, purify);
    return purify.sanitize(input, {
      RETURN_DOM: false,
      ...options
    });
  }

  // Return the original input if no sanitization is needed
  return input;
}

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
  // Add the `forbidden` array to store the attributes that should be removed
  const forbidden = [];

  // The `xlink:href` is such an attribute
  if (!envs.OTHER_ALLOW_XLINK) {
    forbidden.push('xlink:href');
  }

  // Get the virtual DOM
  const window = new JSDOM('').window;

  // Create a purifying instance
  const purify = DOMPurify(window);

  // Return sanitized input, allowing for the `foreignObject` elements
  return purify.sanitize(input, {
    ADD_TAGS: ['foreignObject'],
    FORBID_ATTR: forbidden
  });
}

export default {
  sanitize
};
