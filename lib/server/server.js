/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const { join } = require('path').posix;
const configHandler = require('./../config');
const http = require('http');
const https = require('https');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const formData = require('express-form-data');
const cors = require('cors');
const fsPromises = require('fs').promises;
const log = require('./../logger').log;
const path = require('path');

const uiRoute = require('./routes/ui.js');
const rateLimit = require('./rate-limit.js');
const healthRoute = require('./routes/health.js');
const chartRoute = require('./routes/temp-charts.js');
const exportRoutes = require('./routes/export.js');

// /////////////////////////////////////////////////////////////////////////////

// Enable CORS support
app.use(cors());

// Enable parsing of form data
app.use(
  formData.parse({
    maxFieldsSize: '50mb'
  })
);

// Enable body parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
app.use(
  bodyParser.urlencoded({
    type: 'multipart/form-data',
    extended: false,
    limit: '50mb'
  })
);

// /////////////////////////////////////////////////////////////////////////////

/** Error handler function */
const errorHandler = (err, socket) => log(1, `server: socket error - ${err}`);

/** Attach error handlers for a server */
const attachErrorHandlers = (server) => {
  server.on('clientError', errorHandler);
  server.on('error', errorHandler);
  server.on('connection', (socket) =>
    socket.on('error', (err) => errorHandler(err, socket))
  );
};

// /////////////////////////////////////////////////////////////////////////////

module.exports = {
  /**
   * Start the server.
   *
   * Uses the global config.
   */
  start: async (configOverride) => {
    const cfg = Object.assign(configHandler.config.server || {}, {});

    Object.assign(cfg, configOverride || {});

    if (!cfg.enable) {
      return false;
    }

    // Main server instance (http)
    const httpServer = http.createServer(app);
    attachErrorHandlers(httpServer);

    // Set up routes
    chartRoute(app, express);
    healthRoute(app);
    exportRoutes(app);
    app.use(express.static(path.join(__dirname, '../../public')));
    uiRoute(app);

    // Listen
    if (cfg.ssl && !cfg.ssl.force) {
      log(3, `server - started HTTP server on ${cfg.host}:${cfg.port}`);
      httpServer.listen(cfg.port, cfg.host);
    }

    if (cfg.ssl && cfg.ssl.enable) {
      // Set up an SSL server also
      // @TODO: Add SSL certs

      const httpsServer = https.createServer();

      let key, cert;

      try {
        key = await fsPromises.readFile(
          join(cfg.ssl.certPath, 'server.key'),
          'utf8'
        );
        cert = await fsPromises.readFile(
          join(cfg.ssl.certPath, 'server.crt'),
          'utf8'
        );
      } catch (e) {
        log(1, `server - unable to load certfiles from ${cfg.ssl.certPath}`);
      }

      if (key && cert) {
        // Start the HTTPS server
        attachErrorHandlers(httpsServer);
        httpsServer.listen(cfg.ssl.port, cfg.host);
        log(3, `server - started HTTPS server on ${cfg.host}:${cfg.ssl.port}`);
      }
    }

    // Enable the rate limiter if config says so
    if (cfg.rateLimiting && cfg.rateLimiting.enable) {
      rateLimit(app, cfg.rateLimiting);
    }

    return true;
  },

  /** Return the Express instance */
  express: function () {
    return express;
  },

  /** Return the App instance */
  app: function () {
    return app;
  },

  /** Add middleware to the server */
  use: function (a, b) {
    app.use(a, b);
  },

  /** Add a get route to the server */
  get: function (path, fn) {
    app.get(path, fn);
  },

  /** Add a post route to the server */
  post: function (path, fn) {
    app.post(path, fn);
  },

  /** Forcefully enable rate limiting */
  enableRateLimiting: (config) => rateLimit(app, config)
};
