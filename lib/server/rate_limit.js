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
 * @param {Object} limitConfig - Configuration options for rate limiting.
 */
export default (app, limitConfig) => {
  const msg =
    'Too many requests, you have been rate limited. Please try again later.';

  // Options for the rate limiter
  const rateOptions = {
    max: limitConfig.maxRequests || 30,
    window: limitConfig.window || 1,
    trustProxy: limitConfig.trustProxy || false,
    skipKey: limitConfig.skipKey || false,
    skipToken: limitConfig.skipToken || false
  };

  // Set if behind a proxy
  if (rateOptions.trustProxy) {
    app.enable('trust proxy');
  }

  // Create a limiter
  const limiter = rateLimit({
    windowMs: rateOptions.window * 60 * 1000,
    // The number of requests each IP may make per window. Named `max` before
    // express-rate-limit v7.
    limit: rateOptions.max,
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
};
