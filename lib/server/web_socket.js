/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/
import WebSocket from 'ws';

import { envs } from '../envs.js';
import { log, logWithStack } from '../logger.js';

// WebSocket client
let webSocketClient;

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
  webSocketClient = new WebSocket(webSocketUrl, options);

  // Open event
  webSocketClient.on('open', () => {
    log(3, `[websocket] Connected to WebSocket server: ${webSocketUrl}`);
    clearInterval(reconnectInterval);
  });

  // Close event where ping timeout is cleared
  webSocketClient.on('close', (code) => {
    log(
      3,
      '[websocket]',
      `Disconnected from WebSocket server: ${webSocketUrl} with code: ${code}`
    );
    clearTimeout(webSocketClient._pingTimeout);
    webSocketClient = null;
  });

  // Error event
  webSocketClient.on('error', (error) => {
    logWithStack(1, error, `[websocket] WebSocket error occured.`);
  });

  // Message event
  webSocketClient.on('message', (message) => {
    log(3, `[websocket] Data received: ${message}`);
  });

  // The 'ping' event from a WebSocket connection with the health check
  // and termination logic
  webSocketClient.on('ping', () => {
    log(3, '[websocket] PING');
    clearTimeout(webSocketClient._pingTimeout);
    webSocketClient._pingTimeout = setTimeout(() => {
      // Terminate the client connection
      webSocketClient.terminate();

      // Try to reconnect if required
      if (envs.WEB_SOCKET_RECONNECT === true) {
        reconnect(webSocketUrl, options);
      }
    }, envs.WEB_SOCKET_PING_TIMEOUT);
  });
}

/**
 * Reconnects to WebSocket on a provided url.
 *
 * @param {string} webSocketUrl - The WebSocket server's URL.
 * @param {object} options - Options for WebSocket connection.
 */
function reconnect(webSocketUrl, options) {
  // The reconnect attempt counter
  let reconnectTry = 0;

  // Start the reconnect interval
  reconnectInterval = setInterval(() => {
    if (reconnectTry < envs.WEB_SOCKET_RECONNECT_ATTEMPTS) {
      try {
        if (webSocketClient === null) {
          connect(webSocketUrl, options);
        }
      } catch (error) {
        reconnectTry++;
        log(
          2,
          `[websocket] Attempt ${reconnectTry} of ${envs.WEB_SOCKET_RECONNECT_ATTEMPTS} to reconnect to the WebSocket at ${webSocketUrl} failed.`
        );
      }
    } else {
      clearInterval(reconnectInterval);
      log(
        2,
        `[websocket] Could not reconnect to the WebSocket at ${webSocketUrl}.`
      );
    }
  }, envs.WEB_SOCKET_RECONNECT_INTERVAL);
}

/**
 * Gets the instance of the WebSocket connection.
 */
export function getClient() {
  return webSocketClient;
}

export default {
  connect,
  getClient
};
