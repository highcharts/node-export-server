/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2022, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

// @format

const path = require('path');

module.exports = (app) => {
  if (!app) {
    return false;
  }

  app.get('/', (request, response) => {
    response.sendFile(path.join(__basedir, 'public', 'index.html'));
  });
};
