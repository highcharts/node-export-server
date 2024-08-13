import { describe, expect, it } from '@jest/globals';

describe('Simple Variable Comparison', () => {
  it('should compare two variables for equality', () => {
    const variable1 = 42;
    const variable2 = 42;

    expect(variable1).toBe(variable2);
  });
});
