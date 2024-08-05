import { describe, expect, it } from '@jest/globals';

import {
  excludeFromValues,
  possibleValues,
  validateOtherTypes
} from '../../utils/tests_utils.js';
import { v } from '../../../lib/envs.js';

/**
 * Boolean validator
 */
describe('The boolean custom validator', () => {
  describe('when the envsCheck is false', () => {
    it("should not accept 'true', 'false', or '' values", () => {
      // The 'true', 'false', and '' should fail
      expect(() => v.boolean().parse('true')).toThrow();
      expect(() => v.boolean().parse('false')).toThrow();
      expect(() => v.boolean().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it("should accept 'true', 'false', and '' values and transform them to boolean values", () => {
      // The 'true', 'false', and '' should pass
      expect(v.boolean(true).parse('true')).toBe(true);
      expect(v.boolean(true).parse('false')).toBe(false);
      expect(v.boolean(true).parse('')).toBe(false);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept true and false values', () => {
      // The true and false should pass
      expect(v.boolean().parse(true)).toBe(true);
      expect(v.boolean().parse(false)).toBe(false);
      expect(v.boolean(true).parse(true)).toBe(true);
      expect(v.boolean(true).parse(false)).toBe(false);
    });

    it('should not accept values of any other types', () => {
      // Filter the possibleValue object to exclude boolean like values
      validateOtherTypes(v.boolean, ['boolean', 'stringBoolean']);
    });
  });
});

/**
 * Enum validator
 */
describe('The enum custom validator', () => {
  // Accepted values for the enum validator
  const enumValues = ['enum1', 'enum2', 'enum3'];

  describe('when the envsCheck is false', () => {
    it('should not accept an empty string value', () => {
      // The '' should fail
      expect(() => v.enum(enumValues).parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty string value and transform it to null', () => {
      // The '' should pass and transform to null
      expect(v.enum(enumValues, true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept values specified in the enumValues array', () => {
      // The 'enum1', 'enum2', and 'enum3' should pass
      expect(v.enum(enumValues).parse('enum1')).toBe('enum1');
      expect(v.enum(enumValues).parse('enum2')).toBe('enum2');
      expect(v.enum(enumValues).parse('enum3')).toBe('enum3');
      expect(v.enum(enumValues, true).parse('enum1')).toBe('enum1');
      expect(v.enum(enumValues, true).parse('enum2')).toBe('enum2');
      expect(v.enum(enumValues, true).parse('enum3')).toBe('enum3');
    });

    it('should not accept values not specified in the enumValues array', () => {
      // The 'enum4' and 'enum5' should fail
      expect(() => v.enum(enumValues).parse('enum4')).toThrow();
      expect(() => v.enum(enumValues).parse('enum5')).toThrow();
      expect(() => v.enum(enumValues, true).parse('enum4')).toThrow();
      expect(() => v.enum(enumValues, true).parse('enum5')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Get all the possibleValue object's properties values
      validateOtherTypes(v.enum, [], enumValues);
    });
  });
});

/**
 * String validator
 */
describe('The string custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should accept an empty string value', () => {
      // The '' should pass and return ''
      expect(v.string().parse('')).toBe('');
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty string value and transform it to null', () => {
      // The '' should pass and transform to null
      expect(v.string(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept string values', () => {
      // The 'string1' and `string${2}` should pass
      expect(v.string().parse('string1')).toBe('string1');
      expect(v.string().parse(`string${2}`)).toBe('string2');
      expect(v.string(true).parse('string1')).toBe('string1');
      expect(v.string(true).parse(`string${2}`)).toBe('string2');
    });

    it('should accept values of any other types and parse them to string', () => {
      // Get all the possibleValue object's properties values
      const otherValues = excludeFromValues(possibleValues);

      // All other values should pass
      otherValues.forEach((value) => {
        expect(() => v.string().parse(value)).not.toThrow();
        expect(() => v.string(true).parse(value)).not.toThrow();
      });
    });
  });
});

/**
 * Strict string validator
 */
describe('The strictString custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should accept an empty string value', () => {
      // The '' should pass and return ''
      expect(v.strictString().parse('')).toBe('');
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty string value and transform it to null', () => {
      // The '' should pass and transform to null
      expect(v.strictString(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept string values', () => {
      // The 'string1' and `string${2}` should pass
      expect(v.strictString().parse('string1')).toBe('string1');
      expect(v.strictString().parse(`string${2}`)).toBe('string2');
      expect(v.strictString(true).parse('string1')).toBe('string1');
      expect(v.strictString(true).parse(`string${2}`)).toBe('string2');
    });

    it('should not accept stringified nullish values', () => {
      // The `envsCheck` set to false should fail for all below
      expect(() => v.strictString().parse('false')).toThrow();
      expect(() => v.strictString().parse('undefined')).toThrow();
      expect(() => v.strictString().parse('void 0')).toThrow();
      expect(() => v.strictString().parse('null')).toThrow();
      expect(() => v.strictString().parse('NaN')).toThrow();

      // The `envsCheck` set to true should fail for all below
      expect(() => v.strictString(true).parse('false')).toThrow();
      expect(() => v.strictString(true).parse('undefined')).toThrow();
      expect(() => v.strictString(true).parse('void 0')).toThrow();
      expect(() => v.strictString(true).parse('null')).toThrow();
      expect(() => v.strictString(true).parse('NaN')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Filter the possibleValue object to exclude string like values
      validateOtherTypes(v.strictString, [
        'string',
        'stringBoolean',
        'stringNumber',
        'stringNullish',
        'stringSymbol',
        'stringObject'
      ]);
    });
  });
});

/**
 * Nullable strict string validator
 */
describe('The strictStringNullable custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should accept an empty string value', () => {
      // The '' should pass and return ''
      expect(v.strictStringNullable().parse('')).toBe('');
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept an empty string value and transform it to null', () => {
      // The '' should pass and transform to null
      expect(v.strictStringNullable(true).parse('')).toBe(null);
    });

    it('should accept stringified null value and transform it to null', () => {
      // The '' should pass and transform to null
      expect(v.strictStringNullable(true).parse('null')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept null value', () => {
      // The null should pass and return null
      expect(v.strictStringNullable().parse(null)).toBe(null);
    });

    it('should accept string values', () => {
      // The 'string1' and `string${2}` should pass
      expect(v.strictStringNullable().parse('string1')).toBe('string1');
      expect(v.strictStringNullable().parse(`string${2}`)).toBe('string2');
      expect(v.strictStringNullable(true).parse('string1')).toBe('string1');
      expect(v.strictStringNullable(true).parse(`string${2}`)).toBe('string2');
    });

    it('should not accept stringified nullish values', () => {
      // The `envsCheck` set to false should fail for all below
      expect(() => v.strictStringNullable().parse('false')).toThrow();
      expect(() => v.strictStringNullable().parse('undefined')).toThrow();
      expect(() => v.strictStringNullable().parse('void 0')).toThrow();
      expect(() => v.strictStringNullable().parse('NaN')).toThrow();

      // The `envsCheck` set to true should fail for all below
      expect(() => v.strictStringNullable(true).parse('false')).toThrow();
      expect(() => v.strictStringNullable(true).parse('undefined')).toThrow();
      expect(() => v.strictStringNullable(true).parse('void 0')).toThrow();
      expect(() => v.strictStringNullable(true).parse('NaN')).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Filter the possibleValue object to exclude string like values
      validateOtherTypes(v.strictStringNullable, [
        'string',
        'stringBoolean',
        'stringNumber',
        'stringNullish',
        'stringSymbol',
        'stringObject',
        'nullish'
      ]);
    });
  });
});

/**
 * String array validator
 */
describe('The stringArray custom validator', () => {
  it('should accept an array of string values', () => {
    // The [] should pass and return []
    expect(v.stringArray().parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('should accept an empty array value', () => {
    // The [] should pass and return []
    expect(v.stringArray().parse([])).toEqual([]);
  });

  it('should not accept an empty string value', () => {
    // The '' should fail
    expect(() => v.stringArray(true).parse('value')).toThrow();
  });

  it('should not accept object based values or arrays of such values (except array of strings and empty array)', () => {
    // Should fail for all below
    [
      {},
      { a: 1 },
      { a: '1' },
      [1],
      function () {},
      () => {},
      new Date(),
      new RegExp('abc'),
      new Error('')
    ].forEach((value) => {
      expect(() => v.stringArray(true).parse(value)).toThrow();
    });
  });

  it('should not accept values of any other types', () => {
    // Filter the possibleValue object to exclude string like values
    validateOtherTypes(v.stringArray, ['object']);
  });
});

/**
 * Positive number validator
 */
describe('The positiveNum custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should not accept an empty string value', () => {
      // The '' should fail
      expect(() => v.positiveNum().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept stringified positive number values', () => {
      // The '0.1' and '100' should pass
      expect(v.positiveNum(true).parse('0.1')).toBe(0.1);
      expect(v.positiveNum(true).parse('100')).toBe(100);
    });

    it('should not accept stringified negative and non-positive number values', () => {
      // The '-1' and '0' should fail
      expect(() => v.positiveNum(true).parse('-1')).toThrow();
      expect(() => v.positiveNum(true).parse('0')).toThrow();
    });

    it('should accept an empty string value and transform it to null', () => {
      // The '' should success and transform to null
      expect(v.positiveNum(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept positive number values', () => {
      // The 0.1 and 100 should pass
      expect(v.positiveNum().parse(0.1)).toBe(0.1);
      expect(v.positiveNum().parse(100)).toBe(100);
      expect(v.positiveNum(true).parse(0.1)).toBe(0.1);
      expect(v.positiveNum(true).parse(100)).toBe(100);
    });

    it('should not accept negative and non-positive number values', () => {
      // The -1 and 0 should fail
      expect(() => v.positiveNum().parse(-1)).toThrow();
      expect(() => v.positiveNum().parse(0)).toThrow();
      expect(() => v.positiveNum(true).parse(-1)).toThrow();
      expect(() => v.positiveNum(true).parse(0)).toThrow();
    });

    it('should not accept values of any other types', () => {
      // Filter the possibleValue object to exclude number like values
      validateOtherTypes(v.positiveNum, ['number', 'stringNumber']);
    });
  });
});

/**
 * Non-negative number validator
 */
describe('The nonNegativeNum custom validator', () => {
  describe('when the envsCheck is false', () => {
    it('should not accept an empty string value', () => {
      // The '' should fail
      expect(() => v.nonNegativeNum().parse('')).toThrow();
    });
  });

  describe('when the envsCheck is true', () => {
    it('should accept stringified non-negative number values', () => {
      // The '0', '0.1', and '100' should pass
      expect(v.nonNegativeNum(true).parse('0')).toBe(0);
      expect(v.nonNegativeNum(true).parse('0.1')).toBe(0.1);
      expect(v.nonNegativeNum(true).parse('100')).toBe(100);
    });

    it('should not accept stringified negative number values', () => {
      // The '-1' should fail
      expect(() => v.nonNegativeNum(true).parse('-1')).toThrow();
    });

    it('should accept an empty string value and transform it to null', () => {
      // The '' should success and transform to null
      expect(v.nonNegativeNum(true).parse('')).toBe(null);
    });
  });

  describe('regardless the envsCheck value', () => {
    it('should accept non-negative number values', () => {
      // The 0, 0.1, and 100 should pass
      expect(v.nonNegativeNum().parse(0)).toBe(0);
      expect(v.nonNegativeNum().parse(0.1)).toBe(0.1);
      expect(v.nonNegativeNum().parse(100)).toBe(100);
      expect(v.nonNegativeNum(true).parse(0)).toBe(0);
      expect(v.nonNegativeNum(true).parse(0.1)).toBe(0.1);
      expect(v.nonNegativeNum(true).parse(100)).toBe(100);
    });

    it('should not accept negative number values', () => {
      // The -1 should fail
      expect(() => v.nonNegativeNum().parse(-1)).toThrow();
      expect(() => v.nonNegativeNum(true).parse(-1)).toThrow();
    });

    it('should not accept value of any other types', () => {
      // Filter the possibleValue object to exclude number like values
      validateOtherTypes(v.nonNegativeNum, ['number', 'stringNumber']);
    });
  });
});
