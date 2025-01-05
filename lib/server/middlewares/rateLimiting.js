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

import { getOptions } from '../../config.js';
import { log } from '../../logger.js';

import ExportError from '../../errors/ExportError.js';

/**
 * Middleware for enabling rate limiting on the specified Express app.
 *
 * @param {Express} app - The Express app instance.
 *
 * @param {Object} [rateLimitingOptions=getOptions().server.rateLimiting] -
 * Object containing `rateLimiting` options. The default value is the global
 * rate limiting options of the export server instance.
 *
 * @throws {ExportError} Throws an `ExportError` if could not configure and set
 * the rate limiting options.
 */
export default function rateLimitingMiddleware(
  app,
  rateLimitingOptions = getOptions().server.rateLimiting
) {
  try {
    // Check if the rate limiting is enabled
    if (rateLimitingOptions.enable) {
      const msg =
        'Too many requests, you have been rate limited. Please try again later.';

      // Options for the rate limiter
      const rateOptions = {
        max: rateLimitingOptions.maxRequests || 30,
        window: rateLimitingOptions.window || 1,
        delay: rateLimitingOptions.delay || 0,
        trustProxy: rateLimitingOptions.trustProxy || false,
        skipKey: rateLimitingOptions.skipKey || false,
        skipToken: rateLimitingOptions.skipToken || false
      };

      // Set if behind a proxy
      if (rateOptions.trustProxy) {
        app.enable('trust proxy');
      }

      // Create a limiter
      const limiter = rateLimit({
        windowMs: rateOptions.window * 60 * 1000,
        // Limit each IP to 100 requests per windowMs
        max: rateOptions.max,
        // Disable delaying, full speed until the max limit is reached
        delayMs: rateOptions.delay,
        handler: (request, response) => {
          response.format({
            json: () => {
              response.status(429).send({ message: msg });
            },
            default: () => {
              response.status(429).send(msg);
            }
          });
        },
        skip: (request) => {
          // Allow bypassing the limiter if a valid key/token has been sent
          if (
            rateOptions.skipKey !== false &&
            rateOptions.skipToken !== false &&
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
        `[rate limiting] Enabled rate limiting with ${rateOptions.max} requests per ${rateOptions.window} minute for each IP, trusting proxy: ${rateOptions.trustProxy}.`
      );
    }
  } catch (error) {
    throw new ExportError(
      '[rate limiting] Could not configure and set the rate limiting options.',
      500
    ).setError(error);
  }
}
