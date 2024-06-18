/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { readFileSync } from 'fs';
import { join } from 'path';

import { __dirname } from './utils.js';

// Get the telemetry template
const telemetryTemplate = JSON.parse(
  readFileSync(join(__dirname, 'lib', 'schemas', 'telemetry.json'))
);

// The object with telemetry data collected
export const telemetryData = {
  numberOfRequests: 0
};

// Possible properties in an array
const optionsInArray = ['series', 'xAxis', 'yAxis', 'zAxis'];

// Recursive function for getting only the required options
function filterData(template, options) {
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
              filteredObject[templateKey][index] = filterData(
                templateValue,
                optionsValue
              );
            }
          } else {
            // Otherwise, get only the first element
            filteredObject[templateKey] = filterData(
              templateValue,
              options[templateKey][0]
            );
          }
        } else {
          filteredObject[templateKey] = filterData(
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

export function prepareTelemetry(chartOptions, requestId) {
  // Save the filtered options under the request's id
  telemetryData[requestId] = filterData(telemetryTemplate, chartOptions);

  // Increment requests counter
  telemetryData.numberOfRequests++;
}

export default {
  telemetryData,
  prepareTelemetry
};
