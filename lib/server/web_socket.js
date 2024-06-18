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

import { getOptions } from '../config.js';
import { log, logWithStack } from '../logger.js';
import { telemetryData } from '../telemetry.js';
import { addTimer } from '../timers.js';

// WebSocket clients map
const webSocketClients = new Map();

// WebSocket options
let webSocketOptions;

// WebSocket message sending interval
let messageInterval = null;

/**
 * Init WebSocket client and connection options.
 *
 * @param {object} address - Object that contains, address and port of enabled
 * HTTP or HTTPS server.
 */
export function init(address) {
  webSocketOptions = getOptions().webSocket;
  if (webSocketOptions.enable === true) {
    // Options for the WebSocket connection
    const connectionOptions = {
      rejectUnauthorized: webSocketOptions.rejectUnauthorized,
      headers: {
        // Set an access token that lasts only 5 minutes
        auth: jwt.sign({ success: 'success' }, webSocketOptions.secret, {
          algorithm: 'HS256',
          expiresIn: '5m'
        }),
        // Send the server address in a custom header
        'X-Server-Address': `${address.protocol}://${
          ['::', '0.0.0.0'].includes(address.address)
            ? 'localhost'
            : address.address
        }:${address.port}`
      }
    };

    // Options for the WebSocket client
    const clientOptions = {
      id: uuid(),
      reconnect: webSocketOptions.reconnect,
      reconnectTry: 0,
      reconnectInterval: null,
      pingTimeout: null
    };

    // Start the WebSocket connection
    connect(webSocketOptions.url, connectionOptions, clientOptions);

    // Start the WebSocket message sending interval
    sendingMessageInterval(webSocketOptions);
  }
}

function sendingMessageInterval(webSocketOptions) {
  // Set the sending message interval
  messageInterval = setInterval(() => {
    try {
      // Get the first WebSocket client
      const webSocketClient = getClients().next().value;
      // If the client is found, open and there is data to send
      if (
        webSocketClient &&
        webSocketClient.readyState === WebSocket.OPEN &&
        Object.keys(telemetryData).length > 1 &&
        telemetryData.numberOfRequests > 0
      ) {
        // Send through the WebSocket
        webSocketClient.send(JSON.stringify(telemetryData));
      }
    } catch (error) {
      logWithStack(1, `[websocket] Could not send data through WebSocket.`);
    }
  }, webSocketOptions.messageInterval);

  // Register interval for the later clearing
  addTimer(messageInterval);
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
      `[websocket] WebSocket: ${clientOptions.id} - Connected to server: ${webSocketUrl}.`
    );
  });

  // Close event where ping timeout is cleared
  webSocketClient.on('close', (code) => {
    log(
      3,
      '[websocket]',
      `WebSocket: ${clientOptions.id} - Disconnected from server: ${webSocketUrl} with code: ${code}.`
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
    logWithStack(
      1,
      error,
      `[websocket] WebSocket: ${clientOptions.id} - Error occured.`
    );

    // Block the reconnect mechanism when getting 403
    if (error.message.includes('403')) {
      clientOptions.reconnect = false;
      clientOptions.reconnectTry = webSocketOptions.reconnectAttempts;
    } else {
      // Or set the option accordingly
      clientOptions.reconnect = webSocketOptions.reconnect;
    }
  });

  // Message event
  webSocketClient.on('message', (message) => {
    log(
      3,
      `[websocket] WebSocket: ${clientOptions.id} - Data received: ${message}`
    );
  });

  // The 'ping' event from a WebSocket connection with the health check
  // and termination logic
  webSocketClient.on('ping', () => {
    log(
      3,
      `[websocket] WebSocket: ${clientOptions.id} - Received PING from server: ${webSocketUrl}.`
    );
    clearTimeout(clientOptions.pingTimeout);
    clientOptions.pingTimeout = setTimeout(() => {
      // Terminate the client connection
      webSocketClient.terminate();

      // Try to reconnect if required
      if (clientOptions.reconnect) {
        reconnect(webSocketUrl, connectionOptions, clientOptions);
      }
    }, webSocketOptions.pingTimeout);
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
    if (clientOptions.reconnectTry < webSocketOptions.reconnectAttempts) {
      log(
        3,
        `[websocket] WebSocket: ${clientOptions.id} - Attempt ${++clientOptions.reconnectTry} of ${webSocketOptions.reconnectAttempts} to reconnect to server: ${webSocketUrl}.`
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
  }, webSocketOptions.reconnectInterval);

  // Register interval for the later clearing
  addTimer(clientOptions.reconnectInterval);
}

/**
 * Gets map of current WebSocket clients.
 *
 * @param {string} id - The uuid of WebSocket client.
 */
export function getClients(id) {
  return id ? webSocketClients.get(id) : webSocketClients.values();
}

/**
 * Terminates all WebSocket clients and clear the webSocketClients map.
 */
export function terminateClients() {
  for (const client of webSocketClients.values()) {
    client.terminate();
  }
  webSocketClients.clear();
}

export default {
  init,
  connect,
  getClients
};
