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
import { getNewDate } from '../utils.js';

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
          algorithm: 'HS256'
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
      reconnectIntervalMs: webSocketOptions.reconnectInterval,
      reconnectTry: 0,
      reconnectInterval: null,
      pingTimeout: null
    };

    // Start the WebSocket connection
    connect(webSocketOptions.url, connectionOptions, clientOptions);

    // Start the WebSocket message sending interval, if enabled
    if (webSocketOptions.messageInterval > 0) {
      sendingMessageInterval(webSocketOptions);
    }
  }
}

/**
 * Sets up an interval to send messages through a WebSocket connection
 * at a specified interval.
 *
 * @param {Object} webSocketOptions - Options for the WebSocket connection.
 */
function sendingMessageInterval(webSocketOptions) {
  // Set the sending message interval
  messageInterval = setInterval(() => {
    try {
      // Get the first WebSocket client
      const webSocketClient = getClients().next().value;

      // Log info about message sending process
      log(3, `[websocket] WebSocket message sending queue.`);

      // If the client is found, open and there is data to send
      if (
        webSocketClient &&
        webSocketClient.readyState === WebSocket.OPEN &&
        Object.keys(telemetryData.optionsPerRequest).length > 0 &&
        telemetryData.numberOfRequests > 0
      ) {
        // Log info about message sending process
        log(3, `[websocket] Sending data through a WebSocket connection.`);

        // Set the dates
        const currentDate = getNewDate();
        telemetryData.lastSent = telemetryData.timeOfSent || currentDate;
        telemetryData.timeOfSent = currentDate;

        // Send through the WebSocket
        webSocketClient.send(JSON.stringify(telemetryData));

        // Clear the requests number and data before collecting a new one
        telemetryData.numberOfRequests = 0;
        telemetryData.optionsPerRequest = {};
      }
    } catch (error) {
      logWithStack(
        1,
        error,
        `[websocket] Could not send data through WebSocket.`
      );
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

    // Try to reconnect when enabled and if not already attempting to do so
    reconnect(webSocketUrl, connectionOptions, clientOptions);
  });

  // Error event
  webSocketClient.on('error', (error) => {
    logWithStack(
      1,
      error,
      `[websocket] WebSocket: ${clientOptions.id} - Error occured.`
    );

    // Block the reconnect mechanism when getting 403 or self-signed certificate
    // error code
    if (
      error.message.includes('403') ||
      error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
    ) {
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

    // Only when ping timeout is not disabled
    if (webSocketOptions.pingTimeout > 0) {
      clearTimeout(clientOptions.pingTimeout);
      clientOptions.pingTimeout = setTimeout(() => {
        // Terminate the client connection
        webSocketClient.terminate();

        // Try to reconnect when enabled and if not already attempting to do so
        reconnect(webSocketUrl, connectionOptions, clientOptions);
      }, webSocketOptions.pingTimeout);
    }
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
  if (
    clientOptions.reconnect &&
    clientOptions.reconnectIntervalMs > 0 &&
    !clientOptions.reconnectInterval
  ) {
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
