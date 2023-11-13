/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import cache from '../../cache.js';

/**
 * Adds a route that can be used to change the HC version on the server
 * TODO: Add auth token and connect to API
 */
export default (app) =>
  !app
    ? false
    : app.post('/change_hc_version/:newVersion', async (request, response) => {
        const ctoken = process.env.HIGHCHARTS_ADMIN_TOKEN;

        if (!ctoken || !ctoken.length) {
          return response.send({
            error: true,
            message:
              'Server not configured to do run-time version changes: HIGHCHARTS_ADMIN_TOKEN not set'
          });
        }

        const token = request.get('hc-auth');

        if (!token || token !== ctoken) {
          return response.send({
            error: true,
            message: 'Invalid or missing token: set token in the hc-auth header'
          });
        }

        const newVersion = request.params.newVersion;

        if (newVersion) {
          try {
            // eslint-disable-next-line import/no-named-as-default-member
            await cache.updateVersion(newVersion);
          } catch (e) {
            response.send({
              error: true,
              message: e
            });
          }

          response.send({
            version: cache.version()
          });
        } else {
          response.send({
            error: true,
            message: 'No new version supplied'
          });
        }
      });
