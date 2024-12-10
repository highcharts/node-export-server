/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { extractVersion, extractModuleName } from '../../lib/cache';

describe('extractVersion', () => {
  it('should extract the Highcharts version correctly', () => {
    const cache = { sources: '/* Highcharts 9.3.2 */' };

    const version = extractVersion(cache.sources);
    expect(version).toBe('Highcharts 9.3.2');
  });
});

describe('extractModuleName', () => {
  it('should extract the module name from a given script path', () => {
    const paths = [
      { input: 'modules/exporting', expected: 'exporting' },
      { input: 'maps/modules/map', expected: 'map' }
    ];

    paths.forEach(({ input, expected }) => {
      expect(extractModuleName(input)).toBe(expected);
    });
  });
});
