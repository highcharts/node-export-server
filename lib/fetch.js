/**
 * This module exports two functions: fetch (for GET requests) and post (for POST requests).
 */

import http from 'http';
import https from 'https';

/**
 * Returns the HTTP or HTTPS protocol module based on the provided URL.
 *
 * @param {string} url - The URL to determine the protocol.
 *
 * @returns {Object} The HTTP or HTTPS protocol module (http or https).
 */
const getProtocol = (url) => (url.startsWith('https') ? https : http);

/**
 * Fetches data from the specified URL using either HTTP or HTTPS protocol.
 *
 * @param {string} url - The URL to fetch data from.
 * @param {Object} requestOptions - Options for the HTTP request (optional).
 *
 * @returns {Promise<Object>} Promise resolving to the HTTP response object
 * with added 'text' property or rejecting with an error.
 */
async function fetch(url, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    const protocol = getProtocol(url);

    protocol
      .get(url, requestOptions, (res) => {
        let data = '';

        // A chunk of data has been received.
        res.on('data', (chunk) => {
          data += chunk;
        });

        // The whole response has been received.
        res.on('end', () => {
          if (!data) {
            reject('Nothing was fetched from the URL.');
          }

          res.text = data;
          resolve(res);
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
 * @param {Object} body - The JSON body to include in the POST request
 * (optional, default is an empty object).
 * @param {Object} requestOptions - Options for the HTTP request (optional).
 *
 * @returns {Promise<Object>} Promise resolving to the HTTP response object with
 * added 'text' property or rejecting with an error.
 */
async function post(url, body = {}, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    const protocol = getProtocol(url);
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

    const req = protocol
      .request(url, options, (res) => {
        let responseData = '';

        // A chunk of data has been received.
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        // The whole response has been received.
        res.on('end', () => {
          try {
            res.text = responseData;
            resolve(res);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', (error) => {
        reject(error);
      });

    // Write the request body and end the request.
    req.write(data);
    req.end();
  });
}

export default fetch;
export { fetch, post };
