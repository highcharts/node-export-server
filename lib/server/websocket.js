/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/
import WebSocket from 'ws';

import { log } from '../logger.js';
import { envConfig } from '../envConfig.js';

// WebSocket client
let webSocket;

// In case of closing or termination of a client connection
let reconnectInterval;

/**
 * Connects to WebSocket on a provided url.
 *
 * @param {string} webSocketUrl - The WebSocket server's URL.
 * @param {object} options - Options for WebSocket connection.
 */
function connect(webSocketUrl, options) {
  // Try to connect to indicated WebSocket server
  webSocket = new WebSocket(webSocketUrl, options);

  // Open event
  webSocket.on('open', () => {
    log(3, `[websocket] Connected to WebSocket server: ${webSocketUrl}`);
    clearInterval(reconnectInterval);
  });

  // Close event where ping timeout is cleared
  webSocket.on('close', (code) => {
    log(
      3,
      '[websocket]',
      `Disconnected from WebSocket server: ${webSocketUrl} with code: ${code}`
    );
    clearTimeout(webSocket._pingTimeout);
    webSocket = null;
  });

  // Error event
  webSocket.on('error', (error) => {
    log(1, `[websocket] WebSocket error occured: ${error.message}`);
  });

  // Message event
  webSocket.on('message', (message) => {
    log(3, `[websocket] Data received: ${message}`);
  });

  // Ping event with the connection health check and termination logic
  webSocket.on('ping', () => {
    log(3, '[websocket] PING');
    clearTimeout(webSocket._pingTimeout);
    webSocket._pingTimeout = setTimeout(() => {
      // Terminate the client connection
      webSocket.terminate();

      // Try to reconnect if required
      if (envConfig.WS_RECONNECT === true) {
        reconnect(webSocketUrl, options);
      }
    }, envConfig.WS_PING_TIMEOUT);
  });
}

/**
 * Re-connects to WebSocket on a provided url.
 *
 * @param {string} webSocketUrl - The WebSocket server's URL.
 * @param {object} options - Options for WebSocket connection.
 */
function reconnect(webSocketUrl, options) {
  reconnectInterval = setInterval(() => {
    if (webSocket === null) {
      connect(webSocketUrl, options);
    }
  }, envConfig.WS_RECONNECT_INTERVAL);
}

/**
 * Gets the instance of the WebSocket connection.
 */
function getClient() {
  return webSocket;
}

export default {
  connect,
  getClient
};
