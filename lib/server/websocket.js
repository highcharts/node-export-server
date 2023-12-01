/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/
import WebSocket from 'ws';

import { log } from '../../lib/logger.js';

let webSocket;

export default {
  /**
   * Connects to WebSocket on provided url.
   *
   * @param {string} webSocketUrl - The WebSocket server's url.
   */
  connect: (webSocketUrl) => {
    // Try to connect to indicated WebSocket
    webSocket = new WebSocket(webSocketUrl);

    // Open event handler with message
    webSocket.on('open', () => {
      log(3, `[websocket] Connected to WebSocket server: ${webSocketUrl}`);
    });

    // Close event handler with message and code
    webSocket.on('close', (code) => {
      log(
        3,
        `[websocket] Disconnected from WebSocket server: ${webSocketUrl} with code: ${code}`
      );
    });

    // Error event handler with error message
    webSocket.on('error', (error) => {
      log(4, `[websocket] WebSocket error occured: ${error.message}`);
    });

    // Message event handler
    webSocket.on('message', (message) => {
      log(3, `[websocket] Data received: ${message}`);
    });
  },

  /**
   * Gets the instance of the WebSocket connection.
   */
  getClient: () => webSocket
};
