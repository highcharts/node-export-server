import http from 'http';
import https from 'https';

export default async function fetch(url, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, requestOptions, (res) => {
      let data = '';

      // A chunk of data has been received.
      res.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received.
      res.on('end', () => {
        if (!data) {
          reject('The URL is empty.');
        }

        res.text = data;
        resolve(res);
      });

    }).on('error', (error) => {
      reject(error);
    });
  });
}

export async function post(url, body = {}, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const data = JSON.stringify(body);

    // Set default headers and merge with requestOptions
    const options = Object.assign({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    }, requestOptions);

    const req = protocol.request(url, options, (res) => {
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

    }).on('error', (error) => {
      reject(error);
    });

    // Write the request body and end the request.
    req.write(data);
    req.end();
  });
}