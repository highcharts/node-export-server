/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { join } from 'path';

import { __dirname } from '../../utils.js';

/**
 * Adds the GET / route for a UI when enabled on the export server.
 */
export default (app) =>
  !app
    ? false
    : app.get('/', (request, response) => {
        response.sendFile(join(__dirname, 'public', 'index.html'));
      });
