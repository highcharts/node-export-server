/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import rateLimit from 'express-rate-limit';

import { log } from '../logger.js';

/**
 * Middleware for enabling rate limiting on the specified Express app.
 *
 * @param {Express} app - The Express app instance.
 *
 * @param {Object} rateLimitingOptions - Object containing rate limiting
 * options.
 */
export function rateLimiting(app, rateLimitingOptions) {
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
    handler: (_request, response) => {
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

export default {
  rateLimiting
};
