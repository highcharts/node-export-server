/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

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
import { __dirname } from '../../utils.js';

/**
 * Adds the GET / route for a UI when enabled on the export server.
 *
 * @function uiRoute
 *
 * @param {Express} app - The Express app instance.
 */
export default function uiRoute(app) {
  return !app
    ? false
    : app.get(getOptions().ui.route || '/', (_request, response) => {
        response.sendFile(join(__dirname, 'public', 'index.html'), {
          acceptRanges: false
        });
      });
}
