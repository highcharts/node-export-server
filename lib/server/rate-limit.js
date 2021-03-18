/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const log = require('./../logger').log;

/**
 * Enables rate limiting for a given app
 */
module.exports = (app, options) => {
  const msg =
    'Too many requests, you have been rate limited. Please try again later';

  const op = {
    max: options.max || 30,
    window: options.window || 1,
    delay: options.delay || 0,
    trustProxy: options.trustProxy || false,
    skipKey: options.skipKey || false,
    skipToken: options.skipToken || false
  };

  log(
    3,
    'enabling rate limiting:',
    op.max,
    'requests per.',
    op.window,
    'minute per. IP',
    `trusting proxy? ${op.trustProxy}`
  );

  if (op.trustProxy) {
    app.enable('trust proxy');
  }

  const limiter = new RateLimit({
    windowMs: op.window * 60 * 1000,
    max: op.max, // limit each IP to 100 requests per windowMs
    delayMs: op.delay, // disable delaying - full speed until the max limit is reached
    handler: function (req, res) {
      res.format({
        json: function () {
          res.status(429).send({ message: msg });
        },
        default: function () {
          res.status(429).send(msg);
        }
      });
    },
    skip: function (req, res) {
      //We allow bypassing the limiter if a valid key/token has been sent
      if (
        op.skipKey !== false &&
        op.skipToken !== false &&
        req.query.key === op.skipKey &&
        req.query.access_token === op.skipToken
      ) {
        log(4, 'skipping rate limiter');
        return true;
      }
      return false;
    }
  });

  app.use(limiter);
};
