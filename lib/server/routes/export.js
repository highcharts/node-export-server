/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const configHandler = require('./../../config.js');
const chart = require('./../../chart.js');
const log = require('./../../logger.js').log;
const uuid = require('uuid/v4');

const mime = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'image/svg+xml': 'svg'
};

const mimeReverse = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  pdf: 'application/pdf',
  svg: 'image/svg+xml'
};

let rc = 0;
let beforeRequest = [];
let afterRequest = [];
let tmpDir = 'tmp/'; // @TODO: add to config

function doCallbacks(which, req, res, data, id, uniqueid, type) {
  var res = true;

  which.some(function (fn) {
    var cres;
    if (fn) {
      cres = fn(req, res, data, id, uniqueid, type);
      if (cres !== undefined && cres !== true) {
        res = cres;
        return true;
      } else {
        return true;
      }
    }
  });

  return res;
}

/** Handle an export */
const exportHandler = (req, res) => {
  let cres = false;
  let id = ++rc;
  let uniqueid = uuid().replace(/\-/g, '');
  let type = mime[req.body.type] || 'png';
  let connectionAborted = false;

  if (!req.body)
    return res
      .status(400)
      .send(
        'Body is required. Sending a body? Make sure your Content-type header is correct. Accepted is application/json and multipart/form-data.'
      );

  if (
    !req.body.infile &&
    !req.body.options &&
    !req.body.svg &&
    !req.body.data
  ) {
    log(
      2,
      'request',
      uniqueid,
      'from',
      req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      'was empty:',
      JSON.stringify(req.body, undefined, '  '),
      'headers:',
      JSON.stringify(req.headers, undefined, '  ')
    );

    return res
      .status(400)
      .send(
        'No chart data found. Please make sure you are using application/json or multipart/form-data headers, and that the chart data is in the options attribute if sending JSON.'
      );
  }

  cres = doCallbacks(beforeRequest, req, res, req.body, id, uniqueid, type);
  if (cres !== true) {
    //Block request
    return res.send(cres);
  }

  log(4, 'got incoming HTTP request', uniqueid);

  req.on('close', function () {
    /// TO DO: Investigate, commented for now, it breaks a connection before export
    // connectionAborted = true;
  });

  chart(
    {
      outfile:
        'tmp/' + (req.params.filename || 'chart.' + uniqueid + '.' + type),
      allowCodeExecution: configHandler.config.highcharts.allowCodeExecution,
      instr: req.body.infile || req.body.options || req.body.data,
      constr: req.body.constr,
      type: req.body.type || 'png',
      scale: req.body.scale,
      width: req.body.width || false,
      svg: req.body.svg,
      resources: req.body.resources || false,
      callback: req.body.callback || false,
      styledMode: req.body.styledMode || false,
      asyncRendering: req.body.asyncRendering || false,
      globalOptions: req.body.globaloptions || req.body.globalOptions || false,
      themeOptions: req.body.themeoptions || req.body.themeOptions || false,
      customCode: req.body.customcode || req.body.customCode || false,
      dataOptions: req.body.dataoptions || req.body.dataOptions || false,
      tmpdir: tmpDir,
      async: req.body.async || false,
      reqID: uniqueid
    },
    function (err, info, status) {
      if (info && info.filename) {
        flushIn(15, info.filename);
      }

      if (connectionAborted) {
        // If the connection was closed, do nothing
        log(
          3,
          'the client closed the connection before the chart was done processing'
        );
        return;
      }

      if (err) {
        log(1, 'work', uniqueid, 'could not be completed, sending:', err);
        return res.status(status || 400).send(err);
      }

      if (!info || (!info.filename && !info.data)) {
        log(
          1,
          'return from chart is not even wrong. request',
          uniqueid,
          'is',
          info
        );
        return res
          .status(400)
          .send(
            'unexpected return from chart generation - please check your input data'
          );
      }

      doCallbacks(
        afterRequest,
        req,
        res,
        {
          data: req.body.data,
          filename: info.filename
        },
        id
      );

      if (req.body.async && info.filename) {
        return res.send(
          'charts/' + info.filename.substr(info.filename.lastIndexOf('/') + 1)
        );
      } else if (info.data) {
        if (!req.body.noDownload) {
          res.attachment(
            (req.body.filename || 'chart') +
              '.' +
              (mime[req.body.type] || req.body.type || 'png')
          );
        }

        if (req.body.b64) {
          return res.send(info.data);
        }

        res.header('Content-Type', req.body.type || 'image/png');
        return res.send(Buffer.from(info.data, 'base64'));
      }

      //need to convert to using pipes, this is silly.
      fs.readFile(info.filename, function (err, data) {
        if (err) {
          log(1, uniqueid, err);
          return res.status(400).send('error generating - check your json');
        }

        if (!req.body.noDownload) {
          res.attachment(
            (req.body.filename || 'chart') +
              '.' +
              (mime[req.body.type] || req.body.type || 'png')
          );
        }

        if (req.body.b64) {
          res.send(data.toString('base64'));
        } else {
          res.header('Content-Type', req.body.type || 'image/png');
          res.send(data);
        }
      });
    }
  );
};

module.exports = (app) => {
  app.post('/', exportHandler);
  app.post('/json/:filename', exportHandler);
  app.post('/:filename', exportHandler);
};
