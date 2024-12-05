/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import http from 'http';
import https from 'https';

/**
 * Fetches data from the specified URL using either HTTP or HTTPS protocol.
 *
 * @param {string} url - The URL to fetch data from.
 * @param {Object} [requestOptions={}] - Options for the HTTP/HTTPS request.
 *
 * @returns {Promise<Object>} Promise resolving to the HTTP/HTTPS response
 * object with added 'text' property or rejecting with an error.
 */
export async function fetch(url, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    _getProtocol(url)
      .get(url, requestOptions, (response) => {
        let data = '';

        // A chunk of data has been received
        response.on('data', (chunk) => {
          data += chunk;
        });

        // The whole response has been received
        response.on('end', () => {
          if (!data) {
            reject('Nothing was fetched from the URL.');
          }
          response.text = data;
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
 * @param {string} url - The URL to send the POST request to.
 * @param {Object} [body={}] - The JSON body to include in the POST request.
 * @param {Object} [requestOptions={}] - Options for the HTTP request.
 *
 * @returns {Promise<Object>} Promise resolving to the HTTP/HTTPS response
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

    const request = _getProtocol(url)
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
 * @param {string} url - The URL to determine the protocol.
 *
 * @returns {Object} The HTTP or HTTPS protocol module (http or https).
 */
function _getProtocol(url) {
  return url.startsWith('https') ? https : http;
}

export default {
  fetch,
  post
};
