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
import {
  getPool,
  getQueueLimit,
  getQueueRejectDelay,
  stats as poolStats
} from '../pool.js';
import { __dirname } from '../utils.js';

import { errorCodes } from '../errors/codes.js';
import HttpError from '../errors/HttpError.js';

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

// Getting a lot of RangeNotSatisfiableError exception.
// Even though this is a deprecated options, let's try to set it to false.
app.use((_req, res, next) => {
  res.set('Accept-Ranges', 'none');
  next();
});

/**
 * Attach error handlers to the server.
 *
 * @param {http.Server} server - The HTTP/HTTPS server instance.
 */
const attachServerErrorHandlers = (server) => {
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
};

/**
 * Applies the connection timeouts to a server.
 *
 * NOTE: Node's default keepAliveTimeout is 5 seconds, which is shorter than the
 *       idle timeout of a typical proxy or load balancer sitting in front of this
 *       server - commonly 60. When the shorter side closes an idle connection the
 *       other side does not know, so it can send a request into a connection that
 *       is already going away, and the caller sees a gateway error that has
 *       nothing to do with the request. Keeping ours longer than theirs leaves the
 *       closing to them.
 *
 *       headersTimeout is kept above keepAliveTimeout deliberately: if it were
 *       shorter it would fire while a kept-alive connection was still legitimately
 *       idle between requests.
 *
 * @param {http.Server} server - The HTTP/HTTPS server instance.
 * @param {Object} serverConfig - The server configuration object.
 */
const applyServerTimeouts = (server, serverConfig) => {
  const keepAlive = parseInt(serverConfig.keepAliveTimeout);
  const keepAliveTimeout =
    isNaN(keepAlive) || keepAlive < 0 ? 65000 : keepAlive;

  server.keepAliveTimeout = keepAliveTimeout;
  server.headersTimeout = keepAliveTimeout + 5000;

  log(
    4,
    `[server] Set keepAliveTimeout to ${server.keepAliveTimeout}ms and headersTimeout to ${server.headersTimeout}ms.`
  );
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
    // TODO: Read from config/env
    // NOTE:
    // Too big limits lead to timeouts in the export process when the
    // rasterization timeout is set too low.
    const uploadLimitMiB = serverConfig.maxUploadSize || 3;
    const uploadLimitBytes = uploadLimitMiB * 1024 * 1024;

    // Enable parsing of form data (files) with Multer package
    const storage = multer.memoryStorage();
    const upload = multer({
      storage,
      limits: {
        fieldSize: uploadLimitBytes
      }
    });

    // NOTE: Refuse work before the body is parsed when the queue is already
    //       full. Checking only inside the pool would mean a request that is
    //       going to be refused anyway has its body - up to maxUploadSize, 3MiB
    //       by default - read and held in memory first. With a deep queue that
    //       is exactly the memory pressure a saturated server cannot afford,
    //       and it is what eventually gets the browser killed.
    app.use((request, response, next) => {
      // Only export requests are worth gating; the admin version route is not
      // pool work and must stay reachable when the server is busy
      if (request.method !== 'POST' || request.path.startsWith('/version/')) {
        return next();
      }

      const pool = getPool();

      if (pool && pool.numPendingAcquires() >= getQueueLimit()) {
        ++poolStats.rejectedForCapacity;

        const error = new HttpError(
          `The server is at capacity: ${pool.numPendingAcquires()} exports are already waiting for a worker (limit is ${getQueueLimit()}). Please retry shortly.`,
          400,
          errorCodes.QUEUE_FULL
        );

        // NOTE: Do not answer immediately by default. Measured: with an instant
        //       refusal, clients that retry as soon as they are refused drive
        //       the request rate up by orders of magnitude - 150 concurrent
        //       clients reached 11000 requests per second - and the server then
        //       spends its entire event loop refusing them, starving the exports
        //       already in progress. Goodput fell from ~19 exports per second to
        //       under 1.
        //
        //       The 5 second acquire timeout used to provide this backpressure
        //       accidentally, by making every client wait before it could retry.
        //       Bounding the queue removes that, so the delay puts it back
        //       deliberately, and far more cheaply: no body has been parsed and
        //       no worker is held, only a socket and a timer.
        const delay = getQueueRejectDelay();

        if (!delay) {
          return next(error);
        }

        const onClose = () => clearTimeout(timer);

        const timer = setTimeout(() => {
          response.removeListener('close', onClose);
          next(error);
        }, delay);

        // Do not keep a timer alive for a client that has already gone
        response.once('close', onClose);

        return;
      }

      next();
    });

    // Enable body parser
    app.use(express.json({ limit: uploadLimitBytes }));
    app.use(express.urlencoded({ extended: true, limit: uploadLimitBytes }));

    // Use only non-file multipart form fields
    app.use(upload.none());

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
      applyServerTimeouts(httpServer, serverConfig);

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
        applyServerTimeouts(httpsServer, serverConfig);

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

    // Basic authentication middleware
    app.use((req, res, next) => {
      if (!serverConfig.basicAuth.enable) {
        // Basic auth not enabled, skip authentication
        return next();
      }

      const configLogin = serverConfig.basicAuth.login;
      const configPassword = serverConfig.basicAuth.password;
      const auth = { login: configLogin, password: configPassword };
      const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
      const [login, password] = Buffer.from(b64auth, 'base64')
        .toString()
        .split(':');

      if (
        login &&
        password &&
        login === auth.login &&
        password === auth.password
      ) {
        return next();
      }

      res.set('WWW-Authenticate', 'Basic realm="401"');
      res.status(401).send('Authentication required.');
    });

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
 * Closes all servers associated with Express app instance, resolving once the
 * requests already in flight have been served.
 *
 * @returns {Promise<void>} Resolves when every server has closed.
 */
export const closeServers = () => {
  log(4, `[server] Closing all servers.`);

  return Promise.all(
    [...activeServers].map(
      ([port, server]) =>
        new Promise((resolve) => {
          // close() stops new connections being accepted and calls back once the
          // ones in flight have finished, which is what makes a graceful shutdown
          // possible - the previous version discarded that callback entirely
          server.close(() => {
            activeServers.delete(port);
            log(4, `[server] Closed server on port: ${port}.`);
            resolve();
          });

          // NOTE: Without this, close() also waits for connections that are merely
          //       idle, which now means up to keepAliveTimeout - 65 seconds. Idle
          //       connections have no work worth waiting for, so end them and let
          //       close() wait only on requests actually being served.
          server.closeIdleConnections?.();
        })
    )
  );
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
