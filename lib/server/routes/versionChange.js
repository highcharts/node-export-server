/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { updateVersion, version } from '../../cache.js';
import { envs } from '../../envs.js';

import HttpError from '../../errors/HttpError.js';

/**
 * Adds the POST /change_hc_version/:newVersion route that can be utilized to modify
 * the Highcharts version on the server.
 *
 * TODO: Add auth token and connect to API
 */
export default (app) =>
  !app
    ? false
    : app.post(
        '/version/change/:newVersion',
        async (request, response, next) => {
          try {
            const adminToken = envs.HIGHCHARTS_ADMIN_TOKEN;

            // Check the existence of the token
            if (!adminToken || !adminToken.length) {
              throw new HttpError(
                'The server is not configured to perform run-time version changes: HIGHCHARTS_ADMIN_TOKEN is not set.',
                401
              );
            }

            // Check if the hc-auth header contain a correct token
            const token = request.get('hc-auth');
            if (!token || token !== adminToken) {
              throw new HttpError(
                'Invalid or missing token: Set the token in the hc-auth header.',
                401
              );
            }

            // Compare versions
            const newVersion = request.params.newVersion;
            if (newVersion) {
              try {
                // eslint-disable-next-line import/no-named-as-default-member
                await updateVersion(newVersion);
              } catch (error) {
                throw new HttpError(
                  `Version change: ${error.message}`,
                  error.statusCode
                ).setError(error);
              }

              // Success
              response.status(200).send({
                statusCode: 200,
                version: version(),
                message: `Successfully updated Highcharts to version: ${newVersion}.`
              });
            } else {
              // No version specified
              throw new HttpError('No new version supplied.', 400);
            }
          } catch (error) {
            next(error);
          }
        }
      );
