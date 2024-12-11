/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

import { describe, expect, it } from '@jest/globals';

import { validatePropOfSchema } from '../../utils/testUtils.js';

/**
 * Runs a series of tests to validate and parse configuration properties using
 * the injected schema. Optionally performs strict checks.
 *
 * @param {Object} schema - The schema used for validation and parsing.
 * @param {boolean} strictCheck - A flag indicating whether to enforce strict
 * validation.
 */
export function configTests(schema, strictCheck) {
  /**
   * Verifies that a property with the value undefined is accepted.
   *
   * @function acceptUndefined
   *
   * @param {string} property - The property to check for accepting null.
   *
   * @throws {Error} Throws an `Error` if the schema validation fails.
   */
  const acceptUndefined = (property) => {
    const obj = { [property]: undefined };
    expect(schema.parse(obj)[property]).toBe(undefined);
  };

  /**
   * Verifies that a property with the value null is accepted.
   *
   * @function acceptNull
   *
   * @param {string} property - The property to check for accepting null.
   *
   * @throws {Error} Throws an `Error` if the schema validation fails.
   */
  const acceptNull = (property) => {
    const obj = { [property]: null };
    expect(schema.parse(obj)[property]).toBe(null);
  };

  /**
   * Verifies that a property with the string value 'null' is converted to null.
   *
   * @function stringNullToNull
   *
   * @param {string} property - The property to check for conversion of 'null'
   * to null.
   *
   * @throws {Error} Throws an `Error` if the schema validation fails.
   */
  const stringNullToNull = (property) => {
    const obj = { [property]: 'null' };
    expect(schema.parse(obj)[property]).toBe(null);
  };

  /**
   * Verifies that a property with the string value 'undefined' is converted to
   * null.
   *
   * @function stringUndefinedToNull
   *
   * @param {string} property - The property to check for conversion of
   * 'undefined' to null.
   *
   * @throws {Error} Throws an `Error` if the schema validation fails.
   */
  const stringUndefinedToNull = (property) => {
    const obj = { [property]: 'undefined' };
    expect(schema.parse(obj)[property]).toBe(null);
  };

  /**
   * Verifies that a property with the string value '' is converted to null.
   *
   * @function emptyStringToNull
   *
   * @param {string} property - The property to check for conversion of '' to
   * null.
   *
   * @throws {Error} Throws an `Error` if the schema validation fails.
   */
  const emptyStringToNull = (property) => {
    const obj = { [property]: '' };
    expect(schema.parse(obj)[property]).toBe(null);
  };

  /**
   * Verifies that a property set to null causes a schema validation error.
   *
   * @function nullThrow
   *
   * @param {string} property - The property to check for a thrown validation
   * error.
   *
   * @throws {Error} Throws an `Error` if the schema validation fails.
   */
  const nullThrow = (property) => {
    const obj = { [property]: null };
    expect(() => schema.parse(obj)).toThrow();
  };

  /**
   * Verifies that a property set to 'null' causes a schema validation error.
   *
   * @function stringNullThrow
   *
   * @param {string} property - The property to check for a thrown validation
   * error.
   *
   * @throws {Error} Throws an `Error` if the schema validation fails.
   */
  const stringNullThrow = (property) => {
    const obj = { [property]: 'null' };
    expect(() => schema.parse(obj)).toThrow();
  };

  /**
   * Verifies that a property set to 'undefined' causes a schema validation
   * error.
   *
   * @function stringUndefinedThrow
   *
   * @param {string} property - The property to check for a thrown validation
   * error.
   *
   * @throws {Error} Throws an `Error` if the schema validation fails.
   */
  const stringUndefinedThrow = (property) => {
    const obj = { [property]: 'undefined' };
    expect(() => schema.parse(obj)).toThrow();
  };

  /**
   * Verifies that a property set to '' causes a schema validation error.
   *
   * @function emptyStringThrow
   *
   * @param {string} property - The property to check for a thrown validation
   * error.
   *
   * @throws {Error} Throws an `Error` if the schema validation fails.
   */
  const emptyStringThrow = (property) => {
    const obj = { [property]: '' };
    expect(() => schema.parse(obj)).toThrow();
  };

  /**
   * Object that contains all tests for validating and parsing values of the
   * options config.
   */
  const validationTests = {
    /**
     * The boolean validator.
     */
    boolean(property) {
      it('should accept a boolean value', () => {
        const obj = { [property]: true };
        expect(schema.parse(obj)[property]).toBe(true);
        obj[property] = false;
        expect(schema.parse(obj)[property]).toBe(false);
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      if (strictCheck) {
        it('should not accept a stringified boolean value', () => {
          const obj = { [property]: 'true' };
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = 'false';
          expect(() => schema.parse(obj)).toThrow();
        });

        it('should not accept null', () => {
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The string validator.
     */
    string(property, strictCheck) {
      it('should accept a string value', () => {
        const obj = { [property]: 'text' };
        expect(schema.parse(obj)[property]).toBe('text');
        obj[property] = 'some-other-text';
        expect(schema.parse(obj)[property]).toBe('some-other-text');
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      if (strictCheck) {
        it("should not accept 'false', 'undefined', 'null', '' values", () => {
          const obj = { [property]: 'false' };
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = 'undefined';
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = 'null';
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = '';
          expect(() => schema.parse(obj)).toThrow();
        });

        it('should not accept null', () => {
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
        it("should accept 'false', 'undefined', 'null', '' values and trasform to null", () => {
          const obj = { [property]: 'false' };
          expect(schema.parse(obj)[property]).toBe(null);
          obj[property] = 'undefined';
          expect(schema.parse(obj)[property]).toBe(null);
          obj[property] = 'null';
          expect(schema.parse(obj)[property]).toBe(null);
          obj[property] = '';
          expect(schema.parse(obj)[property]).toBe(null);
        });

        it('should accept null', () => {
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The accept values validator.
     */
    acceptValues(property, correctValue, incorrectValue) {
      it(`should accept the following ${correctValue.join(', ')} values`, () => {
        correctValue.forEach((value) => {
          expect(schema.parse({ [property]: value })[property]).toBe(value);
        });
      });

      it(`should not accept the following ${incorrectValue.join(', ')} values`, () => {
        incorrectValue.forEach((value) => {
          expect(() => schema.parse({ [property]: value })).toThrow();
        });
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      if (strictCheck) {
        it('should not accept null', () => {
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
        });

        it('should not accept values of other types', () =>
          validatePropOfSchema(schema, property, ['undefined']));
      } else {
        it('should accept null', () => {
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The nullable accept values validator.
     */
    nullableAcceptValues(property, correctValue, incorrectValue) {
      it(`should accept the following ${correctValue.join(', ')} values`, () => {
        correctValue.forEach((value) => {
          expect(schema.parse({ [property]: value })[property]).toBe(value);
        });
      });

      it(`should not accept the following ${incorrectValue.join(', ')} values`, () => {
        incorrectValue.forEach((value) => {
          expect(() => schema.parse({ [property]: value })).toThrow();
        });
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
      });

      if (strictCheck) {
        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
        });

        it('should not accept values of other types', () =>
          validatePropOfSchema(schema, property, ['undefined', 'null']));
      } else {
        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The array of strings validator.
     */
    stringArray(property, value, correctValue, separator = ',') {
      it('should accept a string value or an array of strings and correctly parse it to an array of strings', () => {
        const obj = { [property]: value };
        expect(schema.parse(obj)[property]).toEqual(correctValue);
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      if (strictCheck) {
        it('should accept an empty array', () => {
          const obj = { [property]: [] };
          expect(schema.parse(obj)[property]).toEqual([]);
        });

        it('should accept an array of strings and filter it from the forbidden values', () => {
          const obj = {
            [property]: [...value, 'false', 'undefined', 'null', '']
          };
          expect(schema.parse(obj)[property]).toEqual(correctValue);
        });

        it('should not accept null', () => {
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
        });

        it('should not accept values of other types', () =>
          validatePropOfSchema(schema, property, ['undefined', 'array']));
      } else {
        it("should accept a stringified array of the 'values' string and correctly parse it to an array of strings", () => {
          const obj = { [property]: `[${value}]` };
          expect(schema.parse(obj)[property]).toEqual(correctValue);
        });

        it('should filter a stringified array of a values string from forbidden values and correctly parse it to an array of strings', () => {
          const obj = {
            [property]: `[${value}${separator} false${separator} undefined${separator} null${separator}]`
          };
          expect(schema.parse(obj)[property]).toEqual(correctValue);
        });

        it('should accept null', () => {
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
            'array',
            'undefined',
            'null'
          ]));
      }
    },

    /**
     * The positive number validator.
     */
    positiveNum(property) {
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
        acceptUndefined(property);
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
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The nullable positive number validator.
     */
    nullablePositiveNum(property) {
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
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
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
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The non-negative number validator.
     */
    nonNegativeNum(property) {
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
        acceptUndefined(property);
      });

      if (strictCheck) {
        it('should not accept a stringified non-negative number value', () => {
          const obj = { [property]: '0' };
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = '1000';
          expect(() => schema.parse(obj)).toThrow();
        });

        it('should not accept null', () => {
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The nullable non-negative number validator.
     */
    nullableNonNegativeNum(property) {
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
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
      });

      if (strictCheck) {
        it('should not accept a stringified non-negative number value', () => {
          const obj = { [property]: '0' };
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = '1000';
          expect(() => schema.parse(obj)).toThrow();
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The svg validator.
     */
    svg(property) {
      it('should accept a string value that starts with the <svg or <?xml', () => {
        const obj = {
          [property]: "<svg xmlns='http://www.w3.org/2000/svg'>...</svg>"
        };
        expect(schema.parse(obj)[property]).toBe(
          "<svg xmlns='http://www.w3.org/2000/svg'>...</svg>"
        );
        obj[property] =
          '<?xml version="1.0" encoding="UTF-8"?><note>...</note>';
        expect(schema.parse(obj)[property]).toBe(
          '<?xml version="1.0" encoding="UTF-8"?><note>...</note>'
        );
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      it("should accept 'false', 'undefined', 'null', '' values and trasform to null", () => {
        const obj = { [property]: 'false' };
        expect(schema.parse(obj)[property]).toBe(null);
        obj[property] = 'undefined';
        expect(schema.parse(obj)[property]).toBe(null);
        obj[property] = 'null';
        expect(schema.parse(obj)[property]).toBe(null);
        obj[property] = '';
        expect(schema.parse(obj)[property]).toBe(null);
      });

      it('should accept null', () => {
        acceptNull(property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(property);
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
    },

    /**
     * The chartConfig validator.
     */
    chartConfig(property) {
      it('should accept any object values', () => {
        const obj = { [property]: {} };
        expect(schema.parse(obj)[property]).toEqual({});
        obj[property] = { a: 1 };
        expect(schema.parse(obj)[property]).toEqual({ a: 1 });
        obj[property] = { a: '1', b: { c: 3 } };
        expect(schema.parse(obj)[property]).toEqual({ a: '1', b: { c: 3 } });
      });

      it("should accept a string value that starts with the '{' and ends with the '}'", () => {
        const obj = { [property]: '{}' };
        expect(schema.parse(obj)[property]).toBe('{}');
        obj[property] = '{ a: 1 }';
        expect(schema.parse(obj)[property]).toBe('{ a: 1 }');
        obj[property] = '{ a: "1", b: { c: 3 } }';
        expect(schema.parse(obj)[property]).toBe('{ a: "1", b: { c: 3 } }');
      });

      it('should accept a string value that starts with the <svg or <?xml', () => {
        const obj = {
          [property]: "<svg xmlns='http://www.w3.org/2000/svg'>...</svg>"
        };
        expect(schema.parse(obj)[property]).toBe(
          "<svg xmlns='http://www.w3.org/2000/svg'>...</svg>"
        );
        obj[property] =
          '<?xml version="1.0" encoding="UTF-8"?><note>...</note>';
        expect(schema.parse(obj)[property]).toBe(
          '<?xml version="1.0" encoding="UTF-8"?><note>...</note>'
        );
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
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'undefined',
          'null',
          'emptyString',
          'stringUndefined',
          'stringNull',
          'stringObject',
          'object',
          'other'
        ]));
    },

    /**
     * The additionalOptions validator.
     */
    additionalOptions(property) {
      it('should accept any object values', () => {
        const obj = { [property]: {} };
        expect(schema.parse(obj)[property]).toEqual({});
        obj[property] = { a: 1 };
        expect(schema.parse(obj)[property]).toEqual({ a: 1 });
        obj[property] = { a: '1', b: { c: 3 } };
        expect(schema.parse(obj)[property]).toEqual({ a: '1', b: { c: 3 } });
      });

      it("should accept a string value that starts with the '{' and ends with the '}'", () => {
        const obj = { [property]: '{}' };
        expect(schema.parse(obj)[property]).toBe('{}');
        obj[property] = '{ a: 1 }';
        expect(schema.parse(obj)[property]).toBe('{ a: 1 }');
        obj[property] = '{ a: "1", b: { c: 3 } }';
        expect(schema.parse(obj)[property]).toBe('{ a: "1", b: { c: 3 } }');
      });

      it('should accept string values that end with .json', () => {
        const obj = { [property]: 'options.json' };
        expect(schema.parse(obj)[property]).toBe('options.json');
      });

      it('should not accept string values that do not end with .json', () => {
        const obj = { [property]: 'options.pdf' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 'options.png';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept string values that are not at least one character long without the extensions', () => {
        const obj = { [property]: '.json' };
        expect(() => schema.parse(obj)).toThrow();
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
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
      });

      it('should accept a stringified undefined and transform it to null', () => {
        stringUndefinedToNull(property);
      });

      it('should accept a stringified null and transform it to null', () => {
        stringNullToNull(property);
      });

      it('should accept an empty string and transform it to null', () => {
        emptyStringToNull(property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'undefined',
          'null',
          'emptyString',
          'stringUndefined',
          'stringNull',
          'stringObject',
          'object',
          'other'
        ]));
    },

    /**
     * The infile option validator.
     */
    infile(property) {
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
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
      });

      if (strictCheck) {
        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
        });

        it('should not accept values of other types', () =>
          validatePropOfSchema(schema, property, ['undefined', 'null']));
      } else {
        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The outfile option validator.
     */
    outfile(property) {
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
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
      });

      if (strictCheck) {
        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
        });

        it('should not accept values of other types', () =>
          validatePropOfSchema(schema, property, ['undefined', 'null']));
      } else {
        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The version option validator.
     */
    version(property) {
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
        acceptUndefined(property);
      });

      if (strictCheck) {
        it('should not accept null', () => {
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
        });

        it('should not accept values of other types', () =>
          validatePropOfSchema(schema, property, [
            'stringNumber',
            'undefined'
          ]));
      } else {
        it('should accept null', () => {
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The scale option validator.
     */
    scale(property) {
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
        acceptUndefined(property);
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
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The nullable scale option validator.
     */
    nullableScale(property) {
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
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
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
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The logLevel option validator.
     */
    logLevel(property) {
      it('should accept integer number values between the 0 and 5', () => {
        const obj = { [property]: 0 };
        expect(schema.parse(obj)[property]).toBe(0);
        obj[property] = 1;
        expect(schema.parse(obj)[property]).toBe(1);
        obj[property] = 3;
        expect(schema.parse(obj)[property]).toBe(3);
        obj[property] = 5;
        expect(schema.parse(obj)[property]).toBe(5);
      });

      it('should not accept float number values between the 0 and 5', () => {
        const obj = { [property]: 0.1 };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 1.1;
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 3.1;
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 4.1;
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept stringified float number values between the 0 and 5', () => {
        const obj = { [property]: '0.1' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '1.1';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '3.1';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '4.1';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept number values that fall outside the 0 and 5 range', () => {
        const obj = { [property]: -1.1 };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 6;
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept stringified number number values that fall outside the 0 and 5 range', () => {
        const obj = { [property]: '-1.1' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '6';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      if (strictCheck) {
        it('should not accept null', () => {
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
        });

        it('should not accept values of other types', () =>
          validatePropOfSchema(schema, property, ['number', 'undefined']));
      } else {
        it('should accept stringified number values between the 0 and 5', () => {
          const obj = { [property]: '0' };
          expect(schema.parse(obj)[property]).toBe(0);
          obj[property] = '1';
          expect(schema.parse(obj)[property]).toBe(1);
          obj[property] = '3';
          expect(schema.parse(obj)[property]).toBe(3);
          obj[property] = '5';
          expect(schema.parse(obj)[property]).toBe(5);
        });

        it('should accept null', () => {
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The logFile option validator.
     */
    logFile(property, strictCheck) {
      it('should accept a string value that ends with the .log extension and is at least one character long without the extension', () => {
        const obj = { [property]: 'text.log' };
        expect(schema.parse(obj)[property]).toBe('text.log');
        obj[property] = 't.log';
        expect(schema.parse(obj)[property]).toBe('t.log');
      });

      it('should not accept a string value that does not end with the .log extension or is not at least one character long without the extension', () => {
        const obj = { [property]: 'text' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '.log';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      if (strictCheck) {
        it("should not accept 'false', 'undefined', 'null', '' values", () => {
          const obj = { [property]: 'false' };
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = 'undefined';
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = 'null';
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = '';
          expect(() => schema.parse(obj)).toThrow();
        });

        it('should not accept null', () => {
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
        it("should accept 'false', 'undefined', 'null', '' values and trasform to null", () => {
          const obj = { [property]: 'false' };
          expect(schema.parse(obj)[property]).toBe(null);
          obj[property] = 'undefined';
          expect(schema.parse(obj)[property]).toBe(null);
          obj[property] = 'null';
          expect(schema.parse(obj)[property]).toBe(null);
          obj[property] = '';
          expect(schema.parse(obj)[property]).toBe(null);
        });

        it('should accept null', () => {
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The resources option validator.
     */
    resources(property) {
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
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
      });

      if (strictCheck) {
        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The createConfig/loadConfig options validator.
     */
    customConfig(property, strictCheck) {
      it('should accept a string value that ends with the .json extension and is at least one character long without the extension', () => {
        const obj = { [property]: 'text.json' };
        expect(schema.parse(obj)[property]).toBe('text.json');
        obj[property] = 't.json';
        expect(schema.parse(obj)[property]).toBe('t.json');
      });

      it('should not accept a string value that does not end with the .json extension or is not at least one character long without the extension', () => {
        const obj = { [property]: 'text' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '.json';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      if (strictCheck) {
        it("should not accept 'false', 'undefined', 'null', '' values", () => {
          const obj = { [property]: 'false' };
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = 'undefined';
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = 'null';
          expect(() => schema.parse(obj)).toThrow();
          obj[property] = '';
          expect(() => schema.parse(obj)).toThrow();
        });

        it('should not accept null', () => {
          nullThrow(property);
        });

        it('should not accept a stringified undefined', () => {
          stringUndefinedThrow(property);
        });

        it('should not accept a stringified null', () => {
          stringNullThrow(property);
        });

        it('should not accept an empty string', () => {
          emptyStringThrow(property);
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
        it("should accept 'false', 'undefined', 'null', '' values and trasform to null", () => {
          const obj = { [property]: 'false' };
          expect(schema.parse(obj)[property]).toBe(null);
          obj[property] = 'undefined';
          expect(schema.parse(obj)[property]).toBe(null);
          obj[property] = 'null';
          expect(schema.parse(obj)[property]).toBe(null);
          obj[property] = '';
          expect(schema.parse(obj)[property]).toBe(null);
        });

        it('should accept null', () => {
          acceptNull(property);
        });

        it('should accept a stringified undefined and transform it to null', () => {
          stringUndefinedToNull(property);
        });

        it('should accept a stringified null and transform it to null', () => {
          stringNullToNull(property);
        });

        it('should accept an empty string and transform it to null', () => {
          emptyStringToNull(property);
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
     * The config object validator.
     */
    configObject(property, value) {
      it(`should accept an object with the ${property} properties`, () => {
        const obj = { [property]: value };
        expect(schema.parse(obj)[property]).toEqual(value);
      });

      it(`should accept an object with the ${property} properties and filter out other properties`, () => {
        const obj = { [property]: { ...value, extraProp: true } };
        expect(schema.parse(obj)[property]).toEqual({ ...value });
      });

      it(`should accept a partial object with some ${property} properties`, () => {
        for (const [key, val] of Object.entries(value)) {
          expect(
            schema.parse({ [property]: { [key]: val } })[property]
          ).toEqual({ [key]: val });
        }
        expect(
          schema.parse({ [property]: { extraProp: true } })[property]
        ).toEqual({});
      });

      it('should accept object with no properties and transform it to undefined', () => {
        const obj = {};
        expect(schema.parse(obj)[property]).toBe(undefined);
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, [
          'undefined',
          'object',
          'other'
        ]));
    },

    /**
     * The requestId validator.
     */
    requestId(property) {
      it('should accept a correct UUID string value', () => {
        const obj = { [property]: 'b012bde4-8b91-4d68-8b48-cd099358a17f' };
        expect(schema.parse(obj)[property]).toBe(
          'b012bde4-8b91-4d68-8b48-cd099358a17f'
        );
        obj[property] = '0694de13-ac56-44f9-813c-1c91674e6a19';
        expect(schema.parse(obj)[property]).toBe(
          '0694de13-ac56-44f9-813c-1c91674e6a19'
        );
      });

      it('should accept undefined', () => {
        acceptUndefined(property);
      });

      it('should accept null', () => {
        acceptNull(property);
      });

      it("should not accept 'false', 'undefined', 'null', '' values", () => {
        const obj = { [property]: 'false' };
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 'undefined';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = 'null';
        expect(() => schema.parse(obj)).toThrow();
        obj[property] = '';
        expect(() => schema.parse(obj)).toThrow();
      });

      it('should not accept a stringified undefined', () => {
        stringUndefinedThrow(property);
      });

      it('should not accept a stringified null', () => {
        stringNullThrow(property);
      });

      it('should not accept an empty string', () => {
        emptyStringThrow(property);
      });

      it('should not accept values of other types', () =>
        validatePropOfSchema(schema, property, ['null', 'undefined']));
    }
  };

  // The options config validation tests
  return {
    puppeteer: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    puppeteerArgs: (property, value, filteredValue) => {
      describe(property, () =>
        validationTests.stringArray(property, value, filteredValue, ';')
      );
    },
    highcharts: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    highchartsVersion: (property) => {
      describe(property, () => validationTests.version(property));
    },
    highchartsCdnUrl: (property, correctValue, incorrectValue) => {
      describe(property, () =>
        validationTests.acceptValues(property, correctValue, incorrectValue)
      );
    },
    highchartsForceFetch: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    highchartsCachePath: (property) => {
      describe(property, () => validationTests.string(property, strictCheck));
    },
    highchartsAdminToken: (property) => {
      describe(property, () => validationTests.string(property, false));
    },
    highchartsCoreScripts: (property, value, filteredValue) => {
      describe(property, () =>
        validationTests.stringArray(property, value, filteredValue)
      );
    },
    highchartsModuleScripts: (property, value, filteredValue) => {
      describe(property, () =>
        validationTests.stringArray(property, value, filteredValue)
      );
    },
    highchartsIndicatorScripts: (property, value, filteredValue) => {
      describe(property, () =>
        validationTests.stringArray(property, value, filteredValue)
      );
    },
    highchartsCustomScripts: (property, value, filteredValue) => {
      describe(property, () =>
        validationTests.stringArray(property, value, filteredValue)
      );
    },
    export: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    exportInfile: (property) => {
      describe(property, () => validationTests.infile(property));
    },
    exportInstr: (property) => {
      describe(property, () => validationTests.chartConfig(property, false));
    },
    exportOptions: (property) => {
      describe(property, () => validationTests.chartConfig(property, false));
    },
    exportSvg: (property) => {
      describe(property, () => validationTests.svg(property));
    },
    exportOutfile: (property) => {
      describe(property, () => validationTests.outfile(property));
    },
    exportType: (property, correctValue, incorrectValue) => {
      describe(property, () =>
        validationTests.acceptValues(property, correctValue, incorrectValue)
      );
    },
    exportConstr: (property, correctValue, incorrectValue) => {
      describe(property, () =>
        validationTests.acceptValues(property, correctValue, incorrectValue)
      );
    },
    exportB64: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    exportNoDownload: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    exportDefaultHeight: (property) => {
      describe(property, () => validationTests.positiveNum(property));
    },
    exportDefaultWidth: (property) => {
      describe(property, () => validationTests.positiveNum(property));
    },
    exportDefaultScale: (property) => {
      describe(property, () => validationTests.scale(property));
    },
    exportHeight: (property) => {
      describe(property, () => validationTests.nullablePositiveNum(property));
    },
    exportWidth: (property) => {
      describe(property, () => validationTests.nullablePositiveNum(property));
    },
    exportScale: (property) => {
      describe(property, () => validationTests.nullableScale(property));
    },
    exportGlobalOptions: (property) => {
      describe(property, () =>
        validationTests.additionalOptions(property, false)
      );
    },
    exportThemeOptions: (property) => {
      describe(property, () =>
        validationTests.additionalOptions(property, false)
      );
    },
    exportBatch: (property) => {
      describe(property, () => validationTests.string(property, false));
    },
    exportRasterizationTimeout: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    customLogic: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    customLogicAllowCodeExecution: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    customLogicAllowFileResources: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    customLogicCustomCode: (property) => {
      describe(property, () => validationTests.string(property, false));
    },
    customLogicCallback: (property) => {
      describe(property, () => validationTests.string(property, false));
    },
    customLogicResources: (property) => {
      describe(property, () => validationTests.resources(property));
    },
    customLogicLoadConfig: (property) => {
      describe(property, () => validationTests.customConfig(property, false));
    },
    customLogicCreateConfig: (property) => {
      describe(property, () => validationTests.customConfig(property, false));
    },
    server: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    serverEnable: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    serverHost: (property) => {
      describe(property, () => validationTests.string(property, strictCheck));
    },
    serverPort: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    serverBenchmarking: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    serverProxy: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    serverProxyHost: (property) => {
      describe(property, () => validationTests.string(property, false));
    },
    serverProxyPort: (property) => {
      describe(property, () =>
        validationTests.nullableNonNegativeNum(property)
      );
    },
    serverProxyTimeout: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    serverRateLimiting: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    serverRateLimitingEnable: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    serverRateLimitingMaxRequests: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    serverRateLimitingWindow: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    serverRateLimitingDelay: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    serverRateLimitingTrustProxy: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    serverRateLimitingSkipKey: (property) => {
      describe(property, () => validationTests.string(property, false));
    },
    serverRateLimitingSkipToken: (property) => {
      describe(property, () => validationTests.string(property, false));
    },
    serverSsl: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    serverSslEnable: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    serverSslForce: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    serverSslPort: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    serverSslCertPath: (property) => {
      describe(property, () => validationTests.string(property, false));
    },
    pool: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    poolMinWorkers: (property) => {
      describe(property, () => validationTests.positiveNum(property));
    },
    poolMaxWorkers: (property) => {
      describe(property, () => validationTests.positiveNum(property));
    },
    poolWorkLimit: (property) => {
      describe(property, () => validationTests.positiveNum(property));
    },
    poolAcquireTimeout: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    poolCreateTimeout: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    poolDestroyTimeout: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    poolIdleTimeout: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    poolCreateRetryInterval: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    poolReaperInterval: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    poolBenchmarking: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    logging: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    loggingLevel: (property) => {
      describe(property, () => validationTests.logLevel(property, strictCheck));
    },
    loggingFile: (property) => {
      describe(property, () => validationTests.logFile(property, strictCheck));
    },
    loggingDest: (property) => {
      describe(property, () => validationTests.string(property, strictCheck));
    },
    loggingToConsole: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    loggingToFile: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    ui: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    uiEnable: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    uiRoute: (property, correctValue, incorrectValue) => {
      describe(property, () =>
        validationTests.acceptValues(property, correctValue, incorrectValue)
      );
    },
    other: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    otherNodeEnv: (property, correctValue, incorrectValue) => {
      describe(property, () =>
        validationTests.acceptValues(property, correctValue, incorrectValue)
      );
    },
    otherListenToProcessExits: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    otherNoLogo: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    otherHardResetPage: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    otherBrowserShellMode: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    debug: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    debugEnable: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    debugHeadless: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    debugDevtools: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    debugListenToConsole: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    debugDumpio: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    debugSlowMo: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    debugDebuggingPort: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    webSocket: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    webSocketEnable: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    webSocketReconnect: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    webSocketRejectUnauthorized: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    webSocketPingTimeout: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    webSocketReconnectInterval: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    webSocketReconnectAttempts: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    webSocketMessageInterval: (property) => {
      describe(property, () => validationTests.nonNegativeNum(property));
    },
    webSocketGatherAllOptions: (property) => {
      describe(property, () => validationTests.boolean(property));
    },
    webSocketUrl: (property, correctValue, incorrectValue) => {
      describe(property, () =>
        validationTests.nullableAcceptValues(
          property,
          correctValue,
          incorrectValue
        )
      );
    },
    webSocketSecret: (property) => {
      describe(property, () => validationTests.string(property, false));
    },
    payload: (property, value) => {
      describe(property, () => validationTests.configObject(property, value));
    },
    payloadRequestId: (property) => {
      describe(property, () => validationTests.requestId(property));
    }
  };
}
