/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const rateLimit = require('express-rate-limit');

const log = require('./../logger').log;

/**
 * Enables rate limiting for a given app
 */
module.exports = (app, limitConfig) => {
  const msg =
    'Too many requests, you have been rate limited. Please try again later.';

  // Options for the rate limiter
  const rateOptions = {
    max: limitConfig.maxRequests || 30,
    window: limitConfig.window || 1,
    delay: limitConfig.delay || 0,
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
    max: rateOptions.max, // limit each IP to 100 requests per windowMs
    delayMs: rateOptions.delay, // disable delaying - full speed until the max limit is reached
    handler: (req, res) => {
      res.format({
        json: () => {
          res.status(429).send({ message: msg });
        },
        default: () => {
          res.status(429).send(msg);
        }
      });
    },
    skip: (req, res) => {
      // Allow bypassing the limiter if a valid key/token has been sent
      if (
        rateOptions.skipKey !== false &&
        rateOptions.skipToken !== false &&
        req.query.key === rateOptions.skipKey &&
        req.query.access_token === rateOptions.skipToken
      ) {
        log(4, '[rate-limit] -Skipping rate limiter.');
        return true;
      }
      return false;
    }
  });

  // Use a limiter as a middleware
  app.use(limiter);

  log(
    3,
    'Enabled rate limiting:',
    rateOptions.max,
    'requests per',
    rateOptions.window,
    'minute per IP,',
    `trusting proxy: ${rateOptions.trustProxy}.`
  );
};
