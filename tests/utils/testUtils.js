/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview Provides utilities for Jest tests to validate schema properties
 * and test value parsing. This module includes a comprehensive set
 * of categorized test values, functions for filtering  these values based
 * on type categories, and a utility for validating specific schema properties
 * against allowed and disallowed types.
 */

import { expect } from '@jest/globals';

/**
 * A collection of possible values for various data types used in Jest tests,
 * categorized by specific types and their stringified versions.
 */
export const possibleValues = {
  // String
  emptyString: [''],
  string: ['string', '1.0.1.0.1'],

  // Boolean
  boolean: [true, false],
  stringBoolean: ['true', 'false'],

  // Number
  number: [0, 0.1, 1, -1, -0.1, NaN],
  stringNumber: ['0', '0.1', '1', '-0.1', 'NaN'],

  // BigInt
  bigInt: [BigInt(1)],
  stringBigInt: ['BigInt(1)'],

  // Undefined
  undefined: [undefined],
  stringUndefined: ['undefined'],

  // Null
  null: [null],
  stringNull: ['null'],

  // Symbol
  symbol: [Symbol('a')],
  stringSymbol: ["Symbol('a')"],

  // Object
  object: [{}, { a: 1 }, { a: '1', b: { c: 3 } }],
  stringObject: ['{}', '{ a: 1 }', '{ a: "1", b: { c: 3 } }'],

  // Array objects
  array: [[], [1], ['a'], [{ a: 1 }]],
  stringArray: ['[]', '[1]', '["a"]', '[{ a: 1 }]'],

  // Function objects
  function: [function () {}, () => {}],
  stringFunction: ['function () {}', '() => {}'],

  // Other objects
  other: [new Date(), new Error(''), new RegExp('abc')],
  stringOther: ['new Date()', 'new Error("")', 'new RegExp("abc")']
};

/**
 * Filters values from an object based on specified categories.
 *
 * The function iterates over the entries of the `values` object and collects
 * items from the arrays that correspond to keys not present in the `categories`
 * array.
 *
 * @function excludeFromValues
 *
 * @param {Object} values - An object where keys are category names and values
 * are arrays of items.
 * @param {Array.<string>} [categories=[]] - An array of category names to be
 * excluded from the values.
 *
 * @returns {Array.<*>} An array of items from the `values` object that are not
 * in the specified `categories`.
 */
export function excludeFromValues(values, categories = []) {
  const filteredArray = [];
  Object.entries(values).forEach(([key, value]) => {
    if (!categories.includes(key)) {
      filteredArray.push(...value);
    }
  });
  return filteredArray;
}

/**
 * Validates a specific property of a provided schema by testing it against
 * various values and ensuring that values not matching the types in the
 * `filterTypes` list throw errors.
 *
 * The function filters the `possibleValues` object to exclude values of the
 * types specified in the `filterTypes` array. It then iterates over the
 * remaining values and ensures that parsing those values for the specified
 * property in the schema results in an error.
 *
 * @function validatePropOfSchema
 *
 * @param {ZodSchema} schema - The Zod schema object to be validated.
 * @param {string} property - The property of the schema to be validated.
 * @param {Array.<string>} [filterTypes=[]] - An array of type categories to be
 * excluded from validation. Values of these types will be skipped in the
 * validation process.
 */
export function validatePropOfSchema(schema, property, filterTypes = []) {
  // Filter the possibleValues object to exclude values of types from
  // the filterTypes array
  const otherValues = excludeFromValues(possibleValues, filterTypes);

  // Ensure all other values fail validation
  otherValues.forEach((value) => {
    expect(() => schema.parse({ [property]: value })).toThrow();
  });
}
