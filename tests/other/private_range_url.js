/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2023, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import 'colors';

import { isPrivateRangeUrlFound } from '../../lib/utils.js';

// Test message
console.log(
  'The isPrivateRangeUrlFound utility test'.yellow,
  `\nIt checks multiple IPs and find which are public and private.\n`.green
);

// IP adresses to test
const ipAddresses = [
  // The localhost
  'localhost',
  '127.0.0.1',
  // Private range (10.0.0.0/8)
  '10.151.223.167',
  '10.190.93.233',
  // Private range (172.0.0.0/12)
  '172.22.34.250',
  '172.27.95.8',
  // Private range (192.168.0.0/16)
  '192.168.218.176',
  '192.168.231.157',
  // Public range
  '53.96.110.150',
  '155.212.200.223'
];

// Test ips in different configurations, with or without a protocol prefix
['', 'http://', 'https://'].forEach((protocol) => {
  if (protocol) {
    console.log(`\n${protocol}`.blue.underline);
  }

  ipAddresses.forEach((ip) => {
    const url = `${protocol}${ip}`;
    console.log(
      `${url} - ` +
        (isPrivateRangeUrlFound(`xlink:href="${url}"`)
          ? 'private IP'.red
          : 'public IP'.green)
    );
  });
});
