/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import WebSocket from 'ws';

import { envs } from '../envs.js';
import { log } from '../logger.js';

// WebSocket clients map
const webSocketClients = new Map();

/**
 * Init WebSocket client and connection options
 */
function init() {
  if (envs.WEB_SOCKET_ENABLE === true) {
    // Options for the WebSocket connection
    const connectionOptions = {
      rejectUnauthorized: envs.WEB_SOCKET_REJECT_UNAUTHORIZED,
      headers: {
        // Set an access token that lasts only 5 minutes
        auth: jwt.sign({ success: 'success' }, envs.WEB_SOCKET_SECRET, {
          algorithm: 'HS256',
          expiresIn: '5m'
        })
      }
    };

    // Options for the WebSocket client
    const clientOptions = {
      id: uuid(),
      reconnect: false,
      reconnectTry: 0,
      reconnectInterval: null,
      pingTimeout: null
    };

    // Start the WebSocket connection
    connect(envs.WEB_SOCKET_URL, connectionOptions, clientOptions);
  }
}

/**
 * Creates WebSocket client and connects to WebSocket server on a provided url.
 *
 * @param {string} webSocketUrl - The WebSocket server's URL.
 * @param {object} connectionOptions - Options for WebSocket connection.
 * @param {object} clientOptions - Options for WebSocket client.
 */
function connect(webSocketUrl, connectionOptions, clientOptions) {
  // Try to connect to indicated WebSocket server
  let webSocketClient = new WebSocket(webSocketUrl, connectionOptions);

  // Open event
  webSocketClient.on('open', () => {
    // Not need for the reconnect interval anymore
    clearInterval(clientOptions.reconnectInterval);

    // Save the client under its id
    webSocketClients.set(clientOptions.id, webSocketClient);

    // Log a success message
    log(
      3,
      `[websocket] WebSocket: ${clientOptions.id} - connected to server: ${webSocketUrl}.`
    );
  });

  // Close event where ping timeout is cleared
  webSocketClient.on('close', (code) => {
    log(
      3,
      '[websocket]',
      `WebSocket: ${clientOptions.id} - disconnected from server: ${webSocketUrl} with code: ${code}.`
    );

    // Stop the heartbeat mechanism
    clearTimeout(clientOptions.pingTimeout);

    // Removed client if exists
    webSocketClients.delete(clientOptions.id);
    webSocketClient = null;

    // Try to reconnect only when enabled and if not already attempting to do so
    if (clientOptions.reconnect && !clientOptions.reconnectInterval) {
      reconnect(webSocketUrl, connectionOptions, clientOptions);
    }
  });

  // Error event
  webSocketClient.on('error', (error) => {
    log(1, `[websocket] WebSocket: ${clientOptions.id} - error occured.`);

    // Block the reconnect mechanism when getting 403
    if (error.message.includes('403')) {
      clientOptions.reconnect = false;
      clientOptions.reconnectTry = envs.WEB_SOCKET_RECONNECT_ATTEMPTS;
    } else {
      // Or set the option accordingly
      clientOptions.reconnect = envs.WEB_SOCKET_RECONNECT;
    }
  });

  // Message event
  webSocketClient.on('message', (message) => {
    log(
      3,
      `[websocket] WebSocket: ${clientOptions.id} - data received: ${message}`
    );
  });

  // The 'ping' event from a WebSocket connection with the health check
  // and termination logic
  webSocketClient.on('ping', () => {
    log(
      3,
      `[websocket] WebSocket: ${clientOptions.id} - received PING from server: ${webSocketUrl}.`
    );
    clearTimeout(clientOptions.pingTimeout);
    clientOptions.pingTimeout = setTimeout(() => {
      // Terminate the client connection
      webSocketClient.terminate();

      // Try to reconnect if required
      if (clientOptions.reconnect) {
        reconnect(webSocketUrl, connectionOptions, clientOptions);
      }
    }, envs.WEB_SOCKET_PING_TIMEOUT);
  });
}

/**
 * Reconnects to WebSocket server on a provided url.
 *
 * @param {string} webSocketUrl - The WebSocket server's URL.
 * @param {object} connectionOptions - Options for WebSocket connection.
 * @param {object} clientOptions - Options for WebSocket client.
 */
function reconnect(webSocketUrl, connectionOptions, clientOptions) {
  // Start the reconnect interval
  clientOptions.reconnectInterval = setInterval(() => {
    if (clientOptions.reconnectTry < envs.WEB_SOCKET_RECONNECT_ATTEMPTS) {
      log(
        3,
        `[websocket] WebSocket: ${clientOptions.id} - Attempt ${++clientOptions.reconnectTry} of ${envs.WEB_SOCKET_RECONNECT_ATTEMPTS} to reconnect to server: ${webSocketUrl}.`
      );

      connect(webSocketUrl, connectionOptions, clientOptions);
    } else {
      clientOptions.reconnect = false;
      clearInterval(clientOptions.reconnectInterval);
      log(
        2,
        `[websocket] WebSocket: ${clientOptions.id} - Could not reconnect to server: ${webSocketUrl}.`
      );
    }
  }, envs.WEB_SOCKET_RECONNECT_INTERVAL);
}

/**
 * Gets map of current WebSocket clients.
 *
 * @param {string} id - The uuid of WebSocket client.
 */
export function getClients(id) {
  return id ? webSocketClients.get(id) : webSocketClients;
}

export default {
  init,
  connect,
  getClients
};
