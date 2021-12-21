/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/
// @format
const uuid = require('uuid/v4');
const { readFile, unlink } = require('fs');

const startExport = require('./../../chart.js');
const { log } = require('./../../logger.js');
const { fixType, mergeConfigOptions } = require('./../../utils.js');
const { initDefaultOptions } = require('./../../config');
const { defaultConfig } = require('./../../schemas/config.js');

// Get default options from the config
const defaultOptions = initDefaultOptions(defaultConfig);

// MIME types
const mime = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'image/svg+xml': 'svg'
};

// The requests counter
let requestsCounter = 0;

// The array of callbacks to call before a request
const beforeRequest = [];

// The array of callbacks to call after a request
const afterRequest = [];

/** Flush temporary files in given minutes */
const flushIn = (time, filename) => {
  if (!time) {
    return;
  }

  // Delete a temporary file after some time
  setTimeout(() => {
    if (filename) {
      unlink(filename, (error) => {
        if (error) {
          return log(1, `Error when deleting temporary file: ${error}.`);
        }
      });
    }
  }, time * 60 * 1000);
};

/** Call callbacks */
const doCallbacks = (callbacks, request, response, body) => {
  const { id, uniqueId, type, data } = body;

  callbacks.some((callback) => {
    if (callback) {
      let callResponse = callback(request, response, id, uniqueId, type, data);

      if (callResponse !== undefined && callResponse !== true) {
        response = callResponse;
      }

      return true;
    }
  });

  return response;
};

/** Handle an export */
const exportHandler = (request, response) => {
  const body = request.body;
  const id = ++requestsCounter;
  const uniqueId = uuid().replace(/\-/g, '');
  const type = fixType(body.type);

  let connectionAborted = false;

  // Throw 'Bad Request' if there's no body
  if (!body) {
    return response
      .status(400)
      .send(
        'Body is required. Sending a body? Make sure your Content-type header' +
          ' is correct. Accepted is application/json and multipart/form-data.'
      );
  }

  // Throw 'Bad Request' if there's no JSON or SVG to export
  if (!body.infile && !body.options && !body.svg && !body.data) {
    log(
      2,
      'Request',
      uniqueId,
      'from',
      request.headers['x-forwarded-for'] || request.connection.remoteAddress,
      'was empty:',
      JSON.stringify(body, undefined, '  '),
      'headers:',
      JSON.stringify(request.headers, undefined, '  '),
      '.'
    );

    return response
      .status(400)
      .send(
        'No chart data found. Please make sure you are using application/json' +
          ' or multipart/form-data headers, and that the chart data is in the' +
          ' options attribute if sending JSON.'
      );
  }

  let callResponse = false;

  // Call the before request functions
  callResponse = doCallbacks(beforeRequest, request, response, {
    id,
    uniqueId,
    type,
    data: body
  });

  // Block the request
  if (callResponse !== true) {
    return response.send(callResponse);
  }

  // In case the connection is close, force to abort further actions
  request.on('close', () => {
    connectionAborted = true;
  });

  log(4, `Got an incoming HTTP request ${uniqueId}.`);

  // Gather and organize options from the payload
  const requestOptions = {
    export: {
      instr: body.infile || body.options || body.data,
      outfile:
        defaultOptions.other.tempDir +
        `${request.params.filename || 'chart'}.${uniqueId}.${type}`,
      type,
      constr: body.constr,
      width: body.width || false,
      scale: body.scale,
      globalOptions: body.globaloptions || false
    },
    customCode: {
      allowFileResources: false,
      resources: body.resources || false,
      callback: body.callback || false
    }
  };

  // Merge the request options into default ones
  const options = mergeConfigOptions(defaultOptions, requestOptions);

  // Lastly, add the server specific arguments into options as payload
  options.payload = {
    svg: body.svg,
    asyncRendering: body.asyncRendering || false,
    customCode: body.customCode || false,
    dataOptions: body.dataOptions || false,
    requestId: uniqueId
  };

  /// TO DO: Decide where to place below arguments
  // const leftovers = {
  //   styledMode: body.styledMode || false,
  //   themeOptions: body.themeoptions || body.themeOptions || false,
  // }
  ///

  // Start the export process
  startExport(options, (info, err) => {
    /// TO DO: Refactor callback
    if (info && info.filename) {
      flushIn(15, info.filename);
    }

    // If the connection was closed, do nothing
    if (connectionAborted) {
      log(
        3,
        'The client closed the connection before the chart was done processing.'
      );
      return;
    }

    if (err) {
      log(1, 'work', uniqueId, 'could not be completed, sending:', err, '.');
      return response.status(400).send(err);
    }

    if (!info || (!info.filename && !info.data)) {
      log(
        1,
        'return from chart is not even wrong. request',
        uniqueId,
        'is',
        info,
        '.'
      );
      return response
        .status(400)
        .send(
          'unexpected return from chart generation - please check your input data'
        );
    }

    doCallbacks(
      afterRequest,
      request,
      response,
      {
        data: body.data,
        filename: info.filename
      },
      id
    );

    if (body.async && info.filename) {
      return response.send(
        'charts/' + info.filename.substr(info.filename.lastIndexOf('/') + 1)
      );
    } else if (info.data) {
      if (!body.noDownload) {
        response.attachment(
          (body.filename || 'chart') +
            '.' +
            (mime[body.type] || body.type || 'png')
        );
      }

      if (body.b64) {
        return response.send(info.data);
      }

      response.header('Content-Type', body.type || 'image/png');
      if (mime[body.type] === 'svg') {
        // Return plain SVG content
        return response.send(info.data);
      }
      return response.send(Buffer.from(info.data, 'base64'));
    }

    // TO DO: Need to convert to using pipes, this is silly
    readFile(info.filename, (err, data) => {
      if (err) {
        log(1, uniqueId, err, '.');
        return response.status(400).send('error generating - check your json');
      }

      if (!body.noDownload) {
        response.attachment(
          (body.filename || 'chart') +
            '.' +
            (mime[body.type] || body.type || 'png')
        );
      }

      if (body.b64) {
        response.send(data.toString('base64'));
      } else {
        response.header('Content-Type', body.type || 'image/png');
        response.send(data);
      }
    });
  });
};

module.exports = (app) => {
  app.post('/', exportHandler);
  app.post('/json/:filename', exportHandler);
  app.post('/:filename', exportHandler);
};
