/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { promises as fsPromises } from 'fs';
import { posix } from 'path';

import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import http from 'http';
import https from 'https';

import { log } from '../logger.js';
import rateLimit from './rate_limit.js';
import { __dirname } from '../utils.js';

import healthRoute from './routes/health.js';
import exportRoutes from './routes/export.js';
import vSwitchRoute from './routes/change_hc_version.js';
import uiRoute from './routes/ui.js';

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
    fieldsSize: '50MB'
  }
});

app.use(upload.any());

// Enable body parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));

/**
 * Error handler function.
 *
 * @param {object} error - An error object.
 * @return {string} - An error message.
 */
const errorHandler = (error) => log(1, `[server] Socket error: ${error}`);

/**
 * Attaches error handlers for a server.
 *
 * @param {object} server - The http/https server.
 */
const attachErrorHandlers = (server) => {
  server.on('clientError', errorHandler);
  server.on('error', errorHandler);
  server.on('connection', (socket) =>
    socket.on('error', (error) => errorHandler(error, socket))
  );
};

export const startServer = async (serverConfig) => {
  // Stop if not enabled
  if (!serverConfig.enable) {
    return false;
  }

  // // Get the pool
  // const pool = getPool();

  // // Try to create browser instance before starting the server
  // const resource = await pool.acquire();

  // // If not found, throw an error
  // if (!resource.browser) {
  //   log(1, `[server] Could not acquire browser instance.`);
  //   process.exit(1);
  // }

  // // Release the resource
  // pool.release(resource);

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
        1,
        `[server] Unable to load key/certificate from ${serverConfig.ssl.certPath}.`
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
};

/**
 * Returns the express instance.
 */
export const getExpress = () => {
  return express;
};

/**
 * Returns the app instance.
 */
export const getApp = () => {
  return app;
};

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
