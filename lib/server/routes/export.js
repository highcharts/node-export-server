/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/
// @format
const { v4: uuid } = require('uuid');

const chart = require('./../../chart.js');
const { log } = require('./../../logger.js');
const {
  fixType,
  handleResources,
  isCorrectJSON,
  mergeConfigOptions
} = require('./../../utils.js');
const { initDefaultOptions } = require('./../../config');
const { defaultConfig } = require('./../../schemas/config.js');

// Get default options from the config
const defaultOptions = initDefaultOptions(defaultConfig);

const mime = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'image/svg+xml': 'svg'
};

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

// The array of callbacks to call before a request
const beforeRequest = [];

// The array of callbacks to call after a request
const afterRequest = [];

/** Call callbacks */
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

/** Handle an export */
const exportHandler = (request, response) => {
  const stringify = JSON.stringify;
  const body = request.body;
  const id = ++requestsCounter;
  const uniqueId = uuid().replace(/\-/g, '');
  let type = fixType(body.type);

  // Throw 'Bad Request' if there's no body
  if (!body) {
    return response
      .status(400)
      .send(
        'Body is required. Sending a body? Make sure your Content-type header' +
          ' is correct. Accepted is application/json and multipart/form-data.'
      );
  }

  // All the below can be used
  const instr = isCorrectJSON(body.infile || body.options || body.data, true);

  // Throw 'Bad Request' if there's no JSON or SVG to export
  if (!instr && !body.svg) {
    log(
      2,
      `Request ${uniqueId} from`,
      request.headers['x-forwarded-for'] || request.connection.remoteAddress,
      `was incorrect:\n${('BODY:' + stringify(body, undefined, '  ')).red}`,
      `\n${('HEADERS: ' + stringify(request.headers, undefined, '  ')).green}`
    );

    return response
      .status(400)
      .send(
        'No chart data found. Please make sure you are using' +
          ' application/json or multipart/form-data headers, and that the chart' +
          ' data is in the options attribute if sending JSON.'
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

  body.constr = body.constr || 'Chart';

  // Gather and organize options from the payload
  const requestOptions = {
    export: {
      instr,
      type,
      constr: body.constr[0].toLowerCase() + body.constr.substr(1),
      width: body.width,
      scale: body.scale,
      globalOptions: isCorrectJSON(body.globalOptions, true),
      themeOptions: isCorrectJSON(body.themeOptions, true)
    },
    customCode: {
      allowFileResources: false,
      resources: isCorrectJSON(body.resources, true),
      callback: body.callback,
      customCode: body.customCode
    }
  };

  // Merge the request options into default ones
  const options = mergeConfigOptions(defaultOptions, requestOptions);

  // Lastly, add the server specific arguments into options as payload
  options.payload = {
    svg: body.svg || false,
    base64: body.base64 || body.b64 || false,
    dataOptions: isCorrectJSON(body.dataOptions, true),
    noDownload: body.noDownload || false,
    requestId: uniqueId
  };

  // Process resources
  options.customCode.resources = handleResources(
    isCorrectJSON(options.customCode.resources),
    false
  );

  // Start the export process
  chart.startExport(options, (info) => {
    // If the connection was closed, do nothing
    if (connectionAborted) {
      return log(
        3,
        'The client closed the connection before the chart was done processing.'
      );
    }

    // If error, return it
    if (info.error) {
      log(
        1,
        `Work: ${uniqueId} could not be completed, sending: ${info.error}.`
      );
      return response.status(400).send(info.error.message);
    }
    // If data is missing, return the error
    if (!info || !info.data) {
      log(
        1,
        `Return from chart is not even wrong. Request: ${uniqueId} is ${info.data}.`
      );
      return response
        .status(400)
        .send(
          'Unexpected return from chart generation - please check your input data.'
        );
    }

    // Get the type from options
    type = info.options.export.type;

    // The after request callbacks
    doCallbacks(afterRequest, request, response, { id, body: info.data });

    if (info.data) {
      // If only base64 is required, return it
      if (body.base64) {
        // Check if it is already base64 or a raw SVG
        if (type === 'svg' || type === 'pdf') {
          return response.send({
            base64: Buffer.from(info.data, 'utf8').toString('base64')
          });
        }

        // Return raw base64
        return response.send({
          base64: info.data,
          type: reversedMime[type]
        });
      }

      // Set correct content type
      response.header('Content-Type', reversedMime[type] || 'image/png');

      // Compatibility with legacy which returned a plain text stream
      if (body.b64) {
        // Check if it is already base64 or a raw SVG
        if (type === 'svg' || type === 'pdf') {
          return response.send(
            Buffer.from(info.data, 'utf8').toString('base64')
          );
        }
        return response.send(info.data);
      }

      // Decide whether to download or not chart file
      if (!body.noDownload) {
        response.attachment(
          `${request.params.filename || 'chart'}.${type || 'png'}`
        );
      }

      // If SVG, return plain content
      return type === 'svg'
        ? response.send(info.data)
        : response.send(Buffer.from(info.data, 'base64'));
    }
  });
};

module.exports = (app) => {
  app.post('/', exportHandler);
  app.post('/:filename', exportHandler);
};
