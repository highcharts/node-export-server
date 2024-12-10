/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Defines an Express route for updating the Highcharts version
 * on the server, with authentication and validation.
 */

import { updateHighchartsVersion, getHighchartsVersion } from '../../cache.js';
import { envs } from '../../envs.js';

import HttpError from '../../errors/HttpError.js';

/**
 * Adds the POST /version_change/:newVersion route that can be utilized
 * to modify the Highcharts version on the server.
 *
 * @function versionChangeRoute
 *
 * @param {Express} app - The Express app instance.
 */
export default function versionChangeRoute(app) {
  return !app
    ? false
    : app.post(
        '/version_change/:newVersion',
        async (request, response, next) => {
          try {
            // Get the token directly from envs
            const adminToken = envs.HIGHCHARTS_ADMIN_TOKEN;

            // Check the existence of the token
            if (!adminToken || !adminToken.length) {
              throw new HttpError(
                'The server is not configured to perform run-time version changes: HIGHCHARTS_ADMIN_TOKEN is not set.',
                401
              );
            }

            // Get the token from the hc-auth header
            const token = request.get('hc-auth');

            // Check if the hc-auth header contain a correct token
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
                // Update version
                await updateHighchartsVersion(newVersion);
              } catch (error) {
                throw new HttpError(
                  `Version change: ${error.message}`,
                  400
                ).setError(error);
              }

              // Success
              response.status(200).send({
                statusCode: 200,
                highchartsVersion: getHighchartsVersion(),
                message: `Successfully updated Highcharts to version: ${newVersion}.`
              });
            } else {
              // No version specified
              throw new HttpError('No new version supplied.', 400);
            }
          } catch (error) {
            return next(error);
          }
        }
      );
}
