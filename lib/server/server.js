/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const http = require('http');
const https = require('https');

const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const formData = require('express-form-data');
const fsPromises = require('fs').promises;
const { join } = require('path').posix;

const { log } = require('./../logger');
const rateLimit = require('./rate_limit.js');

const healthRoute = require('./routes/health.js');
const exportRoutes = require('./routes/export.js');
const uiRoute = require('./routes/ui.js');

// Create express app
const app = express();

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

/** Error handler function */
const errorHandler = (error, socket) =>
  log(1, `[server] Socket error: ${error}`);

/** Attach error handlers for a server */
const attachErrorHandlers = (server) => {
  server.on('clientError', errorHandler);
  server.on('error', errorHandler);
  server.on('connection', (socket) =>
    socket.on('error', (error) => errorHandler(error, socket))
  );
};

module.exports = {
  /**
   * Start the server.
   */
  start: async (serverConfig) => {
    // Stop if not enabled
    if (!serverConfig.enable) {
      return false;
    }

    // Listen HTTP server
    if (!serverConfig.ssl.enable && !serverConfig.ssl.force) {
      // Main server instance (HTTP)
      const httpServer = http.createServer(app);
      // Attach error handlers and listen to the server
      attachErrorHandlers(httpServer);
      // Listen
      httpServer.listen(serverConfig.port, serverConfig.host);

      log(
        3,
        `[server] Started HTTP server on ${serverConfig.host}:${serverConfig.port}.`
      );
    }

    // Listen HTTPS server
    if (serverConfig.ssl.enable) {
      // Set up an SSL server also
      // @TODO: Add SSL certs
      let key, cert;

      try {
        // Get the SSL key
        key = await fsPromises.readFile(
          join(serverConfig.ssl.certPath, 'server.key'),
          'utf8'
        );

        // Get the SSL certificate
        cert = await fsPromises.readFile(
          join(serverConfig.ssl.certPath, 'server.crt'),
          'utf8'
        );
      } catch (error) {
        log(
          1,
          `[server] Unable to load key/certificate from ${cfg.ssl.certPath}.`
        );
      }

      if (key && cert) {
        // Main server instance (HTTPS)
        const httpsServer = https.createServer(app);
        // Attach error handlers and listen to the server
        attachErrorHandlers(httpsServer);
        // Listen
        httpsServer.listen(serverConfig.ssl.port, serverConfig.host);

        log(
          3,
          `[server] Started HTTPS server on ${serverConfig.host}:${serverConfig.ssl.port}.`
        );
      }
    }

    // Set up static folder's route
    app.use(express.static(join(__basedir, 'public')));

    // Set up routes
    healthRoute(app);
    exportRoutes(app);
    uiRoute(app);

    // Enable the rate limiter if config says so
    if (
      serverConfig.rateLimiting &&
      serverConfig.rateLimiting.enable &&
      ![0, NaN].includes(serverConfig.rateLimiting.maxRequests)
    ) {
      rateLimit(app, serverConfig.rateLimiting);
    }

    return true;
  },

  /** Return the Express instance */
  express: () => express,

  /** Return the App instance */
  app: () => app,

  /** Add middleware to the server */
  use: (a, b) => {
    app.use(a, b);
  },

  /** Add a get route to the server */
  get: (path, callback) => {
    app.get(path, callback);
  },

  /** Add a post route to the server */
  post: (path, callback) => {
    app.post(path, callback);
  },

  /** Forcefully enable rate limiting */
  enableRateLimiting: (limitConfig) => rateLimit(app, limitConfig)
};
