/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { join } from 'path';

import { __dirname } from '../../utils.js';
/**
 * Adds the / route for a UI when enabled for the export server
 */
export default (app, route) =>
  !app
    ? false
    : app.get(route || '/', (request, response) => {
        response.sendFile(join(__dirname, 'public', 'index.html'));
      });
