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
import { log, logWithStack } from '../logger.js';
import rateLimit from './rate_limit.js';
import { __dirname } from '../utils.js';

import vSwitchRoute from './routes/change_hc_version.js';
import exportRoutes from './routes/export.js';
import healthRoute from './routes/health.js';
import uiRoute from './routes/ui.js';

import ExportError from '../errors/ExportError.js';

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
 * Attaches error handlers for a server.
 *
 * @param {object} server - The http/https server.
 */
const attachErrorHandlers = (server) => {
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

export const startServer = async (serverConfig) => {
  try {
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

        throw error;
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
 * Returns the express instance.
 */
export const getExpress = () => express;

/**
 * Returns the app instance.
 */
export const getApp = () => app;

/**
 * Adds a middleware to the server.
 *
 * @param {object} path - An endpoint path to add middlewares to.
 * @param {Array} middlewares - An unlimited number of middlewares to use
 * against the specific endpoint.
 */
export const use = (path, ...middlewares) => {
  app.use(path, ...middlewares);
};

/**
 * Adds a get route to the server.
 *
 * @param {object} path - An endpoint path to add middlewares to.
 * @param {Array} middlewares - An unlimited number of middlewares to use
 * against the specific endpoint for GET method.
 */
export const get = (path, ...middlewares) => {
  app.get(path, ...middlewares);
};

/**
 * Adds a post route to the server.
 *
 * @param {object} path - An endpoint path to add middlewares to.
 * @param {Array} middlewares - An unlimited number of middlewares to use
 * against the specific endpoint for POST method.
 */
export const post = (path, ...middlewares) => {
  app.post(path, ...middlewares);
};

/**
 * Forcefully enables rate limiting.
 *
 * @param {object} limitConfig - The options object for the rate limiter
 * configuration.
 */
export const enableRateLimiting = (limitConfig) => {
  return rateLimit(app, limitConfig);
};

export default {
  startServer,
  getExpress,
  getApp,
  use,
  get,
  post,
  enableRateLimiting
};
