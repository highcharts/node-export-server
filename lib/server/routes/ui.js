/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Defines an Express route for serving the UI for the export server
 * when enabled.
 */

import { join } from 'path';

import { getOptions } from '../../config.js';
import { log } from '../../logger.js';
import { __dirname } from '../../utils.js';

/**
 * Adds the `ui` routes.
 *
 * @function uiRoutes
 *
 * @param {Express} app - The Express app instance.
 */
export default function uiRoutes(app) {
  /**
   * Adds the GET '/' - A route for a UI when enabled on the export server.
   */
  app.get(getOptions().ui.route || '/', (request, response, next) => {
    try {
      log(4, '[ui] Returning UI for the export.');

      response.sendFile(join(__dirname, 'public', 'index.html'), {
        acceptRanges: false
      });
    } catch (error) {
      return next(error);
    }
  });
}
