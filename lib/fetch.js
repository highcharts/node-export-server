/**
 * This module exports two functions: fetch (for GET requests) and post (for POST requests).
 */

import http from 'http';
import https from 'https';

/**
 * Determines the protocol of the given URL (either `http` or `https`).
 *
 * @function
 * @param {string} url - The URL whose protocol needs to be determined.
 * @returns {Object} Returns the `https` module if the URL starts with 'https',
 * otherwise returns the `http` module.
 * @private
 *
 * @example
 *
 * const protocol = getProtocol('https://example.com');
 * console.log(protocol); // Outputs the 'https' module
 */
const getProtocol = (url) => {
  return url.startsWith('https') ? https : http;
};

/**
 * Sends a GET request to the specified URL with optional request options.
 *
 * @function
 * @async
 * @param {string} url - The URL to fetch.
 * @param {Object} [requestOptions={}] - Optional request options and headers.
 * @returns {Promise<Object>} Returns a promise that resolves with the response object.
 * The response object contains a `.text` property with the raw response data.
 * @throws {Error} Throws an error if the request fails or if no data is fetched from the URL.
 *
 * @example
 *
 * async function getData() {
 *   try {
 *     const response = await fetch('https://api.example.com/data');
 *     console.log(response.text);
 *   } catch (error) {
 *     console.error('Error fetching data:', error);
 *   }
 * }
 *
 * getData();
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
 * Sends a POST request to the specified URL with the given body and request options.
 *
 * @function
 * @async
 * @param {string} url - The URL to which the request should be sent.
 * @param {Object} [body={}] - The data to be sent as the request body, in JSON format.
 * @param {Object} [requestOptions={}] - Optional request options and headers.
 * @returns {Promise<Object>} - Returns a promise that resolves with the parsed JSON response.
 * @throws {Error} Throws an error if the request fails or if the response cannot be parsed.
 *
 * @example
 *
 * async function sendData() {
 *   const dataToSend = {
 *     key1: 'value1',
 *     key2: 'value2',
 *   };
 *   try {
 *     const response = await post('https://api.example.com/data', dataToSend);
 *     console.log(response);
 *   } catch (error) {
 *     console.error('Error sending data:', error);
 *   }
 * }
 *
 * sendData();
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
