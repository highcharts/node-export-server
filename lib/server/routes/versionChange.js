/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Defines an Express route for updating the Highcharts version
 * on the server, with authentication and validation.
 */

import { updateHighchartsVersion, getHighchartsVersion } from '../../cache.js';
import { validateOption } from '../../config.js';
import { log } from '../../logger.js';
import { envs } from '../../validation.js';

import ExportError from '../../errors/ExportError.js';

/**
 * Adds the `version_change` routes.
 *
 * @function versionChangeRoutes
 *
 * @param {Express} app - The Express app instance.
 */
export default function versionChangeRoutes(app) {
  /**
   * Adds the POST '/version_change/:newVersion' - A route for changing
   * the Highcharts version on the server.
   */
  app.post('/version_change/:newVersion', async (request, response, next) => {
    try {
      log(4, '[version] Changing Highcharts version.');

      // Get the token directly from envs
      const adminToken = envs.HIGHCHARTS_ADMIN_TOKEN;

      // Check the existence of the token
      if (!adminToken || !adminToken.length) {
        throw new ExportError(
          '[version] The server is not configured to perform run-time version changes: HIGHCHARTS_ADMIN_TOKEN is not set.',
          401
        );
      }

      // Get the token from the hc-auth header
      const token = request.get('hc-auth');

      // Check if the hc-auth header contain a correct token
      if (!token || token !== adminToken) {
        throw new ExportError(
          '[version] Invalid or missing token: Set the token in the hc-auth header.',
          401
        );
      }

      // Compare versions
      let newVersion = request.params.newVersion;

      // Validate the version
      try {
        newVersion = validateOption('version', request.params.newVersion);
      } catch (error) {
        throw new ExportError(
          `[version] Version is incorrect: ${error.message}`,
          400
        ).setError(error);
      }

      // When a correct value found
      if (newVersion) {
        try {
          // Update version
          await updateHighchartsVersion(newVersion);
        } catch (error) {
          throw new ExportError(
            `[version] Version change: ${error.message}`,
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
        throw new ExportError('[version] No new version supplied.', 400);
      }
    } catch (error) {
      return next(error);
    }
  });
}
