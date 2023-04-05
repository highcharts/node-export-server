/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const path = require('path');

/**
 * Adds the / route for a UI when enabled for the export server
 */
module.exports = (app) =>
  !app
    ? false
    : app.get('/', (request, response) => {
        response.sendFile(path.join(global.__basedir, 'public', 'index.html'));
      });
