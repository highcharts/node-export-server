/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { v4 as uuid } from 'uuid';

import { getAllowCodeExecution, startExport } from '../../chart.js';
import { getOptions, mergeConfigOptions } from '../../config.js';
import { log } from '../../logger.js';
import {
  fixType,
  isCorrectJSON,
  isObjectEmpty,
  isPrivateRangeUrlFound,
  optionsStringify,
  measureTime
} from '../../utils.js';

import BadRequestError from '../../errors/BadRequestError.js';

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
const exportHandler = async (request, response, next) => {
  try {
    // Start counting time
    const stopCounter = measureTime();

    // Get the current server's general options
    const defaultOptions = getOptions();

    // Init default options
    if (benchmark) {
      console.log(
        `[benchmark] Init default options: ${stopCounter()}ms.`.green
      );
    }

    const body = request.body;
    const id = ++requestsCounter;
    const uniqueId = uuid().replace(/-/g, '');
    let type = fixType(body.type);

    // Fix type
    if (benchmark) {
      console.log(`[benchmark] Fix type: ${stopCounter()}ms.`.green);
    }

    // Throw 'Bad Request' if there's no body
    if (!body || isObjectEmpty(body)) {
      throw new BadRequestError(
        'The request body is required. Make sure your Content-Type header is correct (accepted are application/json and multipart/form-data).'
      );
    }

    // All of the below can be used
    let instr = isCorrectJSON(body.infile || body.options || body.data);

    // Is correct JSON
    if (benchmark) {
      console.log(`[benchmark] Is correct JSON: ${stopCounter()}ms.`.green);
    }

    // Throw 'Bad Request' if there's no JSON or SVG to export
    if (!instr && !body.svg) {
      log(
        2,
        `Request ${uniqueId} from ${
          request.headers['x-forwarded-for'] || request.connection.remoteAddress
        } was incorrect. Payload received: ${JSON.stringify(body)}.`
      );

      throw new BadRequestError(
        "No correct chart data found. Please make sure you are using application/json or multipart/form-data headers, and that the chart data is in the 'infile', 'options' or 'data' attribute if sending JSON or in the 'svg' if sending SVG."
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
      console.log(`[benchmark] Do callbacks: ${stopCounter()}ms.`.green);
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
      console.log(`[benchmark] Organize options: ${stopCounter()}ms.`.green);
    }

    if (instr) {
      // Stringify JSON with options
      requestOptions.export.instr = optionsStringify(
        instr,
        requestOptions.customCode.allowCodeExecution
      );

      // Stringify JSON with options
      if (benchmark) {
        console.log(
          `[benchmark] Stringify JSON with options: ${stopCounter()}ms.`.green
        );
      }
    }

    // Merge the request options into default ones
    const options = mergeConfigOptions(defaultOptions, requestOptions);

    // Merge config options
    if (benchmark) {
      console.log(
        `[benchmark] Merge config options: ${stopCounter()}ms.`.green
      );
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
      console.log(`[benchmark] Setting payload: ${stopCounter()}ms.`.green);
    }

    // Test xlink:href elements from payload's SVG
    if (body.svg && isPrivateRangeUrlFound(options.payload.svg)) {
      throw new BadRequestError(
        'SVG potentially contain at least one forbidden URL in xlink:href element.'
      );
    }

    // Check URL range
    if (benchmark) {
      console.log(`[benchmark] Check URL range: ${stopCounter()}ms.`.green);
    }

    // Start the export process
    await startExport(options, (info, error) => {
      // Remove the close event from the socket
      request.socket.removeAllListeners('close');

      // After Puppeteer exporting
      if (benchmark) {
        console.log(
          `[benchmark] After Puppeteer exporting: ${stopCounter()}ms.`.green,
          '\n'
        );
      }

      // If the connection was closed, do nothing
      if (connectionAborted) {
        return log(
          3,
          `[export] The client closed the connection before the chart was done processing.`
        );
      }

      // If error, log it and send it to the error middleware
      if (error) {
        throw error;
      }

      // If data is missing, log the message and send it to the error middleware
      if (!info || !info.result) {
        throw new BadRequestError(
          `[export] Unexpected return from chart generation, please check your request data: ${uniqueId} is ${info.result}.`
        );
      }

      // Get the type from options
      type = info.options.export.type;

      // The after request callbacks
      doCallbacks(afterRequest, request, response, { id, body: info.result });

      if (info.result) {
        // If only base64 is required, return it
        if (body.b64) {
          // SVG Exception for the Highcharts 11.3.0 version
          if (type === 'pdf' || type == 'svg') {
            return response.send(
              Buffer.from(info.result, 'utf8').toString('base64')
            );
          }

          return response.send(info.result);
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
          ? response.send(info.result)
          : response.send(Buffer.from(info.result, 'base64'));
      }
    });
  } catch (error) {
    next(error);
  }
};

export default (app) => {
  app.post('/', exportHandler);
  app.post('/:filename', exportHandler);
};
