/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview HTTP utility module for fetching and posting data. Supports both
 * HTTP and HTTPS protocols, providing methods to make GET and POST requests
 * with customizable options. Includes protocol determination based on URL
 * and augments response objects with a 'text' property for easier data access.
 */

import http from 'http';
import https from 'https';

/**
 * Fetches data from the specified URL using either HTTP or HTTPS protocol.
 *
 * @async
 * @function fetch
 *
 * @param {string} url - The URL to fetch data from.
 * @param {Object} [requestOptions={}] - Options for the HTTP/HTTPS request.
 * The default value is an empty object.
 *
 * @returns {Promise<Object>} A Promise that resolves to the HTTP/HTTPS response
 * object with added 'text' property or rejecting with an error.
 */
export async function fetch(url, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    _getProtocolModule(url)
      .get(url, requestOptions, (response) => {
        let responseData = '';

        // A chunk of data has been received
        response.on('data', (chunk) => {
          responseData += chunk;
        });

        // The whole response has been received
        response.on('end', () => {
          if (!responseData) {
            reject('Nothing was fetched from the URL.');
          }
          response.text = responseData;
          resolve(response);
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Sends a POST request to the specified URL with the provided JSON body using
 * either HTTP or HTTPS protocol.
 *
 * @async
 * @function post
 *
 * @param {string} url - The URL to send the POST request to.
 * @param {Object} [body={}] - The JSON body to include in the POST request.
 * The default value is an empty object.
 * @param {Object} [requestOptions={}] - Options for the HTTP/HTTPS request.
 * The default value is an empty object.
 *
 * @returns {Promise<Object>} A Promise that resolves to the HTTP/HTTPS response
 * object with added 'text' property or rejecting with an error.
 */
export async function post(url, body = {}, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    // Set default headers and merge with requestOptions
    const options = Object.assign(
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      },
      requestOptions
    );

    const request = _getProtocolModule(url)
      .request(url, options, (response) => {
        let responseData = '';

        // A chunk of data has been received
        response.on('data', (chunk) => {
          responseData += chunk;
        });

        // The whole response has been received
        response.on('end', () => {
          try {
            response.text = responseData;
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', (error) => {
        reject(error);
      });

    // Write the request body and end the request
    request.write(data);
    request.end();
  });
}

/**
 * Returns the HTTP or HTTPS protocol module based on the provided URL.
 *
 * @function _getProtocolModule
 *
 * @param {string} url - The URL to determine the protocol.
 *
 * @returns {Object} The HTTP or HTTPS protocol module (http or https).
 */
function _getProtocolModule(url) {
  return url.startsWith('https') ? https : http;
}

export default {
  fetch,
  post
};
