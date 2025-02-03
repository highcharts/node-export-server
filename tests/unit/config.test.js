/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { describe, expect, it } from '@jest/globals';

import { isAllowedConfig, mapToNewOptions } from '../../lib/config';

describe('isAllowedJSON', () => {
  it('parses valid JSON strings', () => {
    const json = '{"key":"value"}';

    expect(isAllowedConfig(json)).toEqual({ key: 'value' });
  });

  it('returns null for invalid JSON strings', () => {
    const json = '{"key":value}';

    expect(isAllowedConfig(json)).toBe(null);
  });

  it('parses JavaScript objects', () => {
    const obj = { key: 'value' };

    expect(isAllowedConfig(obj)).toEqual({ key: 'value' });
  });

  it('parses JavaScript objects with functions when the `allowFunctions` is true', () => {
    const obj = { key1: 'value', key2: function () {} };

    expect(isAllowedConfig(obj, false, true)).toEqual({
      key1: 'value',
      key2: expect.any(Function)
    });
  });

  it('returns a stringified version of a valid JSON/object when the `toString` is true', () => {
    const obj = { key: 'value' };
    const json = '{"key":"value"}';

    expect(isAllowedConfig(obj, true)).toBe(json);
    expect(isAllowedConfig(json, true)).toBe(json);
  });

  it('returns a stringified version of a valid JSON/object with functions when the `toString` and `allowFunctions` are true', () => {
    const obj = { key1: 'value', key2: function () {} };

    expect(isAllowedConfig(obj, true, true)).toBe(
      '{"key1":"value","key2":function () {}}'
    );
  });

  it('handles non-JSON strings', () => {
    const str = 'Just a string';

    expect(isAllowedConfig(str)).toBe(null);
  });

  it('handles non-object types (e.g., numbers, booleans)', () => {
    expect(isAllowedConfig(123)).toBe(null);
    expect(isAllowedConfig(true)).toBe(null);
  });

  it('correctly parses and stringifies an array when `toString` is true', () => {
    const arr = [1, 2, 3];

    expect(isAllowedConfig(arr, true)).toBe(null);
  });
});

describe('mapToNewOptions', () => {
  it('should map the old (PhantomJS) options structure to the new (Puppetter) correctly', () => {
    const oldOptions = {
      options: null,
      outfile: null,
      type: 'png',
      constr: 'chart',
      width: null,
      scale: null,
      globalOptions: null,
      allowFileResources: false,
      callback: null,
      resources: null,
      fromFile: null,
      enableServer: false,
      host: '0.0.0.0',
      port: 7801,
      rateLimit: 10,
      skipKey: null,
      skipToken: null,
      sslOnly: false,
      sslPort: 443,
      sslPath: null,
      workers: 8,
      workLimit: 40,
      logLevel: 4,
      logFile: 'highcharts-export-server.log',
      logDest: 'log',
      listenToProcessExits: true
    };

    expect(mapToNewOptions(oldOptions)).toEqual({
      export: {
        options: null,
        outfile: null,
        type: 'png',
        constr: 'chart',
        width: null,
        scale: null,
        globalOptions: null
      },
      customLogic: {
        allowFileResources: false,
        callback: null,
        resources: null,
        loadConfig: null
      },
      server: {
        enable: false,
        host: '0.0.0.0',
        port: 7801,
        rateLimiting: {
          maxRequests: 10,
          skipKey: null,
          skipToken: null
        },
        ssl: {
          force: false,
          port: 443,
          certPath: null
        }
      },
      pool: {
        maxWorkers: 8,
        workLimit: 40
      },
      logging: {
        level: 4,
        file: 'highcharts-export-server.log',
        dest: 'log'
      },
      other: {
        listenToProcessExits: true
      }
    });
  });
});
