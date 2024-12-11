/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Manages and filters telemetry data for chart requests
 * in the Highcharts Export Server. The module reads chart options, filters them
 * based on a predefined template, and stores telemetry information, such
 * as the time of the request and the number of requests made. Utilizes file
 * reading to load a JSON schema template and provides functions for preparing
 * telemetry data and filtering chart options based on allowed properties.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { getOptions } from './config.js';
import { __dirname } from './utils.js';

// Get the telemetry template
const telemetryTemplate = JSON.parse(
  readFileSync(join(__dirname, 'lib', 'schemas', 'telemetry.json'))
);

// Possible properties in an array
const optionsInArray = ['series', 'xAxis', 'yAxis', 'zAxis'];

// The object with telemetry data collected
export const telemetryData = {
  timeOfSent: null,
  lastSent: null,
  optionsPerRequest: {},
  numberOfRequests: 0
};

/**
 * Prepares and stores telemetry data for a given request based on the chart
 * options. If `gatherAllOptions` is true, all chart options are stored.
 * Otherwise, only the filtered options are stored.
 *
 * @function prepareTelemetry
 *
 * @param {Object} chartOptions - The chart options to be stored or filtered.
 * @param {string} requestId - The unique identifier for the current request.
 */
export function prepareTelemetry(chartOptions, requestId) {
  // Save the filtered or absolute options under the request's id
  telemetryData.optionsPerRequest[requestId] = getOptions().webSocket
    .gatherAllOptions
    ? chartOptions
    : _filterData(telemetryTemplate, chartOptions);

  // Increment requests counter
  telemetryData.numberOfRequests++;
}

/**
 * Recursively filters chart options based on a given template, returning only
 * the necessary properties.
 *
 * @function _filterData
 *
 * @param {Object} template - The template defining the allowed properties for
 * the options.
 * @param {Object} options - The chart options to be filtered.
 *
 * @returns {Object} The filtered chart options containing only the allowed
 * properties.
 */
function _filterData(template, options) {
  const filteredObject = {};

  // Cycle through allowed propeties
  for (const [templateKey, templateValue] of Object.entries(template)) {
    // Check if the section exists
    if (options[templateKey] !== undefined) {
      // Check if this is the final level of indent in the template
      if (templateValue !== null) {
        // Check if it is an array
        if (Array.isArray(options[templateKey])) {
          // And if it contains allowed properties
          if (optionsInArray.includes(templateKey)) {
            // Create an array
            filteredObject[templateKey] = [];
            // If so, cycle through all of them
            for (const [index, optionsValue] of options[
              templateKey
            ].entries()) {
              filteredObject[templateKey][index] = _filterData(
                templateValue,
                optionsValue
              );
            }
          } else {
            // Otherwise, get only the first element
            filteredObject[templateKey] = _filterData(
              templateValue,
              options[templateKey][0]
            );
          }
        } else {
          filteredObject[templateKey] = _filterData(
            templateValue,
            options[templateKey]
          );
        }
      } else {
        // Return the option
        filteredObject[templateKey] = options[templateKey];
      }
    }
  }

  // Return the object
  return filteredObject;
}

export default {
  telemetryData,
  prepareTelemetry
};
