/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { promises as fsPromises } from 'fs';
import { join } from 'path';

import cors from 'cors';
import express from 'express';
import http from 'http';
import https from 'https';
import multer from 'multer';

import { webSocketInit } from './webSocket.js';
import { getOptions } from '../config.js';
import { log, logWithStack } from '../logger.js';
import { __dirname } from '../utils.js';

import errorHandler from './error.js';
import rateLimiting from './rateLimiting.js';
import versionChangeRoute from './routes/versionChange.js';
import exportRoute from './routes/export.js';
import healthRoute from './routes/health.js';
import uiRoute from './routes/ui.js';
import validateHandler from './validate.js';

import ExportError from '../errors/ExportError.js';

// Array of an active servers
const activeServers = new Map();

// Enable parsing of form data (files) with Multer package
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 50 * 1024 * 1024
  }
});

// Create express app
const app = express();

// Disable the X-Powered-By header
app.disable('x-powered-by');

// Enable CORS support
app.use(
  cors({
    methods: ['POST', 'GET', 'OPTIONS']
  })
);

// Enable body parser for JSON data
app.use(
  express.json({
    limit: 50 * 1024 * 1024
  })
);

// Enable body parser for URL-encoded form data
app.use(
  express.urlencoded({
    extended: true,
    limit: 50 * 1024 * 1024
  })
);

// Use only non-file multipart form fields
app.use(upload.none());

/**
 * Starts HTTP or/and HTTPS server based on the provided configuration. The
 * `serverOptions` object contains all server related properties (see the
 * `server` section in the `lib/schemas/config.js` file for a reference).
 *
 * @param {Object} serverOptions - Object containing server options.
 *
 * @throws {ExportError} Throws an error if the server cannot be configured and
 * started.
 */
export async function startServer(serverOptions = getOptions().server) {
  try {
    // Stop if not enabled
    if (!serverOptions.enable) {
      return false;
    }

    // Listen HTTP server
    if (!serverOptions.ssl.force) {
      // Main server instance (HTTP)
      const httpServer = http.createServer(app);

      // Attach error handlers and listen to the server
      _attachServerErrorHandlers(httpServer);

      // Listen
      httpServer.listen(serverOptions.port, serverOptions.host, () => {
        // Save the reference to HTTP server
        activeServers.set(serverOptions.port, httpServer);

        log(
          3,
          `[server] Started HTTP server on ${serverOptions.host}:${serverOptions.port}.`
        );

        if (activeServers.size === 1) {
          // Start a WebSocket connection
          webSocketInit({ ...httpServer.address(), protocol: 'http' });
        }
      });
    }

    // Listen HTTPS server
    if (serverOptions.ssl.enable) {
      // Set up an SSL server also
      let key, cert;

      try {
        // Get the SSL key
        key = await fsPromises.readFile(
          join(serverOptions.ssl.certPath, 'server.key'),
          'utf8'
        );

        // Get the SSL certificate
        cert = await fsPromises.readFile(
          join(serverOptions.ssl.certPath, 'server.crt'),
          'utf8'
        );
      } catch (error) {
        log(
          2,
          `[server] Unable to load key/certificate from the '${serverOptions.ssl.certPath}' path. Could not run secured layer server.`
        );
      }

      if (key && cert) {
        // Main server instance (HTTPS)
        const httpsServer = https.createServer({ key, cert }, app);

        // Attach error handlers and listen to the server
        _attachServerErrorHandlers(httpsServer);

        // Listen
        httpsServer.listen(serverOptions.ssl.port, serverOptions.host, () => {
          // Save the reference to HTTPS server
          activeServers.set(serverOptions.ssl.port, httpsServer);

          log(
            3,
            `[server] Started HTTPS server on ${serverOptions.host}:${serverOptions.ssl.port}.`
          );

          if (activeServers.size === 1) {
            // Start a WebSocket connection
            webSocketInit({ ...httpsServer.address(), protocol: 'https' });
          }
        });
      }
    }

    // Enable the rate limiter if config says so
    if (
      serverOptions.rateLimiting.enable &&
      /// TO DO: Correct
      ![0, NaN].includes(serverOptions.rateLimiting.maxRequests)
    ) {
      rateLimiting(app, serverOptions.rateLimiting);
    }

    // Set up static folder's route
    app.use(express.static(join(__dirname, 'public')));

    // Set up validation handler
    validateHandler(app);

    // Set up routes
    healthRoute(app);
    exportRoute(app);
    uiRoute(app);
    versionChangeRoute(app);

    // Set up centralized error handler
    errorHandler(app);
  } catch (error) {
    throw new ExportError(
      '[server] Could not configure and start the server.',
      500
    ).setError(error);
  }
}

/**
 * Closes all servers associated with Express app instance.
 */
export function closeServers() {
  log(4, `[server] Closing all servers.`);
  for (const [port, server] of activeServers) {
    server.close(() => {
      activeServers.delete(port);
      log(4, `[server] Closed server on port: ${port}.`);
    });
  }
}

/**
 * Get all servers associated with Express app instance.
 *
 * @returns {Array.<Object>} Servers associated with Express app instance.
 */
export function getServers() {
  return activeServers;
}

/**
 * Enable rate limiting for the server.
 *
 * @param {Object} limitConfig - Configuration object for rate limiting.
 *
 * @returns {Object} Middleware for enabling rate limiting.
 */
export function enableRateLimiting(limitConfig) {
  return rateLimiting(app, limitConfig);
}

/**
 * Get the Express instance.
 *
 * @returns {Object} The Express instance.
 */
export function getExpress() {
  return express;
}

/**
 * Get the Express app instance.
 *
 * @returns {Object} The Express app instance.
 */
export function getApp() {
  return app;
}

/**
 * Apply middleware(s) to a specific path.
 *
 * @param {string} path - The path to which the middleware(s) should be applied.
 * @param {...Function} middlewares - The middleware functions to be applied.
 */
export function use(path, ...middlewares) {
  app.use(path, ...middlewares);
}

/**
 * Set up a route with GET method and apply middleware(s).
 *
 * @param {string} path - The route path.
 * @param {...Function} middlewares - The middleware functions to be applied.
 */
export function get(path, ...middlewares) {
  app.get(path, ...middlewares);
}

/**
 * Set up a route with POST method and apply middleware(s).
 *
 * @param {string} path - The route path.
 * @param {...Function} middlewares - The middleware functions to be applied.
 */
export function post(path, ...middlewares) {
  app.post(path, ...middlewares);
}

/**
 * Attach error handlers to the server.
 *
 * @param {http.Server} server - The HTTP/HTTPS server instance.
 */
function _attachServerErrorHandlers(server) {
  server.on('clientError', (error) => {
    logWithStack(1, error, `[server] Client error: ${error.message}`);
  });

  server.on('error', (error) => {
    logWithStack(1, error, `[server] Server error: ${error.message}`);
  });

  server.on('connection', (socket) => {
    socket.on('error', (error) => {
      logWithStack(1, error, `[server] Socket error: ${error.message}`);
    });
  });
}

export default {
  startServer,
  closeServers,
  getServers,
  enableRateLimiting,
  getExpress,
  getApp,
  use,
  get,
  post
};
