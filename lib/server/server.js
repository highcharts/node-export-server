/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { promises as fsPromises } from 'fs';
import { posix } from 'path';

import cors from 'cors';
import express from 'express';
import http from 'http';
import https from 'https';
import multer from 'multer';

import errorHandler from './error.js';
import rateLimit from './rate_limit.js';
import { log, logWithStack } from '../logger.js';
import { __dirname } from '../utils.js';

import vSwitchRoute from './routes/change_hc_version.js';
import exportRoutes from './routes/export.js';
import healthRoute from './routes/health.js';
import uiRoute from './routes/ui.js';

import ExportError from '../errors/ExportError.js';

// Array of an active servers
const activeServers = new Map();

// Create express app
const app = express();

// Disable the X-Powered-By header
app.disable('x-powered-by');

// Enable CORS support
app.use(cors());

// Enable parsing of form data (files) with Multer package
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fieldSize: 50 * 1024 * 1024
  }
});

// Enable body parser
app.use(express.json({ limit: 50 * 1024 * 1024 }));
app.use(express.urlencoded({ extended: true, limit: 50 * 1024 * 1024 }));

// Use only non-file multipart form fields
app.use(upload.none());

/**
 * Attach error handlers to the server.
 *
 * @param {http.Server} server - The HTTP/HTTPS server instance.
 */
const attachServerErrorHandlers = (server) => {
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
};

/**
 * Starts an HTTP server based on the provided configuration. The `serverConfig`
 * object contains all server related properties (see the `server` section
 * in the `lib/schemas/config.js` file for a reference).
 *
 * @param {Object} serverConfig - The server configuration object.
 *
 * @throws {ExportError} - Throws an error if the server cannot be configured
 * and started.
 */
export const startServer = async (serverConfig) => {
  try {
    // Stop if not enabled
    if (!serverConfig.enable) {
      return false;
    }

    // Listen HTTP server
    if (!serverConfig.ssl.force) {
      // Main server instance (HTTP)
      const httpServer = http.createServer(app);

      // Attach error handlers and listen to the server
      attachServerErrorHandlers(httpServer);

      // Listen
      httpServer.listen(serverConfig.port, serverConfig.host);

      // Save the reference to HTTP server
      activeServers.set(serverConfig.port, httpServer);

      log(
        3,
        `[server] Started HTTP server on ${serverConfig.host}:${serverConfig.port}.`
      );
    }

    // Listen HTTPS server
    if (serverConfig.ssl.enable) {
      // Set up an SSL server also
      let key, cert;

      try {
        // Get the SSL key
        key = await fsPromises.readFile(
          posix.join(serverConfig.ssl.certPath, 'server.key'),
          'utf8'
        );

        // Get the SSL certificate
        cert = await fsPromises.readFile(
          posix.join(serverConfig.ssl.certPath, 'server.crt'),
          'utf8'
        );
      } catch (error) {
        log(
          2,
          `[server] Unable to load key/certificate from the '${serverConfig.ssl.certPath}' path. Could not run secured layer server.`
        );
      }

      if (key && cert) {
        // Main server instance (HTTPS)
        const httpsServer = https.createServer({ key, cert }, app);

        // Attach error handlers and listen to the server
        attachServerErrorHandlers(httpsServer);

        // Listen
        httpsServer.listen(serverConfig.ssl.port, serverConfig.host);

        // Save the reference to HTTPS server
        activeServers.set(serverConfig.ssl.port, httpsServer);

        log(
          3,
          `[server] Started HTTPS server on ${serverConfig.host}:${serverConfig.ssl.port}.`
        );
      }
    }

    // Enable the rate limiter if config says so
    if (
      serverConfig.rateLimiting &&
      serverConfig.rateLimiting.enable &&
      ![0, NaN].includes(serverConfig.rateLimiting.maxRequests)
    ) {
      rateLimit(app, serverConfig.rateLimiting);
    }

    // Set up static folder's route
    app.use(express.static(posix.join(__dirname, 'public')));

    // Set up routes
    healthRoute(app);
    exportRoutes(app);
    uiRoute(app);
    vSwitchRoute(app);

    // Set up centralized error handler
    errorHandler(app);
  } catch (error) {
    throw new ExportError(
      '[server] Could not configure and start the server.'
    ).setError(error);
  }
};

/**
 * Closes all servers associated with Express app instance.
 */
export const closeServers = () => {
  log(4, `[server] Closing all servers.`);
  for (const [port, server] of activeServers) {
    server.close(() => {
      activeServers.delete(port);
      log(4, `[server] Closed server on port: ${port}.`);
    });
  }
};

/**
 * Get all servers associated with Express app instance.
 *
 * @returns {Array} - Servers associated with Express app instance.
 */
export const getServers = () => activeServers;

/**
 * Enable rate limiting for the server.
 *
 * @param {Object} limitConfig - Configuration object for rate limiting.
 */
export const enableRateLimiting = (limitConfig) => rateLimit(app, limitConfig);

/**
 * Get the Express instance.
 *
 * @returns {Object} - The Express instance.
 */
export const getExpress = () => express;

/**
 * Get the Express app instance.
 *
 * @returns {Object} - The Express app instance.
 */
export const getApp = () => app;

/**
 * Apply middleware(s) to a specific path.
 *
 * @param {string} path - The path to which the middleware(s) should be applied.
 * @param {...Function} middlewares - The middleware functions to be applied.
 */
export const use = (path, ...middlewares) => {
  app.use(path, ...middlewares);
};

/**
 * Set up a route with GET method and apply middleware(s).
 *
 * @param {string} path - The route path.
 * @param {...Function} middlewares - The middleware functions to be applied.
 */
export const get = (path, ...middlewares) => {
  app.get(path, ...middlewares);
};

/**
 * Set up a route with POST method and apply middleware(s).
 *
 * @param {string} path - The route path.
 * @param {...Function} middlewares - The middleware functions to be applied.
 */
export const post = (path, ...middlewares) => {
  app.post(path, ...middlewares);
};

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
