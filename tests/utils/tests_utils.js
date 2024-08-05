import { expect } from '@jest/globals';

/**
 * A collection of possible values for various data types used in Jest tests,
 * categorized by specific types and their stringified versions.
 */
export const possibleValues = {
  // String
  string: ['', 'string', '1.0.1.0.1'],

  // Boolean
  boolean: [true, false],
  stringBoolean: ['true', 'false'],

  // Number
  number: [0, 0.1, 1, -1, -0.1, NaN, BigInt(1)],
  stringNumber: ['0', '0.1', '1', '-0.1', 'NaN', 'BigInt(1)'],

  // Nullish
  nullish: [null, undefined, void 0],
  stringNullish: ['null', 'undefined', 'void 0'],

  // Symbol
  symbol: [Symbol('')],
  stringSymbol: ['Symbol("")'],

  // Object
  object: [
    {},
    { a: 1 },
    { a: '1', b: { c: 3 } },
    [],
    [1],
    ['a'],
    [{ a: 1 }],
    function () {},
    () => {},
    new Date(),
    new RegExp('abc'),
    new Error('')
  ],
  stringObject: [
    '{}',
    '{ a: 1 }',
    '{ a: "1", b: { c: 3 } }',
    '[]',
    '[1]',
    '["a"]',
    '[{ a: 1 }]',
    'function () {}',
    '() => {}',
    'new Date()',
    'new RegExp("abc")',
    'new Error("")'
  ]
};

/**
 * Filters values from an object based on specified categories.
 *
 * The function iterates over the entries of the `values` object and collects
 * items from the arrays that correspond to keys not present in the `categories`
 * array.
 *
 * @param {Object} values - An object where keys are category names and values
 * are arrays of items.
 * @param {string[]} [categories=[]] - An array of category names to be excluded
 * from the values.
 *
 * @returns {Array} - An array of items from the `values` object that are not in
 * the specified `categories`.
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
 * Validates values against a provided validator function, ensuring that all
 * types not in the filter list throw errors.
 *
 * @param {Function} validator - A function that returns a Zod schema object for
 * validation.
 * @param {string[]} [filterTypes=[]] - An array of type categories to be
 * excluded from validation.
 *
 * The function filters the `possibleValues` object to exclude values
 * of the types specified in the `filterTypes` array. It then iterates over
 * the remaining values and asserts that the validator function throws an error
 * when parsing them. The exception from this rule is an empty string, which
 * should not throw an error when `envsCheck` is true.
 */
export function validateOtherTypes(validator, filterTypes = [], ...valArgs) {
  // Filter the possibleValue object to exclude values of types from
  // the filterTypes array
  const otherValues = excludeFromValues(possibleValues, filterTypes);

  // All other values should fail
  otherValues.forEach((value) => {
    expect(() => validator(...valArgs).parse(value)).toThrow();
    // Except an empty string, which will be transitioned to false when
    // the `envsCheck` is true
    if (value !== '') {
      expect(() => validator(...valArgs, true).parse(value)).toThrow();
    }
  });
}
