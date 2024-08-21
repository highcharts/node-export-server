import { expect, it } from '@jest/globals';

import { validatePropOfSchema } from '../../utils/tests_utils';

const noPropertyToUndefined = (schema, property) => {
  const obj = {};
  expect(schema.parse(obj)[property]).toBe(undefined);
};

const acceptUndefined = (schema, property) => {
  const obj = { [property]: undefined };
  expect(schema.parse(obj)[property]).toBe(undefined);
};

const acceptNull = (schema, property) => {
  const obj = { [property]: null };
  expect(schema.parse(obj)[property]).toBe(null);
};

const stringNullToNull = (schema, property) => {
  const obj = { [property]: 'null' };
  expect(schema.parse(obj)[property]).toBe(null);
};

const stringUndefinedToNull = (schema, property) => {
  const obj = { [property]: 'undefined' };
  expect(schema.parse(obj)[property]).toBe(null);
};

const emptyStringToNull = (schema, property) => {
  const obj = { [property]: '' };
  expect(schema.parse(obj)[property]).toBe(null);
};

const nullThrow = (schema, property) => {
  const obj = { [property]: null };
  expect(() => schema.parse(obj)).toThrow();
};

const stringNullThrow = (schema, property) => {
  const obj = { [property]: 'null' };
  expect(() => schema.parse(obj)).toThrow();
};

const stringUndefinedThrow = (schema, property) => {
  const obj = { [property]: 'undefined' };
  expect(() => schema.parse(obj)).toThrow();
};

const emptyStringThrow = (schema, property) => {
  const obj = { [property]: '' };
  expect(() => schema.parse(obj)).toThrow();
};

export const sharedTests = (schema) => ({
  /**
   * Boolean validator
   */
  boolean: (property, strictCheck) => {
    it('should accept a boolean value', () => {
      const obj = { [property]: true };
      expect(schema.parse(obj)[property]).toBe(true);
      obj[property] = false;
      expect(schema.parse(obj)[property]).toBe(false);
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified boolean value', () => {
        const obj = { [property]: 'true' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 'false';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['boolean', 'undefined']));
    } else {
      it('should accept a stringified boolean value and transform it to a boolean', () => {
        const obj = { [property]: 'true' };
        expect(schema.parse(obj)[property]).toBe(true);
        obj[property] = 'false';
        expect(schema.parse(obj)[property]).toBe(false);
      });

      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringBoolean',
          'stringUndefined',
          'stringNull',
          'boolean',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * String validator
   */
  string: (property, strictCheck) => {
    it('should accept a string value', () => {
      const obj = { [property]: 'text' };
      expect(schema.parse(obj)[property]).toBe('text');
      obj[property] = 'some-other-text';
      expect(schema.parse(obj)[property]).toBe('some-other-text');
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it("should not accept 'false', 'undefined', 'NaN', 'null', '' values", () => {
        const obj = { [property]: 'false' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 'undefined';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 'NaN';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 'null';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'string',
          'stringBoolean',
          'stringNumber',
          'stringBigInt',
          'stringSymbol',
          'stringObject',
          'stringArray',
          'stringFunction',
          'stringOther',
          'undefined'
        ]));
    } else {
      it("should accept 'false', 'undefined', 'NaN', 'null', '' values and trasform to null", () => {
        const obj = { [property]: 'false' };
        expect(schema.parse(obj)[property]).toBe(null);
        obj[property] = 'undefined';
        expect(schema.parse(obj)[property]).toBe(null);
        obj[property] = 'NaN';
        expect(schema.parse(obj)[property]).toBe(null);
        obj[property] = 'null';
        expect(schema.parse(obj)[property]).toBe(null);
        obj[property] = '';
        expect(schema.parse(obj)[property]).toBe(null);
      });

      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'string',
          'stringBoolean',
          'stringNumber',
          'stringBigInt',
          'stringUndefined',
          'stringNull',
          'stringSymbol',
          'stringObject',
          'stringArray',
          'stringFunction',
          'stringOther',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * Enum validator
   */
  enum: (property, correctValues, incorrectValues, strictCheck) => {
    it(`should accept the following ${correctValues.join(', ')} values`, () => {
      correctValues.forEach((value) => {
        expect(schema.parse({ [property]: value })[property]).toBe(value);
      });
    });

    it(`should not accept the following ${incorrectValues.join(', ')} values`, () => {
      incorrectValues.forEach((value) => {
        expect(() => schema.parse({ [property]: value })).toThrow();
      });
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['undefined']));
    } else {
      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringUndefined',
          'stringNull',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * The object option validator
   */
  object: (property, strictCheck) => {
    it('should accept any object values', () => {
      const obj = { [property]: {} };
      expect(schema.parse(obj)[property]).toEqual({});
      obj[property] = { a: 1 };
      expect(schema.parse(obj)[property]).toEqual({ a: 1 });
      obj[property] = { a: '1', b: { c: 3 } };
      expect(schema.parse(obj)[property]).toEqual({ a: '1', b: { c: 3 } });
    });

    it('should not accept any array values', () => {
      const obj = { [property]: [] };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = [1];
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = ['a'];
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = [{ a: 1 }];
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept any other object based values', () => {
      const obj = { [property]: function () {} };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = () => {};
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = new Date();
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    it('should accept null', () => {
      acceptNull(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'undefined',
          'null',
          'object',
          'other'
        ]));
    } else {
      it("should accept a string value that starts with the '{' and ends with the '}'", () => {
        const obj = { [property]: '{}' };
        expect(schema.parse(obj)[property]).toBe('{}');
        obj[property] = '{ a: 1 }';
        expect(schema.parse(obj)[property]).toBe('{ a: 1 }');
        obj[property] = '{ a: "1", b: { c: 3 } }';
        expect(schema.parse(obj)[property]).toBe('{ a: "1", b: { c: 3 } }');
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'undefined',
          'null',
          'object',
          'other'
        ]));
    }
  },

  /**
   * Array of strings validator
   */
  stringArray: (property, values, stringArray, strictCheck) => {
    it('should accept a string value or an array of strings and correctly parse it to an array of strings', () => {
      const obj = { [property]: values };
      expect(schema.parse(obj)[property]).toEqual(stringArray);
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should accept an empty array', () => {
        const obj = { [property]: [] };
        expect(schema.parse(obj)[property]).toEqual([]);
      });

      it('should accept an array of strings and filter it from the forbidden values', () => {
        const obj = {
          [property]: [...values, 'false', 'undefined', 'NaN', 'null', '']
        };
        expect(schema.parse(obj)[property]).toEqual(stringArray);
      });

      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['undefined', 'array']));
    } else {
      it("should accept a stringified array of the 'values' string and correctly parse it to an array of strings", () => {
        const obj = { [property]: `[${values}]` };
        expect(schema.parse(obj)[property]).toEqual(stringArray);
      });

      it('should filter a stringified array of a values string from forbidden values and correctly parse it to an array of strings', () => {
        const obj = { [property]: `[${values}, false, undefined, NaN, null,]` };
        expect(schema.parse(obj)[property]).toEqual(stringArray);
      });

      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'string',
          'stringBoolean',
          'stringNumber',
          'stringBigInt',
          'stringUndefined',
          'stringNull',
          'stringSymbol',
          'stringObject',
          'stringArray',
          'stringFunction',
          'stringOther',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * Positive number validator
   */
  positiveNum: (property, strictCheck) => {
    it('should accept a positive number value', () => {
      const obj = { [property]: 0.1 };
      expect(schema.parse(obj)[property]).toBe(0.1);
      obj[property] = 100.5;
      expect(schema.parse(obj)[property]).toBe(100.5);
      obj[property] = 750;
      expect(schema.parse(obj)[property]).toBe(750);
    });

    it('should not accept negative and non-positive number value', () => {
      const obj = { [property]: 0 };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = -100;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept stringified negative and non-positive number value', () => {
      const obj = { [property]: '0' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '-100';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified positive number value', () => {
        const obj = { [property]: '0.1' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '100.5';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '750';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    } else {
      it('should accept a stringified positive number value', () => {
        const obj = { [property]: '0.1' };
        expect(schema.parse(obj)[property]).toBe(0.1);
        obj[property] = '100.5';
        expect(schema.parse(obj)[property]).toBe(100.5);
        obj[property] = '750';
        expect(schema.parse(obj)[property]).toBe(750);
      });

      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * Nullable positive number validator
   */
  nullablePositiveNum: (property, strictCheck) => {
    it('should accept a positive number value', () => {
      const obj = { [property]: 0.1 };
      expect(schema.parse(obj)[property]).toBe(0.1);
      obj[property] = 100.5;
      expect(schema.parse(obj)[property]).toBe(100.5);
      obj[property] = 750;
      expect(schema.parse(obj)[property]).toBe(750);
    });

    it('should not accept negative and non-positive number value', () => {
      const obj = { [property]: 0 };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = -100;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept stringified negative and non-positive number value', () => {
      const obj = { [property]: '0' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '-100';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    it('should accept null', () => {
      acceptNull(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified positive number value', () => {
        const obj = { [property]: '0.1' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '100.5';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '750';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    } else {
      it('should accept a stringified positive number value', () => {
        const obj = { [property]: '0.1' };
        expect(schema.parse(obj)[property]).toBe(0.1);
        obj[property] = '100.5';
        expect(schema.parse(obj)[property]).toBe(100.5);
        obj[property] = '750';
        expect(schema.parse(obj)[property]).toBe(750);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * Non-negative number validator
   */
  nonNegativeNum: (property, strictCheck) => {
    it('should accept a non-negative number value', () => {
      const obj = { [property]: 0 };
      expect(schema.parse(obj)[property]).toBe(0);
      obj[property] = 1000;
      expect(schema.parse(obj)[property]).toBe(1000);
    });

    it('should not accept a negative number value', () => {
      const obj = { [property]: -1000 };
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept a stringified negative number value', () => {
      const obj = { [property]: '-1000' };
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified non-negative number value', () => {
        const obj = { [property]: '0' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '1000';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    } else {
      it('should accept a stringified non-negative number value', () => {
        const obj = { [property]: '0' };
        expect(schema.parse(obj)[property]).toBe(0);
        obj[property] = '1000';
        expect(schema.parse(obj)[property]).toBe(1000);
      });

      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * Nullable non-negative number validator
   */
  nullableNonNegativeNum: (property, strictCheck) => {
    it('should accept a non-negative number value', () => {
      const obj = { [property]: 0 };
      expect(schema.parse(obj)[property]).toBe(0);
      obj[property] = 1000;
      expect(schema.parse(obj)[property]).toBe(1000);
    });

    it('should not accept a negative number value', () => {
      const obj = { [property]: -1000 };
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept a stringified negative number value', () => {
      const obj = { [property]: '-1000' };
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    it('should accept null', () => {
      acceptNull(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified non-negative number value', () => {
        const obj = { [property]: '0' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '1000';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    } else {
      it('should accept a stringified non-negative number value', () => {
        const obj = { [property]: '0' };
        expect(schema.parse(obj)[property]).toBe(0);
        obj[property] = '1000';
        expect(schema.parse(obj)[property]).toBe(1000);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * String that starts with validator
   */
  startsWith: (property, correctValues, incorrectValues, strictCheck) => {
    it(`should accept the following ${correctValues.join(', ')} values`, () => {
      correctValues.forEach((value) => {
        expect(schema.parse({ [property]: value })[property]).toBe(value);
      });
    });

    it(`should not accept the following ${incorrectValues.join(', ')} values`, () => {
      incorrectValues.forEach((value) => {
        expect(() => schema.parse({ [property]: value })).toThrow();
      });
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['undefined']));
    } else {
      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringUndefined',
          'stringNull',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * NUllable string that starts with validator
   */
  nullableStartsWith: (
    property,
    correctValues,
    incorrectValues,
    strictCheck
  ) => {
    it(`should accept the following ${correctValues.join(', ')} values`, () => {
      correctValues.forEach((value) => {
        expect(schema.parse({ [property]: value })[property]).toBe(value);
      });
    });

    it(`should not accept the following ${incorrectValues.join(', ')} values`, () => {
      incorrectValues.forEach((value) => {
        expect(() => schema.parse({ [property]: value })).toThrow();
      });
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    it('should accept null', () => {
      acceptNull(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['undefined', 'null']));
    } else {
      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringUndefined',
          'stringNull',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * The infile option validator
   */
  infile: (property, strictCheck) => {
    it('should accept string values that end with .json or .svg', () => {
      const obj = { [property]: 'chart.json' };
      expect(schema.parse(obj)[property]).toBe('chart.json');
      obj[property] = 'chart.svg';
      expect(schema.parse(obj)[property]).toBe('chart.svg');
    });

    it('should not accept string values that do not end with .json or .svg', () => {
      const obj = { [property]: 'chart.pdf' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 'chart.png';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept string values that are not at least one character long without the extensions', () => {
      const obj = { [property]: '.json' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '.svg';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    it('should accept null', () => {
      acceptNull(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['undefined', 'null']));
    } else {
      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringUndefined',
          'stringNull',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * The outfile option validator
   */
  outfile: (property, strictCheck) => {
    it('should accept string values that end with .jpeg, .jpg, .png, .pdf, or .svg', () => {
      const obj = { [property]: 'chart.jpeg' };
      expect(schema.parse(obj)[property]).toBe('chart.jpeg');
      obj[property] = 'chart.jpg';
      expect(schema.parse(obj)[property]).toBe('chart.jpg');
      obj[property] = 'chart.png';
      expect(schema.parse(obj)[property]).toBe('chart.png');
      obj[property] = 'chart.pdf';
      expect(schema.parse(obj)[property]).toBe('chart.pdf');
      obj[property] = 'chart.svg';
      expect(schema.parse(obj)[property]).toBe('chart.svg');
    });

    it('should not accept string values that do not end with .jpeg, .jpg, .png, .pdf, or .svg', () => {
      const obj = { [property]: 'chart.json' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 'chart.txt';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept string values that are not at least one character long without the extensions', () => {
      const obj = { [property]: '.jpeg' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '.jpg';
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '.png';
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '.pdf';
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '.svg';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    it('should accept null', () => {
      acceptNull(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['undefined', 'null']));
    } else {
      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringUndefined',
          'stringNull',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * The version option validator
   */
  version: (property, strictCheck) => {
    it("should accept the 'latest' value", () => {
      const obj = { [property]: 'latest' };
      expect(schema.parse(obj)[property]).toBe('latest');
    });

    it('should accept a value in XX, XX.YY, XX.YY.ZZ formats', () => {
      const obj = { [property]: '1' };
      expect(schema.parse(obj)[property]).toBe('1');
      obj[property] = '11';
      expect(schema.parse(obj)[property]).toBe('11');
      obj[property] = '1.1';
      expect(schema.parse(obj)[property]).toBe('1.1');
      obj[property] = '1.11';
      expect(schema.parse(obj)[property]).toBe('1.11');
      obj[property] = '11.1';
      expect(schema.parse(obj)[property]).toBe('11.1');
      obj[property] = '11.11';
      expect(schema.parse(obj)[property]).toBe('11.11');
      obj[property] = '1.1.1';
      expect(schema.parse(obj)[property]).toBe('1.1.1');
      obj[property] = '1.1.11';
      expect(schema.parse(obj)[property]).toBe('1.1.11');
      obj[property] = '1.11.1';
      expect(schema.parse(obj)[property]).toBe('1.11.1');
      obj[property] = '1.11.11';
      expect(schema.parse(obj)[property]).toBe('1.11.11');
      obj[property] = '11.1.1';
      expect(schema.parse(obj)[property]).toBe('11.1.1');
      obj[property] = '11.1.11';
      expect(schema.parse(obj)[property]).toBe('11.1.11');
      obj[property] = '11.11.1';
      expect(schema.parse(obj)[property]).toBe('11.11.1');
      obj[property] = '11.11.11';
      expect(schema.parse(obj)[property]).toBe('11.11.11');
    });

    it('should not accept other string value', () => {
      const obj = { [property]: 'string-other-than-latest' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '11a.2.0';
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '11.2.123';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['stringNumber', 'undefined']));
    } else {
      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * The scale option validator
   */
  scale: (property, strictCheck) => {
    it('should accept number values between the 0.1 and 5.0', () => {
      const obj = { [property]: 0.1 };
      expect(schema.parse(obj)[property]).toBe(0.1);
      obj[property] = 1;
      expect(schema.parse(obj)[property]).toBe(1);
      obj[property] = 1.5;
      expect(schema.parse(obj)[property]).toBe(1.5);
      obj[property] = 5;
      expect(schema.parse(obj)[property]).toBe(5);
    });

    it('should not accept number values outside the 0.1 and 5.0', () => {
      const obj = { [property]: -1.1 };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 0;
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 5.5;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept stringified number values outside the 0.1 and 5.0', () => {
      const obj = { [property]: '-1.1' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '0';
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '5.5';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should not accept stringified number values between the 0.1 and 5.0', () => {
        const obj = { [property]: '0.1' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '1';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '1.5';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '5';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['number', 'undefined']));
    } else {
      it('should accept stringified number values between the 0.1 and 5.0', () => {
        const obj = { [property]: '0.1' };
        expect(schema.parse(obj)[property]).toBe(0.1);
        obj[property] = '1';
        expect(schema.parse(obj)[property]).toBe(1);
        obj[property] = '1.5';
        expect(schema.parse(obj)[property]).toBe(1.5);
        obj[property] = '5';
        expect(schema.parse(obj)[property]).toBe(5);
      });

      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * The scale option validator
   */
  nullableScale: (property, strictCheck) => {
    it('should accept number values between the 0.1 and 5.0', () => {
      const obj = { [property]: 0.1 };
      expect(schema.parse(obj)[property]).toBe(0.1);
      obj[property] = 1;
      expect(schema.parse(obj)[property]).toBe(1);
      obj[property] = 1.5;
      expect(schema.parse(obj)[property]).toBe(1.5);
      obj[property] = 5;
      expect(schema.parse(obj)[property]).toBe(5);
    });

    it('should not accept number values outside the 0.1 and 5.0', () => {
      const obj = { [property]: -1.1 };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 0;
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 5.5;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept stringified number values outside the 0.1 and 5.0', () => {
      const obj = { [property]: '-1.1' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '0';
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '5.5';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    it('should accept null', () => {
      acceptNull(schema, property);
    });

    if (strictCheck) {
      it('should not accept stringified number values between the 0.1 and 5.0', () => {
        const obj = { [property]: '0.1' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '1';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '1.5';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '5';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'number',
          'undefined',
          'null'
        ]));
    } else {
      it('should accept stringified number values between the 0.1 and 5.0', () => {
        const obj = { [property]: '0.1' };
        expect(schema.parse(obj)[property]).toBe(0.1);
        obj[property] = '1';
        expect(schema.parse(obj)[property]).toBe(1);
        obj[property] = '1.5';
        expect(schema.parse(obj)[property]).toBe(1.5);
        obj[property] = '5';
        expect(schema.parse(obj)[property]).toBe(5);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * The logLevel option validator
   */
  logLevel: (property, strictCheck) => {
    it('should accept integer number values between the 1 and 5', () => {
      const obj = { [property]: 1 };
      expect(schema.parse(obj)[property]).toBe(1);
      obj[property] = 3;
      expect(schema.parse(obj)[property]).toBe(3);
      obj[property] = 5;
      expect(schema.parse(obj)[property]).toBe(5);
    });

    it('should not accept float number values between the 1 and 5', () => {
      const obj = { [property]: 1.1 };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 3.1;
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 4.1;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept stringified float number values between the 1 and 5', () => {
      const obj = { [property]: '1.1' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '3.1';
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '4.1';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept number values that fall outside the 1 and 5 range', () => {
      const obj = { [property]: -1.1 };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 0;
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = 6;
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept stringified number number values that fall outside the 1 and 5 range', () => {
      const obj = { [property]: '-1.1' };
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '0';
      expect(() => schema.parse(obj)).toThrow();
      obj[property] = '6';
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['number', 'undefined']));
    } else {
      it('should accept stringified number values between the 1 and 5', () => {
        const obj = { [property]: '1' };
        expect(schema.parse(obj)[property]).toBe(1);
        obj[property] = '3';
        expect(schema.parse(obj)[property]).toBe(3);
        obj[property] = '5';
        expect(schema.parse(obj)[property]).toBe(5);
      });

      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringNumber',
          'stringUndefined',
          'stringNull',
          'number',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * The resources option validator
   */
  resources: (property, strictCheck) => {
    it("should accept an object with properties 'js', 'css', and 'files'", () => {
      const obj = { [property]: { js: '', css: '', files: [] } };
      expect(schema.parse(obj)[property]).toEqual({
        js: null,
        css: null,
        files: []
      });
    });

    it("should accept an object with properties 'js', 'css', and 'files' with null values", () => {
      const obj = { [property]: { js: null, css: null, files: null } };
      expect(schema.parse(obj)[property]).toEqual({
        js: null,
        css: null,
        files: null
      });
    });

    it("should accept a partial object with some properties from the 'js', 'css', and 'files'", () => {
      const obj = { [property]: { js: 'console.log(1);' } };
      expect(schema.parse(obj)[property]).toEqual({ js: 'console.log(1);' });
    });

    it("should accept a stringified object with properties 'js', 'css', and 'files'", () => {
      const obj = { [property]: "{ js: '', css: '', files: [] }" };
      expect(schema.parse(obj)[property]).toBe(
        "{ js: '', css: '', files: [] }"
      );
    });

    it("should accept a stringified object with properties 'js', 'css', and 'files' with null values", () => {
      const obj = { [property]: '{ js: null, css: null, files: null }' };
      expect(schema.parse(obj)[property]).toBe(
        '{ js: null, css: null, files: null }'
      );
    });

    it("should accept a stringified partial object with some properties from the 'js', 'css', and 'files'", () => {
      const obj = { [property]: "{ js: 'console.log(1);' }" };
      expect(schema.parse(obj)[property]).toBe("{ js: 'console.log(1);' }");
    });

    it('should accept string values that end with .json', () => {
      const obj = { [property]: 'resources.json' };
      expect(schema.parse(obj)[property]).toBe('resources.json');
    });

    it('should not accept string values that do not end with .json', () => {
      const obj = { [property]: 'resources.js' };
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should not accept string values that are not at least one character long without the extensions', () => {
      const obj = { [property]: '.json' };
      expect(() => schema.parse(obj)).toThrow();
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    it('should accept null', () => {
      acceptNull(schema, property);
    });

    if (strictCheck) {
      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'stringObject',
          'object',
          'other',
          'undefined',
          'null'
        ]));
    } else {
      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'stringObject',
          'stringUndefined',
          'stringNull',
          'object',
          'other',
          'undefined',
          'null'
        ]));
    }
  },

  /**
   * The config object section validator
   */
  configObject: (property, config) => {
    it(`should accept an object with the ${property} properties`, () => {
      const obj = { [property]: config };
      expect(schema.parse(obj)[property]).toEqual(config);
    });

    it(`should accept an object with the ${property} properties and filter out other properties`, () => {
      const obj = { [property]: { ...config, extraProp: true } };
      expect(schema.parse(obj)[property]).toEqual({ ...config });
    });

    it(`should accept a partial object with some ${property} properties`, () => {
      for (const [key, value] of Object.entries(config)) {
        expect(
          schema.parse({ [property]: { [key]: value } })[property]
        ).toEqual({ [key]: value });
      }
      expect(
        schema.parse({ [property]: { extraProp: true } })[property]
      ).toEqual({});
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    it('should accept object with no properties and transform it to undefined', () => {
      noPropertyToUndefined(schema, property);
    });

    it('should not accept values of other types', () =>
      validatePropOfSchema(schema, property, ['undefined', 'object', 'other']));
  },

  /**
   * Array of Highcharts scripts validator
   */
  scriptsArray: (property, scripts, filteredScripts, strictCheck) => {
    it('should filter a string or an array of strings and resolve it to an array of accepted scripts', () => {
      const obj = {
        [property]: scripts
      };
      expect(schema.parse(obj)[property]).toEqual(filteredScripts);
    });

    it('should accept undefined', () => {
      acceptUndefined(schema, property);
    });

    if (strictCheck) {
      it('should accept an empty array and transform it to an empty array', () => {
        const obj = {
          [property]: []
        };
        expect(schema.parse(obj)[property]).toEqual([]);
      });

      it('should not accept null', () => {
        nullThrow(schema, property);
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(schema, property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(schema, property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['undefined', 'array']));
    } else {
      it("should filter a string value from '[' and ']' and resolve it to arrays of accepted scripts", () => {
        const obj = {
          [property]: `[${scripts}]`
        };
        expect(schema.parse(obj)[property]).toEqual(filteredScripts);
      });

      it('should accept null', () => {
        acceptNull(schema, property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(schema, property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(schema, property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(schema, property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'emptyString',
          'string',
          'stringBoolean',
          'stringNumber',
          'stringBigInt',
          'stringUndefined',
          'stringNull',
          'stringSymbol',
          'stringObject',
          'stringArray',
          'stringFunction',
          'stringOther',
          'undefined',
          'null'
        ]));
    }
  }
});
