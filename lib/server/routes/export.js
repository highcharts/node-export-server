/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { v4 as uuid } from 'uuid';

import { getAllowCodeExecution, startExport } from '../../chart.js';
import { getOptions, mergeConfigOptions } from '../../config.js';
import { log } from '../../logger.js';
import {
  clearText,
  fixType,
  isCorrectJSON,
  isPrivateRangeUrlFound,
  optionsStringify,
  measureTime
} from '../../utils.js';

// Reversed MIME types
const reversedMime = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  pdf: 'application/pdf',
  svg: 'image/svg+xml'
};

// The requests counter
let requestsCounter = 0;

const benchmark = false;

// The array of callbacks to call before a request
const beforeRequest = [];

// The array of callbacks to call after a request
const afterRequest = [];

/**
 * Calls callbacks.
 *
 * @param {Array} callbacks - An array of callbacks.
 * @param {object} request - The request.
 * @param {object} response - The response.
 * @param {object} data - The data to send to callbacks.
 * @return {object} - The result from a callback.
 */
const doCallbacks = (callbacks, request, response, data) => {
  let result = true;
  const { id, uniqueId, type, body } = data;

  callbacks.some((callback) => {
    if (callback) {
      let callResponse = callback(request, response, id, uniqueId, type, body);

      if (callResponse !== undefined && callResponse !== true) {
        result = callResponse;
      }

      return true;
    }
  });

  return result;
};

/**
 * Handles an export.
 *
 * @param {object} request - The request.
 * @param {object} response - The response.
 */
const exportHandler = (request, response) => {
  // Start counting time
  const stopCounter = measureTime();

  // Get the current server's general options
  const defaultOptions = getOptions();

  // Init default options
  if (benchmark) {
    console.log('Init default options:', stopCounter(), 'ms.');
  }

  const body = request.body;
  const id = ++requestsCounter;
  const uniqueId = uuid().replace(/-/g, '');
  let type = fixType(body.type);

  // Fix type
  if (benchmark) {
    console.log('Fix type:', stopCounter(), 'ms.');
  }

  // Throw 'Bad Request' if there's no body
  if (!body) {
    return response.status(400).send(
      clearText(
        `Body is required. Sending a body? Make sure your Content-type header
        is correct. Accepted is application/json and multipart/form-data.`
      )
    );
  }

  // All of the below can be used
  let instr = isCorrectJSON(body.infile || body.options || body.data);

  // Is correct JSON
  if (benchmark) {
    console.log('Is correct JSON:', stopCounter(), 'ms.');
  }

  // Throw 'Bad Request' if there's no JSON or SVG to export
  if (!instr && !body.svg) {
    log(
      2,
      clearText(
        `Request ${uniqueId} from ${
          request.headers['x-forwarded-for'] || request.connection.remoteAddress
        } was incorrect. Check your payload.`
      )
    );

    return response.status(400).send(
      clearText(
        `No correct chart data found. Please make sure you are using
        application/json or multipart/form-data headers, and that the chart
        data is in the 'infile', 'options' or 'data' attribute if sending
        JSON or in the 'svg' if sending SVG.`
      )
    );
  }

  let callResponse = false;

  // Call the before request functions
  callResponse = doCallbacks(beforeRequest, request, response, {
    id,
    uniqueId,
    type,
    body
  });

  // Do callbacks
  if (benchmark) {
    console.log('Do callbacks:', stopCounter(), 'ms.');
  }

  // Block the request if one of a callbacks failed
  if (callResponse !== true) {
    return response.send(callResponse);
  }

  let connectionAborted = false;

  // In case the connection is closed, force to abort further actions
  request.socket.on('close', () => {
    connectionAborted = true;
  });

  log(4, `[export] Got an incoming HTTP request ${uniqueId}.`);

  body.constr = (typeof body.constr === 'string' && body.constr) || 'chart';

  // Gather and organize options from the payload
  const requestOptions = {
    export: {
      instr,
      type,
      constr: body.constr[0].toLowerCase() + body.constr.substr(1),
      height: body.height,
      width: body.width,
      scale: body.scale || defaultOptions.export.scale,
      globalOptions: isCorrectJSON(body.globalOptions, true),
      themeOptions: isCorrectJSON(body.themeOptions, true)
    },
    customCode: {
      allowCodeExecution: getAllowCodeExecution(),
      allowFileResources: false,
      resources: isCorrectJSON(body.resources, true),
      callback: body.callback,
      customCode: body.customCode
    }
  };

  // Organize options
  if (benchmark) {
    console.log('Organize options:', stopCounter(), 'ms.');
  }

  if (instr) {
    // Stringify JSON with options
    requestOptions.export.instr = optionsStringify(
      instr,
      requestOptions.customCode.allowCodeExecution
    );

    // Stringify JSON with options
    if (benchmark) {
      console.log('Stringify JSON with options:', stopCounter(), 'ms.');
    }
  }

  // Merge the request options into default ones
  const options = mergeConfigOptions(defaultOptions, requestOptions);

  // Merge config options
  if (benchmark) {
    console.log('Merge config options:', stopCounter(), 'ms.');
  }

  // Save the JSON if exists
  options.export.options = instr;

  // Lastly, add the server specific arguments into options as payload
  options.payload = {
    svg: body.svg || false,
    b64: body.b64 || false,
    dataOptions: isCorrectJSON(body.dataOptions, true),
    noDownload: body.noDownload || false,
    requestId: uniqueId
  };

  // Setting payload
  if (benchmark) {
    console.log('Setting payload:', stopCounter(), 'ms.');
  }

  // Test xlink:href elements from payload's SVG
  if (body.svg && isPrivateRangeUrlFound(options.payload.svg)) {
    return response
      .status(400)
      .send(
        'SVG potentially contain at least one forbidden URL in xlink:href element.'
      );
  }

  // Check URL range
  if (benchmark) {
    console.log('Check URL range:', stopCounter(), 'ms.');
  }

  // Start the export process
  startExport(options, (info, error) => {
    // Remove the close event from the socket
    request.socket.removeAllListeners('close');

    // After Puppeteer exporting
    if (benchmark) {
      console.log('After Puppeteer exporting:', stopCounter(), 'ms.', '\n');
    }

    // If the connection was closed, do nothing
    if (connectionAborted) {
      return log(
        3,
        clearText(
          `[export] The client closed the connection before the chart was done
          processing.`
        )
      );
    }

    // If error, return it
    if (error) {
      log(
        1,
        clearText(
          `[export] Work: ${uniqueId} could not be completed, sending:
          ${error}`
        )
      );
      return response.status(400).send(error.message);
    }

    // If data is missing, return the error
    if (!info || !info.data) {
      log(
        1,
        clearText(
          `[export] Unexpected return from chart generation, please check your
          data Request: ${uniqueId} is ${info.data}.`
        )
      );
      return response
        .status(400)
        .send(
          'Unexpected return from chart generation, please check your data.'
        );
    }

    // Get the type from options
    type = info.options.export.type;

    // The after request callbacks
    doCallbacks(afterRequest, request, response, { id, body: info.data });

    if (info.data) {
      // If only base64 is required, return it
      if (body.b64) {
        // SVG Exception for the Highcharts 11.3.0 version
        if (type === 'pdf' || type == 'svg') {
          return response.send(
            Buffer.from(info.data, 'utf8').toString('base64')
          );
        }

        return response.send(info.data);
      }

      // Set correct content type
      response.header('Content-Type', reversedMime[type] || 'image/png');

      // Decide whether to download or not chart file
      if (!body.noDownload) {
        response.attachment(
          `${request.params.filename || request.body.filename || 'chart'}.${
            type || 'png'
          }`
        );
      }

      // If SVG, return plain content
      return type === 'svg'
        ? response.send(info.data)
        : response.send(Buffer.from(info.data, 'base64'));
    }
  });
};

export default (app) => {
  app.post('/', exportHandler);
  app.post('/:filename', exportHandler);
};
