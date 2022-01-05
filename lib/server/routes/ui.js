/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2021, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

const path = require('path');

module.exports = (app) => {
  if (!app) {
    return false;
  }

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../', 'public', 'index.html'));
  });
};
