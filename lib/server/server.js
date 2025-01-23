/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview A module that sets up and manages HTTP and HTTPS servers
 * for the Highcharts Export Server. It handles server initialization,
 * configuration, error handling, middleware setup, route definition, and rate
 * limiting. The module exports functions to start, stop, and manage server
 * instances, as well as utility functions for defining routes and attaching
 * middlewares.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import cors from 'cors';
import express from 'express';
import http from 'http';
import https from 'https';
import multer from 'multer';

import { updateOptions } from '../config.js';
import { log, logWithStack } from '../logger.js';
import { __dirname, getAbsolutePath } from '../utils.js';

import errorMiddleware from './middlewares/error.js';
import rateLimitingMiddleware from './middlewares/rateLimiting.js';
import validationMiddleware from './middlewares/validation.js';

import exportRoutes from './routes/export.js';
import healthRoutes from './routes/health.js';
import uiRoutes from './routes/ui.js';
import versionChangeRoutes from './routes/versionChange.js';

import ExportError from '../errors/ExportError.js';

// Array of an active servers
const activeServers = new Map();

// Create express app
const app = express();

/**
 * Starts an HTTP and/or HTTPS server based on the provided configuration.
 * The `serverOptions` object contains server-related properties (refer
 * to the `server` section in the `./lib/schemas/config.js` file for details).
 *
 * @async
 * @function startServer
 *
 * @param {Object} serverOptions - The configuration object containing `server`
 * options. This object may include a partial or complete set of the `server`
 * options. If the options are partial, missing values will default
 * to the current global configuration.
 *
 * @returns {Promise<void>} A Promise that resolves when the server is either
 * not enabled or no valid Express app is found, signaling the end of the
 * function's execution.
 *
 * @throws {ExportError} Throws an `ExportError` if the server cannot
 * be configured and started.
 */
export async function startServer(serverOptions) {
  try {
    // Update the instance options object
    const options = updateOptions({
      server: serverOptions
    });

    // Use validated options
    serverOptions = options.server;

    // Stop if not enabled
    if (!serverOptions.enable || !app) {
      throw new ExportError(
        '[server] Server cannot be started (not enabled or no correct Express app found).',
        500
      );
    }

    // Too big limits lead to timeouts in the export process when
    // the rasterization timeout is set too low
    const uploadLimitBytes = serverOptions.uploadLimit * 1024 * 1024;

    // Memory storage for multer package
    const storage = multer.memoryStorage();

    // Enable parsing of form data (files) with multer package
    const upload = multer({
      storage,
      limits: {
        fieldSize: uploadLimitBytes
      }
    });

    // Disable the X-Powered-By header
    app.disable('x-powered-by');

    // Enable CORS support
    app.use(
      cors({
        methods: ['POST', 'GET', 'OPTIONS']
      })
    );

    // Getting a lot of `RangeNotSatisfiableError` exceptions (even though this
    // is a deprecated options, let's try to set it to false)
    app.use((request, response, next) => {
      response.set('Accept-Ranges', 'none');
      next();
    });

    // Enable body parser for JSON data
    app.use(
      express.json({
        limit: uploadLimitBytes
      })
    );

    // Enable body parser for URL-encoded form data
    app.use(
      express.urlencoded({
        extended: true,
        limit: uploadLimitBytes
      })
    );

    // Use only non-file multipart form fields
    app.use(upload.none());

    // Set up static folder's route
    app.use(express.static(join(__dirname, 'public')));

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
      });
    }

    // Listen HTTPS server
    if (serverOptions.ssl.enable) {
      // Set up an SSL server also
      let key, cert;

      try {
        // Get the SSL key
        key = readFileSync(
          join(getAbsolutePath(serverOptions.ssl.certPath), 'server.key'),
          'utf8'
        );

        // Get the SSL certificate
        cert = readFileSync(
          join(getAbsolutePath(serverOptions.ssl.certPath), 'server.crt'),
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
        });
      }
    }

    // Set up the rate limiter
    rateLimitingMiddleware(app, serverOptions.rateLimiting);

    // Set up the validation handler
    validationMiddleware(app);

    // Set up routes
    exportRoutes(app);
    healthRoutes(app);
    uiRoutes(app);
    versionChangeRoutes(app);

    // Set up the centralized error handler
    errorMiddleware(app);
  } catch (error) {
    throw new ExportError(
      '[server] Could not configure and start the server.',
      500
    ).setError(error);
  }
}

/**
 * Closes all servers associated with Express app instance.
 *
 * @function closeServers
 */
export function closeServers() {
  // Check if there are servers working
  if (activeServers.size > 0) {
    log(4, `[server] Closing all servers.`);

    // Close each one of servers
    for (const [port, server] of activeServers) {
      server.close(() => {
        activeServers.delete(port);
        log(4, `[server] Closed server on port: ${port}.`);
      });
    }
  }
}

/**
 * Get all servers associated with Express app instance.
 *
 * @function getServers
 *
 * @returns {Array.<Object>} Servers associated with Express app instance.
 */
export function getServers() {
  return activeServers;
}

/**
 * Get the Express instance.
 *
 * @function getExpress
 *
 * @returns {Express} The Express instance.
 */
export function getExpress() {
  return express;
}

/**
 * Get the Express app instance.
 *
 * @function getApp
 *
 * @returns {Express} The Express app instance.
 */
export function getApp() {
  return app;
}

/**
 * Enable rate limiting for the server.
 *
 * @function enableRateLimiting
 *
 * @param {Object} rateLimitingOptions - The configuration object containing
 * `rateLimiting` options. This object may include a partial or complete set
 * of the `rateLimiting` options. If the options are partial, missing values
 * will default to the current global configuration.
 */
export function enableRateLimiting(rateLimitingOptions) {
  // Update the instance options object
  const options = updateOptions({
    server: {
      rateLimiting: rateLimitingOptions
    }
  });

  // Set the rate limiting options
  rateLimitingMiddleware(app, options.server.rateLimitingOptions);
}

/**
 * Apply middleware(s) to a specific path.
 *
 * @function use
 *
 * @param {string} path - The path to which the middleware(s) should be applied.
 * @param {...Function} middlewares - The middleware function(s) to be applied.
 */
export function use(path, ...middlewares) {
  app.use(path, ...middlewares);
}

/**
 * Set up a route with GET method and apply middleware(s).
 *
 * @function get
 *
 * @param {string} path - The path to which the middleware(s) should be applied.
 * @param {...Function} middlewares - The middleware function(s) to be applied.
 */
export function get(path, ...middlewares) {
  app.get(path, ...middlewares);
}

/**
 * Set up a route with POST method and apply middleware(s).
 *
 * @function post
 *
 * @param {string} path - The path to which the middleware(s) should be applied.
 * @param {...Function} middlewares - The middleware function(s) to be applied.
 */
export function post(path, ...middlewares) {
  app.post(path, ...middlewares);
}

/**
 * Attach error handlers to the server.
 *
 * @function _attachServerErrorHandlers
 *
 * @param {(http.Server|https.Server)} server - The HTTP/HTTPS server instance.
 */
function _attachServerErrorHandlers(server) {
  server.on('clientError', (error, socket) => {
    logWithStack(
      1,
      error,
      `[server] Client error: ${error.message}, destroying socket.`
    );
    socket.destroy();
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
  getExpress,
  getApp,
  enableRateLimiting,
  use,
  get,
  post
};
