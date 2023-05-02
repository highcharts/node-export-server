/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { updateCache } from "../../cache.js";

/**
 * Adds a route that can be used to change the HC version on the server
  * TODO: Add auth token and connect to API
 */
export default (app) =>
  !app
    ? false
    : app.post("/change-hc-version/:newVersion", async (request, response) => {
        const newVersion = request.params.newVersion;

        if (newVersion) {
          await updateCache(newVersion);

          response.send({
            status: "OK",
          });
        } else {
          response.send({
            error: true,
            message: "No new version supplied",
          });
        }
      });
