/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { describe, expect, it } from '@jest/globals';

describe('Simple Variable Comparison', () => {
  it('should compare two variables for equality', () => {
    const variable1 = 42;
    const variable2 = 42;

    expect(variable1).toBe(variable2);
  });
});
