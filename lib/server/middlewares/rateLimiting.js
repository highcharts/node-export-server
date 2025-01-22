/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Provides middleware functions for configuring and enabling rate
 * limiting in an Express application.
 */

import rateLimit from 'express-rate-limit';

import { log } from '../../logger.js';

import ExportError from '../../errors/ExportError.js';

/**
 * Middleware for enabling rate limiting on the specified Express app.
 *
 * @param {Express} app - The Express app instance.
 *
 * @param {Object} rateLimitingOptions - The configuration object containing
 * `rateLimiting` options.
 *
 * @throws {ExportError} Throws an `ExportError` if could not configure and set
 * the rate limiting options.
 */
export default function rateLimitingMiddleware(app, rateLimitingOptions) {
  try {
    // Check if the rate limiting is enabled and the app exists
    if (app && rateLimitingOptions.enable) {
      const message =
        'Too many requests, you have been rate limited. Please try again later.';

      // Options for the rate limiter
      const rateOptions = {
        window: rateLimitingOptions.window || 1,
        maxRequests: rateLimitingOptions.maxRequests || 30,
        delay: rateLimitingOptions.delay || 0,
        trustProxy: rateLimitingOptions.trustProxy || false,
        skipKey: rateLimitingOptions.skipKey || null,
        skipToken: rateLimitingOptions.skipToken || null
      };

      // Set if behind a proxy
      if (rateOptions.trustProxy) {
        app.enable('trust proxy');
      }

      // Create a limiter
      const limiter = rateLimit({
        // Time frame for which requests are checked and remembered
        windowMs: rateOptions.window * 60 * 1000,
        // Limit each IP to 100 requests per `windowMs`
        limit: rateOptions.maxRequests,
        // Disable delaying, full speed until the max limit is reached
        delayMs: rateOptions.delay,
        handler: (request, response) => {
          response.format({
            json: () => {
              response.status(429).send({ message });
            },
            default: () => {
              response.status(429).send(message);
            }
          });
        },
        skip: (request) => {
          // Allow bypassing the limiter if a valid key/token has been sent
          if (
            rateOptions.skipKey !== null &&
            rateOptions.skipToken !== null &&
            request.query.key === rateOptions.skipKey &&
            request.query.access_token === rateOptions.skipToken
          ) {
            log(4, '[rate limiting] Skipping rate limiter.');
            return true;
          }
          return false;
        }
      });

      // Use a limiter as a middleware
      app.use(limiter);

      log(
        3,
        `[rate limiting] Enabled rate limiting with ${rateOptions.maxRequests} requests per ${rateOptions.window} minute for each IP, trusting proxy: ${rateOptions.trustProxy}.`
      );
    }
  } catch (error) {
    throw new ExportError(
      '[rate limiting] Could not configure and set the rate limiting options.',
      500
    ).setError(error);
  }
}
