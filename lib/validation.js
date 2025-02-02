/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2025, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @overview This file handles parsing and validating options from multiple
 * sources (the config file, custom JSON, environment variables, CLI arguments,
 * and request payload) using the 'zod' library.
 *
 * Environment variables are parsed and validated only once at application
 * startup, and the validated results are exported as `envs` for use throughout
 * the application.
 *
 * Options from other sources, however, are parsed and validated on demand,
 * each time an export is attempted.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

import defaultConfig from './schemas/config.js';

// Load the .env into environment variables
dotenv.config();

// Get scripts names of each category from the default config
const { coreScripts, moduleScripts, indicatorScripts } =
  defaultConfig.highcharts;

// Sets the custom error map globally
z.setErrorMap(_customErrorMap);

/**
 * Object containing custom general validators and parsers to avoid repetition
 * in schema objects. All validators apply to values from various sources,
 * including the default config file, a custom JSON file loaded with the option
 * called `loadConfig`, the .env file, CLI arguments, and the request payload.
 * The `strictCheck` flag enables stricter validation and parsing rules. This
 * flag is set to false for values that come from the .env file or CLI arguments
 * because they are provided as strings and need to be parsed accordingly first.
 */
const v = {
  /**
   * The `boolean` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept values are true
   * and false and the schema will validate against the default boolean
   * validator.
   *
   * - When `strictCheck` is false, the schema will accept values are true,
   * false, null, 'true', '1', 'false', '0', 'undefined', 'null', and ''.
   * The strings 'undefined', 'null', and '' will be transformed to null,
   * the string 'true' will be transformed to the boolean value true,
   * and 'false' will be transformed to the boolean value false.
   *
   * @function boolean
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating boolean values.
   */
  boolean(strictCheck) {
    return strictCheck
      ? z.boolean()
      : z
          .union([
            z
              .enum(['true', '1', 'false', '0', 'undefined', 'null', ''])
              .transform((value) =>
                !['undefined', 'null', ''].includes(value)
                  ? value === 'true' || value === '1'
                  : null
              ),
            z.boolean()
          ])
          .nullable();
  },

  /**
   * The `string` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept trimmed strings except
   * the forbidden values: 'false', 'undefined', 'null', and ''.
   *
   * - When `strictCheck` is false, the schema will accept trimmed strings
   * and null. The forbidden values: 'false', 'undefined', 'null', and '' will
   * be transformed to null.
   *
   * @function string
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating string values.
   */
  string(strictCheck) {
    return strictCheck
      ? z
          .string()
          .trim()
          .refine(
            (value) => !['false', 'undefined', 'null', ''].includes(value),
            {
              params: {
                errorMessage: 'The string contains a forbidden value'
              }
            }
          )
      : z
          .string()
          .trim()
          .transform((value) =>
            !['false', 'undefined', 'null', ''].includes(value) ? value : null
          )
          .nullable();
  },

  /**
   * The `enum` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The schema will validate against the provided `values` array.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will validate against the `values`
   * array with the default enum validator.
   *
   * - When `strictCheck` is false, the schema will accept also null,
   * 'undefined', 'null', and '', which will be transformed to null.
   *
   * @function enum
   *
   * @param {Array.<string>} values - An array of valid string values
   * for the enum.
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating enum values.
   */
  enum(values, strictCheck) {
    return strictCheck
      ? z.enum([...values])
      : z
          .enum([...values, 'undefined', 'null', ''])
          .transform((value) =>
            !['undefined', 'null', ''].includes(value) ? value : null
          )
          .nullable();
  },

  /**
   * The `stringArray` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept an array of trimmed
   * string values filtered by the logic provided through the `filterCallback`.
   *
   * - When `strictCheck` is false, the schema will accept null and trimmed
   * string values which will be splitted into an array of strings and filtered
   * from the '[' and ']' characters and by the logic provided through
   * the `filterCallback`. If the array is empty, it will be transformed
   * to null.
   *
   * @function stringArray
   *
   * @param {function} filterCallback - The filter callback.
   * @param {string} separator - The separator for spliting a string.
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating array of string
   * values.
   */
  stringArray(filterCallback, separator, strictCheck) {
    const arraySchema = z.string().trim().array();
    const stringSchema = z
      .string()
      .trim()
      .transform((value) => {
        if (value.startsWith('[')) {
          value = value.slice(1);
        }
        if (value.endsWith(']')) {
          value = value.slice(0, -1);
        }
        return value.split(separator);
      });

    const transformCallback = (value) =>
      value.map((value) => value.trim()).filter(filterCallback);

    return strictCheck
      ? arraySchema.transform(transformCallback)
      : z
          .union([stringSchema, arraySchema])
          .transform(transformCallback)
          .transform((value) => (value.length ? value : null))
          .nullable();
  },

  /**
   * The `positiveNum` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept positive number values
   * and validate against the default positive number validator.
   *
   * - When `strictCheck` is false, the schema will accept positive number
   * values, null, and trimmed string values that can either be 'undefined',
   * 'null', '', or represent a positive number. It will transform the string
   * to a positive number, or to null if it is 'undefined', 'null', or ''.
   *
   * @function positiveNum
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating positive number
   * values.
   */
  positiveNum(strictCheck) {
    return strictCheck
      ? z.number().positive()
      : z
          .union([
            z
              .string()
              .trim()
              .refine(
                (value) =>
                  (!isNaN(Number(value)) && Number(value) > 0) ||
                  ['undefined', 'null', ''].includes(value),
                {
                  params: {
                    errorMessage: 'The value must be numeric and positive'
                  }
                }
              )
              .transform((value) =>
                !['undefined', 'null', ''].includes(value)
                  ? Number(value)
                  : null
              ),
            z.number().positive()
          ])
          .nullable();
  },

  /**
   * The `nonNegativeNum` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept non-negative number
   * values and validate against the default non-negative number validator.
   *
   * - When `strictCheck` is false, the schema will accept non-negative number
   * values, null, and trimmed string values that can either be 'undefined',
   * 'null', '', or represent a non-negative number. It will transform
   * the string to a non-negative number, or to null if it is 'undefined',
   * 'null', or ''.
   *
   * @function nonNegativeNum
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating non-negative
   * number values.
   */
  nonNegativeNum(strictCheck) {
    return strictCheck
      ? z.number().nonnegative()
      : z
          .union([
            z
              .string()
              .trim()
              .refine(
                (value) =>
                  (!isNaN(Number(value)) && Number(value) >= 0) ||
                  ['undefined', 'null', ''].includes(value),
                {
                  params: {
                    errorMessage: 'The value must be numeric and non-negative'
                  }
                }
              )
              .transform((value) =>
                !['undefined', 'null', ''].includes(value)
                  ? Number(value)
                  : null
              ),
            z.number().nonnegative()
          ])
          .nullable();
  },

  /**
   * The `startsWith` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The schema will validate against the provided `prefixes` array to check
   * whether a string value starts with any of the values provided
   * in the `prefixes` array.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept trimmed string values
   * that start with values from the prefixes array.
   *
   * - When `strictCheck` is false, the schema will accept trimmed string values
   * that start with values from the prefixes array, null, 'undefined', 'null',
   * and '' where the schema will transform them to null.
   *
   * @function startsWith
   *
   * @param {Array.<string>} prefixes - An array of prefixes to validate
   * the string against.
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating strings that
   * starts with values.
   */
  startsWith(prefixes, strictCheck) {
    return strictCheck
      ? z
          .string()
          .trim()
          .refine(
            (value) => prefixes.some((prefix) => value.startsWith(prefix)),
            {
              params: {
                errorMessage: `The value must be a string that starts with ${prefixes.join(', ')}`
              }
            }
          )
      : z
          .string()
          .trim()
          .refine(
            (value) =>
              prefixes.some((prefix) => value.startsWith(prefix)) ||
              ['undefined', 'null', ''].includes(value),
            {
              params: {
                errorMessage: `The value must be a string that starts with ${prefixes.join(', ')}`
              }
            }
          )
          .transform((value) =>
            !['undefined', 'null', ''].includes(value) ? value : null
          )
          .nullable();
  },

  /**
   * The `chartConfig` validator that returns a Zod schema.
   *
   * The validation schema ensures that the schema will accept object values
   * or trimmed string values that contain '<svg' or '<?xml' elements, start
   * with the '{' and end with the '}', and null. The 'undefined', 'null',
   * and '' values will be transformed to null.
   *
   * @function chartConfig
   *
   * @returns {z.ZodSchema} A Zod schema object for validating chart
   * configuration value.
   */
  chartConfig() {
    return z
      .union([
        z
          .string()
          .trim()
          .refine(
            (value) =>
              (value.startsWith('{') && value.endsWith('}')) ||
              ['undefined', 'null', ''].includes(value),
            {
              params: {
                errorMessage:
                  "The value must be a string that starts with '{' and ends with '}'"
              }
            }
          )
          .transform((value) =>
            !['undefined', 'null', ''].includes(value) ? value : null
          ),
        z.object({}).passthrough()
      ])
      .nullable();
  },

  /**
   * The `additionalOptions` validator that returns a Zod schema.
   *
   * The validation schema ensures that the schema will accept object values
   * or trimmed string values that end with '.json' and are at least one
   * character long excluding the extension, start with the '{' and end
   * with the '}', and null. The 'undefined', 'null', and '' values will
   * be transformed to null.
   *
   * @function additionalOptions
   *
   * @returns {z.ZodSchema}  A Zod schema object for validating additional chart
   * options value.
   */
  additionalOptions() {
    return z
      .union([
        z
          .string()
          .trim()
          .refine(
            (value) =>
              (value.length >= 6 && value.endsWith('.json')) ||
              (value.startsWith('{') && value.endsWith('}')) ||
              ['undefined', 'null', ''].includes(value),
            {
              params: {
                errorMessage:
                  "The value must be a string that ends with '.json' or starts with '{' and ends with '}'"
              }
            }
          )
          .transform((value) =>
            !['undefined', 'null', ''].includes(value) ? value : null
          ),
        z.object({}).passthrough()
      ])
      .nullable();
  }
};

/**
 * Object containing custom config validators and parsers to avoid repetition
 * in schema objects. All validators apply to values from various sources,
 * including the default config file, a custom JSON file loaded with the option
 * called `loadConfig`, the .env file, CLI arguments, and the request payload.
 * The `strictCheck` flag enables stricter validation and parsing rules. This
 * flag is set to false for values that come from the .env file or CLI arguments
 * because they are provided as strings and need to be parsed accordingly first.
 */
export const validators = {
  /**
   * The `args` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `stringArray` validator.
   *
   * @function args
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `args`
   * option.
   */
  args(strictCheck) {
    return v.stringArray(
      (value) => !['false', 'undefined', 'null', ''].includes(value),
      ';',
      strictCheck
    );
  },

  /**
   * The `version` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept trimmed string values
   * that are a RegExp-based that allows to be 'latest', or in the format XX,
   * XX.YY, or XX.YY.ZZ, where XX, YY, and ZZ are numeric for the Highcharts
   * version option.
   *
   * - When `strictCheck` is false, the schema will accept also null,
   * 'undefined', 'null', or '' and in all cases the schema will transform them
   * to null.
   *
   * @function version
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `version`
   * option.
   */
  version(strictCheck) {
    return strictCheck
      ? z
          .string()
          .trim()
          .refine((value) => /^(latest|\d{1,2}(\.\d{1,2}){0,2})$/.test(value), {
            params: {
              errorMessage:
                "The value must be 'latest', a major version, or in the form XX.YY.ZZ"
            }
          })
      : z
          .string()
          .trim()
          .refine(
            (value) =>
              /^(latest|\d{1,2}(\.\d{1,2}){0,2})$/.test(value) ||
              ['undefined', 'null', ''].includes(value),
            {
              params: {
                errorMessage:
                  "The value must be 'latest', a major version, or in the form XX.YY.ZZ"
              }
            }
          )
          .transform((value) =>
            !['undefined', 'null', ''].includes(value) ? value : null
          )
          .nullable();
  },

  /**
   * The `cdnUrl` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `startsWith` validator.
   *
   * @function cdnUrl
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `cdnUrl`
   * option.
   */
  cdnUrl(strictCheck) {
    return v.startsWith(['http://', 'https://'], strictCheck);
  },

  /**
   * The `forceFetch` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function forceFetch
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `forceFetch`
   * option.
   */
  forceFetch(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `cachePath` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function cachePath
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `cachePath`
   * option.
   */
  cachePath(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `adminToken` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function adminToken
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `adminToken`
   * option.
   */
  adminToken(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `coreScripts` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `stringArray` validator.
   *
   * @function coreScripts
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `coreScripts`
   * option.
   */
  coreScripts(strictCheck) {
    return v.stringArray(
      (value) => coreScripts.value.includes(value),
      ',',
      strictCheck
    );
  },

  /**
   * The `moduleScripts` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `stringArray` validator.
   *
   * @function moduleScripts
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `moduleScripts` option.
   */
  moduleScripts(strictCheck) {
    return v.stringArray(
      (value) => moduleScripts.value.includes(value),
      ',',
      strictCheck
    );
  },

  /**
   * The `indicatorScripts` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `stringArray` validator.
   *
   * @function indicatorScripts
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `indicatorScripts` option.
   */
  indicatorScripts(strictCheck) {
    return v.stringArray(
      (value) => indicatorScripts.value.includes(value),
      ',',
      strictCheck
    );
  },

  /**
   * The `customScripts` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `stringArray` validator.
   *
   * @function customScripts
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `customScripts` option.
   */
  customScripts(strictCheck) {
    return v.stringArray(
      (value) => value.startsWith('https://') || value.startsWith('http://'),
      ',',
      strictCheck
    );
  },

  /**
   * The `infile` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept trimmed string values
   * that end with '.json' or '.svg', are at least one character long excluding
   * the extension, or null.
   *
   * - When `strictCheck` is false, the schema will accept trimmed string values
   * that end with '.json' or '.svg', are at least one character long excluding
   * the extension and will be null if the provided value is null, 'undefined',
   * 'null', or ''.
   *
   * @function infile
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `infile`
   * option.
   */
  infile(strictCheck) {
    return strictCheck
      ? z
          .string()
          .trim()
          .refine(
            (value) =>
              (value.length >= 6 && value.endsWith('.json')) ||
              (value.length >= 5 && value.endsWith('.svg')),
            {
              params: {
                errorMessage:
                  'The value must be a string that ends with .json or .svg'
              }
            }
          )
          .nullable()
      : z
          .string()
          .trim()
          .refine(
            (value) =>
              (value.length >= 6 && value.endsWith('.json')) ||
              (value.length >= 5 && value.endsWith('.svg')) ||
              ['undefined', 'null', ''].includes(value),
            {
              params: {
                errorMessage:
                  'The value must be a string that ends with .json or .svg'
              }
            }
          )
          .transform((value) =>
            !['undefined', 'null', ''].includes(value) ? value : null
          )
          .nullable();
  },

  /**
   * The `instr` validator that returns a Zod schema.
   *
   * The validation schema ensures the same work as the `options` validator.
   *
   * @function instr
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `instr`
   * option.
   */
  instr() {
    return v.chartConfig();
  },

  /**
   * The `options` validator that returns a Zod schema.
   *
   * The validation schema ensures the same work as the `options` validator.
   *
   * @function options
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `options`
   * option.
   */
  options() {
    return v.chartConfig();
  },

  /**
   * The `svg` validator that returns a Zod schema.
   *
   * The validation schema ensures that the schema will accept object values
   * or trimmed string values that contain '<svg' or '<?xml' elements and null.
   * The 'undefined', 'null', and '' values will be transformed to null.
   *
   * @function svg
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `svg` option.
   */
  svg() {
    return z
      .string()
      .trim()
      .refine(
        (value) =>
          value.indexOf('<svg') >= 0 ||
          value.indexOf('<?xml') >= 0 ||
          ['false', 'undefined', 'null', ''].includes(value),
        {
          params: {
            errorMessage:
              "The value must be a string that contains '<svg' or '<?xml'"
          }
        }
      )
      .transform((value) =>
        !['false', 'undefined', 'null', ''].includes(value) ? value : null
      )
      .nullable();
  },

  /**
   * The `outfile` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept trimmed string values
   * that end with '.jpeg', '.jpg', '.png', '.pdf', or '.svg', are at least one
   * character long excluding the extension, or null.
   *
   * - When `strictCheck` is false, the schema will accept trimmed string values
   * that end with '.jpeg', '.jpg', '.png', '.pdf', or '.svg', are at least one
   * character long excluding the extension and will be null if the provided
   * value is null, 'undefined', 'null', or ''.
   *
   * @function outfile
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `outfile`
   * option.
   */
  outfile(strictCheck) {
    return strictCheck
      ? z
          .string()
          .trim()
          .refine(
            (value) =>
              (value.length >= 6 && value.endsWith('.jpeg')) ||
              (value.length >= 5 &&
                (value.endsWith('.jpg') ||
                  value.endsWith('.png') ||
                  value.endsWith('.pdf') ||
                  value.endsWith('.svg'))),
            {
              params: {
                errorMessage:
                  'The value must be a string that ends with .jpeg, .jpg, .png, .pdf, or .svg'
              }
            }
          )
          .nullable()
      : z
          .string()
          .trim()
          .refine(
            (value) =>
              (value.length >= 6 && value.endsWith('.jpeg')) ||
              (value.length >= 5 &&
                (value.endsWith('.jpg') ||
                  value.endsWith('.png') ||
                  value.endsWith('.pdf') ||
                  value.endsWith('.svg'))) ||
              ['undefined', 'null', ''].includes(value),
            {
              params: {
                errorMessage:
                  'The value must be a string that ends with .jpeg, .jpg, .png, .pdf, or .svg'
              }
            }
          )
          .transform((value) =>
            !['undefined', 'null', ''].includes(value) ? value : null
          )
          .nullable();
  },

  /**
   * The `type` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `enum` validator.
   *
   * @function type
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `type`
   * option.
   */
  type(strictCheck) {
    return v.enum(['jpeg', 'jpg', 'png', 'pdf', 'svg'], strictCheck);
  },

  /**
   * The `constr` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `enum` validator.
   *
   * @function constr
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `constr`
   * option.
   */
  constr(strictCheck) {
    return v.enum(
      ['chart', 'stockChart', 'mapChart', 'ganttChart'],
      strictCheck
    );
  },

  /**
   * The `b64` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function b64
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `b64` option.
   */
  b64(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `noDownload` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function noDownload
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `noDownload`
   * option.
   */
  noDownload(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `defaultHeight` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `positiveNum` validator.
   *
   * @function defaultHeight
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `defaultHeight` option.
   */
  defaultHeight(strictCheck) {
    return v.positiveNum(strictCheck);
  },

  /**
   * The `defaultWidth` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `positiveNum` validator.
   *
   * @function defaultWidth
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `defaultWidth` option.
   */
  defaultWidth(strictCheck) {
    return v.positiveNum(strictCheck);
  },

  /**
   * The `defaultScale` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept number values that
   * are between 0.1 and 5 (inclusive).
   *
   * - When `strictCheck` is false, the schema will accept number values
   * and stringified number values that are between 0.1 and 5 (inclusive), null,
   * 'undefined', 'null', and '' which will be transformed to null.
   *
   * @function defaultScale
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `defaultScale` option.
   */
  defaultScale(strictCheck) {
    return strictCheck
      ? z.number().gte(0.1).lte(5)
      : z
          .union([
            z
              .string()
              .trim()
              .refine(
                (value) =>
                  (!isNaN(Number(value)) &&
                    value !== true &&
                    !value.startsWith('[') &&
                    Number(value) >= 0.1 &&
                    Number(value) <= 5) ||
                  ['undefined', 'null', ''].includes(value),
                {
                  params: {
                    errorMessage: 'The value must be within a 0.1 and 5.0 range'
                  }
                }
              )
              .transform((value) =>
                !['undefined', 'null', ''].includes(value)
                  ? Number(value)
                  : null
              ),
            z.number().gte(0.1).lte(5)
          ])
          .nullable();
  },

  /**
   * The `height` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as a nullable `defaultHeight`
   * validator.
   *
   * @function height
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `height`
   * option.
   */
  height(strictCheck) {
    return this.defaultHeight(strictCheck).nullable();
  },

  /**
   * The `width` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as a nullable `defaultWidth`
   * validator.
   *
   * @function width
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `width`
   * option.
   */
  width(strictCheck) {
    return this.defaultWidth(strictCheck).nullable();
  },

  /**
   * The `scale` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as a nullable `defaultScale`
   * validator.
   *
   * @function scale
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `scale`
   * option.
   */
  scale(strictCheck) {
    return this.defaultScale(strictCheck).nullable();
  },

  /**
   * The `globalOptions` validator that returns a Zod schema.
   *
   * The validation schema ensures the same work as the `additionalOptions`
   * validator.
   *
   * @function globalOptions
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `globalOptions` option.
   */
  globalOptions() {
    return v.additionalOptions();
  },

  /**
   * The `themeOptions` validator that returns a Zod schema.
   *
   * The validation schema ensures the same work as the `additionalOptions`
   * validator.
   *
   * @function themeOptions
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `themeOptions` option.
   */
  themeOptions() {
    return v.additionalOptions();
  },

  /**
   * The `batch` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function batch
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `batch`
   * option.
   */
  batch(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `rasterizationTimeout` validator that returns a Zod schema with
   * an optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function rasterizationTimeout
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `rasterizationTimeout` option.
   */
  rasterizationTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `allowCodeExecution` validator that returns a Zod schema with
   * an optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function allowCodeExecution
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `allowCodeExecution` option.
   */
  allowCodeExecution(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `allowFileResources` validator that returns a Zod schema with
   * an optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function allowFileResources
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `allowFileResources` option.
   */
  allowFileResources(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `customCode` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function customCode
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `customCode`
   * option.
   */
  customCode(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `callback` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function callback
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `callback`
   * option.
   */
  callback(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `resources` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept a partial object
   * with allowed properties `js`, `css`, and `files` where each of the allowed
   * properties can be null, stringified version of the object, string that ends
   * with the '.json', and null.
   *
   * - When `strictCheck` is false, the schema will accept a stringified version
   * of a partial object with allowed properties `js`, `css`, and `files` where
   * each of the allowed properties can be null, string that ends with the
   * '.json', and will be null if the provided value is 'undefined', 'null'
   * or ''.
   *
   * @function resources
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `resources`
   * option.
   */
  resources(strictCheck) {
    const objectSchema = z
      .object({
        js: v.string(false),
        css: v.string(false),
        files: v
          .stringArray(
            (value) => !['undefined', 'null', ''].includes(value),
            ',',
            true
          )
          .nullable()
      })
      .partial();

    const stringSchema1 = z
      .string()
      .trim()
      .refine(
        (value) =>
          (value.startsWith('{') && value.endsWith('}')) ||
          (value.length >= 6 && value.endsWith('.json')),
        {
          params: {
            errorMessage:
              "The value must be a string that starts with '{' and ends with '}"
          }
        }
      );

    const stringSchema2 = z
      .string()
      .trim()
      .refine(
        (value) =>
          (value.startsWith('{') && value.endsWith('}')) ||
          (value.length >= 6 && value.endsWith('.json')) ||
          ['undefined', 'null', ''].includes(value),
        {
          params: {
            errorMessage: 'The value must be a string that ends with .json'
          }
        }
      )
      .transform((value) =>
        !['undefined', 'null', ''].includes(value) ? value : null
      );

    return strictCheck
      ? z.union([objectSchema, stringSchema1]).nullable()
      : z.union([objectSchema, stringSchema2]).nullable();
  },

  /**
   * The `loadConfig` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   * Additionally, it must be a string that ends with '.json'.
   *
   * @function loadConfig
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `loadConfig`
   * option.
   */
  loadConfig(strictCheck) {
    return v
      .string(strictCheck)
      .refine(
        (value) =>
          value === null || (value.length >= 6 && value.endsWith('.json')),
        {
          params: {
            errorMessage: 'The value must be a string that ends with .json'
          }
        }
      );
  },

  /**
   * The `createConfig` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `loadConfig` validator.
   *
   * @function createConfig
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `createConfig` option.
   */
  createConfig(strictCheck) {
    return this.loadConfig(strictCheck);
  },

  /**
   * The `enableServer` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function enableServer
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `enableServer` option.
   */
  enableServer(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `host` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function host
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `host`
   * option.
   */
  host(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `port` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function port
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `port`
   * option.
   */
  port(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `uploadLimit` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `positiveNum` validator.
   *
   * @function uploadLimit
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `uploadLimit`
   * option.
   */
  uploadLimit(strictCheck) {
    return v.positiveNum(strictCheck);
  },

  /**
   * The `serverBenchmarking` validator that returns a Zod schema with
   * an optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function serverBenchmarking
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `serverBenchmarking` option.
   */
  serverBenchmarking(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `proxyHost` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function proxyHost
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `proxyHost`
   * option.
   */
  proxyHost(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `proxyPort` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as a nullable `nonNegativeNum`
   * validator.
   *
   * @function proxyPort
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `proxyPort`
   * option.
   */
  proxyPort(strictCheck) {
    return v.nonNegativeNum(strictCheck).nullable();
  },

  /**
   * The `proxyTimeout` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function proxyTimeout
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `proxyTimeout` option.
   */
  proxyTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `enableRateLimiting` validator that returns a Zod schema with
   * an optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function enableRateLimiting
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `enableRateLimiting` option.
   */
  enableRateLimiting(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `maxRequests` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function maxRequests
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `maxRequests`
   * option.
   */
  maxRequests(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `window` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function window
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `window`
   * option.
   */
  window(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `delay` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function delay
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `delay`
   * option.
   */
  delay(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `trustProxy` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function trustProxy
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `trustProxy`
   * option.
   */
  trustProxy(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `skipKey` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function skipKey
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `skipKey`
   * option.
   */
  skipKey(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `skipToken` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function skipToken
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `skipToken`
   * option.
   */
  skipToken(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `enableSsl` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function enableSsl
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `enableSsl`
   * option.
   */
  enableSsl(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `sslForce` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function sslForce
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `sslForce`
   * option.
   */
  sslForce(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `sslPort` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function sslPort
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `sslPort`
   * option.
   */
  sslPort(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `sslCertPath` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function sslCertPath
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `sslCertPath`
   * option.
   */
  sslCertPath(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `minWorkers` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `positiveNum` validator.
   *
   * @function minWorkers
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `minWorkers`
   * option.
   */
  minWorkers(strictCheck) {
    return v.positiveNum(strictCheck);
  },

  /**
   * The `maxWorkers` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `positiveNum` validator.
   *
   * @function maxWorkers
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `maxWorkers`
   * option.
   */
  maxWorkers(strictCheck) {
    return v.positiveNum(strictCheck);
  },

  /**
   * The `workLimit` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `positiveNum` validator.
   *
   * @function workLimit
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `workLimit`
   * option.
   */
  workLimit(strictCheck) {
    return v.positiveNum(strictCheck);
  },

  /**
   * The `acquireTimeout` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function acquireTimeout
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `acquireTimeout` option.
   */
  acquireTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `createTimeout` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function createTimeout
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `createTimeout` option.
   */
  createTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `destroyTimeout` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function destroyTimeout
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `destroyTimeout` option.
   */
  destroyTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `idleTimeout` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function idleTimeout
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `idleTimeout` option.
   */
  idleTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `createRetryInterval` validator that returns a Zod schema with
   * an optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function createRetryInterval
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `createRetryInterval` option.
   */
  createRetryInterval(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `reaperInterval` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function reaperInterval
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `reaperInterval` option.
   */
  reaperInterval(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `poolBenchmarking` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function poolBenchmarking
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `poolBenchmarking` option.
   */
  poolBenchmarking(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `resourcesInterval` validator that returns a Zod schema with
   * an optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function resourcesInterval
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `resourcesInterval` option.
   */
  resourcesInterval(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `logLevel` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept integer number values
   * that are between 0 and 5 (inclusive).
   *
   * - When `strictCheck` is false, the schema will accept integer number values
   * and stringified integer number values that are between 1 and 5 (inclusive),
   * null, 'undefined', 'null', and '' which will be transformed to null.
   *
   * @function logLevel
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `logLevel`
   * option.
   */
  logLevel(strictCheck) {
    return strictCheck
      ? z.number().int().gte(0).lte(5)
      : z
          .union([
            z
              .string()
              .trim()
              .refine(
                (value) =>
                  (!isNaN(Number(value)) &&
                    value !== true &&
                    !value.startsWith('[') &&
                    Number.isInteger(Number(value)) &&
                    Number(value) >= 0 &&
                    Number(value) <= 5) ||
                  ['undefined', 'null', ''].includes(value),
                {
                  params: {
                    errorMessage: 'The value must be within a 0 and 5 range'
                  }
                }
              )
              .transform((value) =>
                !['undefined', 'null', ''].includes(value)
                  ? Number(value)
                  : null
              ),
            z.number().int().gte(0).lte(5)
          ])
          .nullable();
  },

  /**
   * The `logFile` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   * Additionally, it must be a string that ends with '.log'.
   *
   * @function logFile
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `logFile`
   * option.
   */
  logFile(strictCheck) {
    return v
      .string(strictCheck)
      .refine(
        (value) =>
          value === null || (value.length >= 5 && value.endsWith('.log')),
        {
          params: {
            errorMessage: 'The value must be a string that ends with .log'
          }
        }
      );
  },

  /**
   * The `logDest` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @function logDest
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `logDest`
   * option.
   */
  logDest(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `logToConsole` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function logToConsole
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `logToConsole` option.
   */
  logToConsole(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `logToFile` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function logToFile
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `logToFile`
   * option.
   */
  logToFile(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `enableUi` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function enableUi
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `enableUi`
   * option.
   */
  enableUi(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `uiRoute` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `startsWith` validator.
   *
   * @function uiRoute
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `uiRoute`
   * option.
   */
  uiRoute(strictCheck) {
    return v.startsWith(['/'], strictCheck);
  },

  /**
   * The `nodeEnv` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `enum` validator.
   *
   * @function nodeEnv
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `nodeEnv`
   * option.
   */
  nodeEnv(strictCheck) {
    return v.enum(['development', 'production', 'test'], strictCheck);
  },

  /**
   * The `listenToProcessExits` validator that returns a Zod schema with
   * an optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function listenToProcessExits
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `listenToProcessExits` option.
   */
  listenToProcessExits(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `noLogo` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function noLogo
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `noLogo`
   * option.
   */
  noLogo(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `hardResetPage` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function hardResetPage
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `hardResetPage` option.
   */
  hardResetPage(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `browserShellMode` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function browserShellMode
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `browserShellMode` option.
   */
  browserShellMode(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `validation` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function validation
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `validation`
   * option.
   */
  validation(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `enableDebug` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function enableDebug
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `enableDebug`
   * option.
   */
  enableDebug(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `headless` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function headless
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `headless`
   * option.
   */
  headless(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `devtools` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function devtools
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `devtools`
   * option.
   */
  devtools(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `listenToConsole` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function listenToConsole
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `listenToConsole` option.
   */
  listenToConsole(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `dumpio` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @function dumpio
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `dumpio`
   * option.
   */
  dumpio(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `slowMo` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function slowMo
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `slowMo`
   * option.
   */
  slowMo(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `debuggingPort` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @function debuggingPort
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating
   * the `debuggingPort` option.
   */
  debuggingPort(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `requestId` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   * Additionally, it must be a stringified UUID or can be null.
   *
   * @function requestId
   *
   * @param {boolean} strictCheck - Determines if stricter validation should
   * be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `requestId`
   * option.
   */
  requestId() {
    return z
      .string()
      .uuid({ message: 'The value must be a stringified UUID' })
      .nullable();
  }
};

// Schema for the puppeteer section of options
const PuppeteerSchema = (strictCheck) =>
  z
    .object({
      args: validators.args(strictCheck)
    })
    .partial();

// Schema for the highcharts section of options
const HighchartsSchema = (strictCheck) =>
  z
    .object({
      version: validators.version(strictCheck),
      cdnUrl: validators.cdnUrl(strictCheck),
      forceFetch: validators.forceFetch(strictCheck),
      cachePath: validators.cachePath(strictCheck),
      coreScripts: validators.coreScripts(strictCheck),
      moduleScripts: validators.moduleScripts(strictCheck),
      indicatorScripts: validators.indicatorScripts(strictCheck),
      customScripts: validators.customScripts(strictCheck)
    })
    .partial();

// Schema for the export section of options
const ExportSchema = (strictCheck) =>
  z
    .object({
      infile: validators.infile(strictCheck),
      instr: validators.instr(),
      options: validators.options(),
      svg: validators.svg(),
      outfile: validators.outfile(strictCheck),
      type: validators.type(strictCheck),
      constr: validators.constr(strictCheck),
      b64: validators.b64(strictCheck),
      noDownload: validators.noDownload(strictCheck),
      defaultHeight: validators.defaultHeight(strictCheck),
      defaultWidth: validators.defaultWidth(strictCheck),
      defaultScale: validators.defaultScale(strictCheck),
      height: validators.height(strictCheck),
      width: validators.width(strictCheck),
      scale: validators.scale(strictCheck),
      globalOptions: validators.globalOptions(),
      themeOptions: validators.themeOptions(),
      batch: validators.batch(false),
      rasterizationTimeout: validators.rasterizationTimeout(strictCheck)
    })
    .partial();

// Schema for the customLogic section of options
const CustomLogicSchema = (strictCheck) =>
  z
    .object({
      allowCodeExecution: validators.allowCodeExecution(strictCheck),
      allowFileResources: validators.allowFileResources(strictCheck),
      customCode: validators.customCode(false),
      callback: validators.callback(false),
      resources: validators.resources(strictCheck),
      loadConfig: validators.loadConfig(false),
      createConfig: validators.createConfig(false)
    })
    .partial();

// Schema for the server.proxy section of options
const ProxySchema = (strictCheck) =>
  z
    .object({
      host: validators.proxyHost(false),
      port: validators.proxyPort(strictCheck),
      timeout: validators.proxyTimeout(strictCheck)
    })
    .partial();

// Schema for the server.rateLimiting section of options
const RateLimitingSchema = (strictCheck) =>
  z
    .object({
      enable: validators.enableRateLimiting(strictCheck),
      maxRequests: validators.maxRequests(strictCheck),
      window: validators.window(strictCheck),
      delay: validators.delay(strictCheck),
      trustProxy: validators.trustProxy(strictCheck),
      skipKey: validators.skipKey(false),
      skipToken: validators.skipToken(false)
    })
    .partial();

// Schema for the server.ssl section of options
const SslSchema = (strictCheck) =>
  z
    .object({
      enable: validators.enableSsl(strictCheck),
      force: validators.sslForce(strictCheck),
      port: validators.sslPort(strictCheck),
      certPath: validators.sslCertPath(false)
    })
    .partial();

// Schema for the server section of options
const ServerSchema = (strictCheck) =>
  z.object({
    enable: validators.enableServer(strictCheck).optional(),
    host: validators.host(strictCheck).optional(),
    port: validators.port(strictCheck).optional(),
    uploadLimit: validators.uploadLimit(strictCheck).optional(),
    benchmarking: validators.serverBenchmarking(strictCheck).optional(),
    proxy: ProxySchema(strictCheck).optional(),
    rateLimiting: RateLimitingSchema(strictCheck).optional(),
    ssl: SslSchema(strictCheck).optional()
  });

// Schema for the pool section of options
const PoolSchema = (strictCheck) =>
  z
    .object({
      minWorkers: validators.minWorkers(strictCheck),
      maxWorkers: validators.maxWorkers(strictCheck),
      workLimit: validators.workLimit(strictCheck),
      acquireTimeout: validators.acquireTimeout(strictCheck),
      createTimeout: validators.createTimeout(strictCheck),
      destroyTimeout: validators.destroyTimeout(strictCheck),
      idleTimeout: validators.idleTimeout(strictCheck),
      createRetryInterval: validators.createRetryInterval(strictCheck),
      reaperInterval: validators.reaperInterval(strictCheck),
      benchmarking: validators.poolBenchmarking(strictCheck)
    })
    .partial();

// Schema for the logging section of options
const LoggingSchema = (strictCheck) =>
  z
    .object({
      level: validators.logLevel(strictCheck),
      file: validators.logFile(strictCheck),
      dest: validators.logDest(strictCheck),
      toConsole: validators.logToConsole(strictCheck),
      toFile: validators.logToFile(strictCheck)
    })
    .partial();

// Schema for the ui section of options
const UiSchema = (strictCheck) =>
  z
    .object({
      enable: validators.enableUi(strictCheck),
      route: validators.uiRoute(strictCheck)
    })
    .partial();

// Schema for the other section of options
const OtherSchema = (strictCheck) =>
  z
    .object({
      nodeEnv: validators.nodeEnv(strictCheck),
      listenToProcessExits: validators.listenToProcessExits(strictCheck),
      noLogo: validators.noLogo(strictCheck),
      hardResetPage: validators.hardResetPage(strictCheck),
      browserShellMode: validators.browserShellMode(strictCheck),
      validation: validators.validation(strictCheck)
    })
    .partial();

// Schema for the debug section of options
const DebugSchema = (strictCheck) =>
  z
    .object({
      enable: validators.enableDebug(strictCheck),
      headless: validators.headless(strictCheck),
      devtools: validators.devtools(strictCheck),
      listenToConsole: validators.listenToConsole(strictCheck),
      dumpio: validators.dumpio(strictCheck),
      slowMo: validators.slowMo(strictCheck),
      debuggingPort: validators.debuggingPort(strictCheck)
    })
    .partial();

// Strict schema for the config
export const StrictConfigSchema = z.object({
  requestId: validators.requestId(),
  puppeteer: PuppeteerSchema(true),
  highcharts: HighchartsSchema(true),
  export: ExportSchema(true),
  customLogic: CustomLogicSchema(true),
  server: ServerSchema(true),
  pool: PoolSchema(true),
  logging: LoggingSchema(true),
  ui: UiSchema(true),
  other: OtherSchema(true),
  debug: DebugSchema(true)
});

// Loose schema for the config
export const LooseConfigSchema = z.object({
  requestId: validators.requestId(),
  puppeteer: PuppeteerSchema(false),
  highcharts: HighchartsSchema(false),
  export: ExportSchema(false),
  customLogic: CustomLogicSchema(false),
  server: ServerSchema(false),
  pool: PoolSchema(false),
  logging: LoggingSchema(false),
  ui: UiSchema(false),
  other: OtherSchema(false),
  debug: DebugSchema(false)
});

// Schema for the environment variables config
export const EnvSchema = z.object({
  // puppeteer
  PUPPETEER_ARGS: validators.args(false),

  // highcharts
  HIGHCHARTS_VERSION: validators.version(false),
  HIGHCHARTS_CDN_URL: validators.cdnUrl(false),
  HIGHCHARTS_FORCE_FETCH: validators.forceFetch(false),
  HIGHCHARTS_CACHE_PATH: validators.cachePath(false),
  HIGHCHARTS_ADMIN_TOKEN: validators.adminToken(false),
  HIGHCHARTS_CORE_SCRIPTS: validators.coreScripts(false),
  HIGHCHARTS_MODULE_SCRIPTS: validators.moduleScripts(false),
  HIGHCHARTS_INDICATOR_SCRIPTS: validators.indicatorScripts(false),
  HIGHCHARTS_CUSTOM_SCRIPTS: validators.customScripts(false),

  // export
  EXPORT_INFILE: validators.infile(false),
  EXPORT_INSTR: validators.instr(),
  EXPORT_OPTIONS: validators.options(),
  EXPORT_SVG: validators.svg(),
  EXPORT_BATCH: validators.batch(false),
  EXPORT_OUTFILE: validators.outfile(false),
  EXPORT_TYPE: validators.type(false),
  EXPORT_CONSTR: validators.constr(false),
  EXPORT_B64: validators.b64(false),
  EXPORT_NO_DOWNLOAD: validators.noDownload(false),
  EXPORT_HEIGHT: validators.height(false),
  EXPORT_WIDTH: validators.width(false),
  EXPORT_SCALE: validators.scale(false),
  EXPORT_DEFAULT_HEIGHT: validators.defaultHeight(false),
  EXPORT_DEFAULT_WIDTH: validators.defaultWidth(false),
  EXPORT_DEFAULT_SCALE: validators.defaultScale(false),
  EXPORT_GLOBAL_OPTIONS: validators.globalOptions(),
  EXPORT_THEME_OPTIONS: validators.themeOptions(),
  EXPORT_RASTERIZATION_TIMEOUT: validators.rasterizationTimeout(false),

  // custom
  CUSTOM_LOGIC_ALLOW_CODE_EXECUTION: validators.allowCodeExecution(false),
  CUSTOM_LOGIC_ALLOW_FILE_RESOURCES: validators.allowFileResources(false),
  CUSTOM_LOGIC_CUSTOM_CODE: validators.customCode(false),
  CUSTOM_LOGIC_CALLBACK: validators.callback(false),
  CUSTOM_LOGIC_RESOURCES: validators.resources(false),
  CUSTOM_LOGIC_LOAD_CONFIG: validators.loadConfig(false),
  CUSTOM_LOGIC_CREATE_CONFIG: validators.createConfig(false),

  // server
  SERVER_ENABLE: validators.enableServer(false),
  SERVER_HOST: validators.host(false),
  SERVER_PORT: validators.port(false),
  SERVER_UPLOAD_LIMIT: validators.uploadLimit(false),
  SERVER_BENCHMARKING: validators.serverBenchmarking(false),

  // server proxy
  SERVER_PROXY_HOST: validators.proxyHost(false),
  SERVER_PROXY_PORT: validators.proxyPort(false),
  SERVER_PROXY_TIMEOUT: validators.proxyTimeout(false),

  // server rate limiting
  SERVER_RATE_LIMITING_ENABLE: validators.enableRateLimiting(false),
  SERVER_RATE_LIMITING_MAX_REQUESTS: validators.maxRequests(false),
  SERVER_RATE_LIMITING_WINDOW: validators.window(false),
  SERVER_RATE_LIMITING_DELAY: validators.delay(false),
  SERVER_RATE_LIMITING_TRUST_PROXY: validators.trustProxy(false),
  SERVER_RATE_LIMITING_SKIP_KEY: validators.skipKey(false),
  SERVER_RATE_LIMITING_SKIP_TOKEN: validators.skipToken(false),

  // server ssl
  SERVER_SSL_ENABLE: validators.enableSsl(false),
  SERVER_SSL_FORCE: validators.sslForce(false),
  SERVER_SSL_PORT: validators.sslPort(false),
  SERVER_SSL_CERT_PATH: validators.sslCertPath(false),

  // pool
  POOL_MIN_WORKERS: validators.minWorkers(false),
  POOL_MAX_WORKERS: validators.maxWorkers(false),
  POOL_WORK_LIMIT: validators.workLimit(false),
  POOL_ACQUIRE_TIMEOUT: validators.acquireTimeout(false),
  POOL_CREATE_TIMEOUT: validators.createTimeout(false),
  POOL_DESTROY_TIMEOUT: validators.destroyTimeout(false),
  POOL_IDLE_TIMEOUT: validators.idleTimeout(false),
  POOL_CREATE_RETRY_INTERVAL: validators.createRetryInterval(false),
  POOL_REAPER_INTERVAL: validators.reaperInterval(false),
  POOL_BENCHMARKING: validators.poolBenchmarking(false),

  // logging
  LOGGING_LEVEL: validators.logLevel(false),
  LOGGING_FILE: validators.logFile(false),
  LOGGING_DEST: validators.logDest(false),
  LOGGING_TO_CONSOLE: validators.logToConsole(false),
  LOGGING_TO_FILE: validators.logToFile(false),

  // ui
  UI_ENABLE: validators.enableUi(false),
  UI_ROUTE: validators.uiRoute(false),

  // other
  OTHER_NODE_ENV: validators.nodeEnv(false),
  OTHER_LISTEN_TO_PROCESS_EXITS: validators.listenToProcessExits(false),
  OTHER_NO_LOGO: validators.noLogo(false),
  OTHER_HARD_RESET_PAGE: validators.hardResetPage(false),
  OTHER_BROWSER_SHELL_MODE: validators.browserShellMode(false),
  OTHER_VALIDATION: validators.validation(false),

  // debugger
  DEBUG_ENABLE: validators.enableDebug(false),
  DEBUG_HEADLESS: validators.headless(false),
  DEBUG_DEVTOOLS: validators.devtools(false),
  DEBUG_LISTEN_TO_CONSOLE: validators.listenToConsole(false),
  DEBUG_DUMPIO: validators.dumpio(false),
  DEBUG_SLOW_MO: validators.slowMo(false),
  DEBUG_DEBUGGING_PORT: validators.debuggingPort(false)
});

/**
 * Validates the environment variables options using the EnvSchema.
 *
 * @param {Object} process.env - The configuration options from environment
 * variables file to validate.
 *
 * @returns {Object} The parsed and validated environment variables.
 */
export const envs = EnvSchema.partial().parse(process.env);

/**
 * Validates the configuration options using the `StrictConfigSchema`.
 *
 * @function strictValidate
 *
 * @param {Object} configOptions - The configuration options to validate.
 *
 * @returns {Object} The parsed and validated configuration options.
 */
export function strictValidate(configOptions) {
  return StrictConfigSchema.partial().parse(configOptions);
}

/**
 * Validates the configuration options using the `LooseConfigSchema`.
 *
 * @function looseValidate
 *
 * @param {Object} configOptions - The configuration options to validate.
 *
 * @returns {Object} The parsed and validated configuration options.
 */
export function looseValidate(configOptions) {
  return LooseConfigSchema.partial().parse(configOptions);
}

/**
 * Custom error mapping function for Zod schema validation.
 *
 * This function customizes the error messages produced by Zod schema
 * validation, providing more specific and user-friendly feedback based on the
 * issue type and context.
 *
 * The function modifies the error messages as follows:
 *
 * - For missing required values (undefined), it returns a message indicating
 * that no value was provided for the specific property.
 *
 * - For custom validation errors, if a custom error message is provided in the
 * issue parameters, it includes this message along with the invalid data
 * received.
 *
 * - For all other errors, it appends property-specific information to the
 * default error message provided by Zod.
 *
 * @function _customErrorMap
 *
 * @param {z.ZodIssue} issue - The issue object representing the validation
 * error.
 * @param {Object} context - The context object providing additional information
 * about the validation error.
 *
 * @returns {Object} An object containing the customized error message.
 */
function _customErrorMap(issue, context) {
  // Get the chain of properties which error directly refers to
  const propertyName = issue.path.join('.');

  // Create the first part of the message about the property information
  const propertyInfo = `Invalid value for the ${propertyName}`;

  // Modified message for the invalid type
  if (issue.code === z.ZodIssueCode.invalid_type) {
    // Modified message for the required values
    if (issue.received === z.ZodParsedType.undefined) {
      return {
        message: `${propertyInfo} - No value was provided.`
      };
    }

    // Modified message for the specific invalid type when values exist
    return {
      message: `${propertyInfo} - Invalid type. ${context.defaultError}.`
    };
  }

  // Modified message for the custom validation
  if (issue.code === z.ZodIssueCode.custom) {
    // If the custom message for error exist, include it
    if (issue.params?.errorMessage) {
      return {
        message: `${propertyInfo} - ${issue.params?.errorMessage}, received '${context.data}'.`
      };
    }
  }

  // Modified message for the invalid union error
  if (issue.code === z.ZodIssueCode.invalid_union) {
    // Create the first part of the message about the multiple errors
    let message = `Multiple errors occurred for the ${propertyName}:\n`;

    // Cycle through all errors and create a correct message
    issue.unionErrors.forEach((value) => {
      const index = value.issues[0].message.indexOf('-');
      message +=
        index !== -1
          ? `${value.issues[0].message}\n`.substring(index)
          : `${value.issues[0].message}\n`;
    });

    // Return the final message for the invalid union error
    return {
      message
    };
  }

  // Return the default error message, extended by the info about the property
  return {
    message: `${propertyInfo} - ${context.defaultError}.`
  };
}

export default {
  validators,
  StrictConfigSchema,
  LooseConfigSchema,
  EnvSchema,
  envs,
  strictValidate,
  looseValidate
};
