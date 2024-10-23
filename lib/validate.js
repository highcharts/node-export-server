/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * This file handles parsing and validating options from multiple sources
 * (the config file, custom JSON, environment variables, CLI arguments,
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

import { defaultConfig } from './schemas/config.js';

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
 * including the default config file, a custom JSON file loaded with the
 * `loadConfig` option, the .env file, CLI arguments, and the request payload.
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
   * - When `strictCheck` is true, the schema will accept values are true and
   * false and the schema will validate against the default boolean validator.
   *
   * - When `strictCheck` is false, the schema will accept values are true,
   * false, null, 'true', 'false', 'undefined', 'null', and ''. The strings
   * 'undefined', 'null', and '' will be transformed to null, the string 'true'
   * will be transformed to the boolean value true, and 'false' will be
   * transformed to the boolean value false.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating boolean values.
   */
  boolean(strictCheck) {
    return strictCheck
      ? z.boolean()
      : z
          .union([
            z
              .enum(['true', 'false', 'undefined', 'null', ''])
              .transform((value) =>
                !['undefined', 'null', ''].includes(value)
                  ? value === 'true'
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
   * - When `strictCheck` is false, the schema will accept trimmed strings and
   * null. The forbidden values: 'false', 'undefined', 'null', and ''
   * will be transformed to null.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
                errorMessage: `The string contains a forbidden value`
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
   * @param {Array.<string>} values - An array of valid string values for the
   * enum.
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * from the '[' and ']' characters and by the logic provided through the
   * `filterCallback`. If the array is empty, it will be transformed to null.
   *
   * @param {function} filterCallback - The filter callback.
   * @param {string} separator - The separator for spliting a string.
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * 'null', '', or represent a positive number. It will transform the string to
   * a positive number, or to null if it is 'undefined', 'null', or ''.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
                    errorMessage: `The value must be numeric and positive`
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
   * 'null', '', or represent a non-negative number. It will transform the
   * string to a non-negative number, or to null if it is 'undefined', 'null',
   * or ''.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
                    errorMessage: `The value must be numeric and non-negative`
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
   * whether a string value starts with any of the values provided in the
   * `prefixes` array.
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
   * @param {Array.<string>} prefixes - An array of prefixes to validate the
   * string against.
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * The validation schema ensures that the schema will accept object values or
   * trimmed string values that contain '<svg' or '<?xml' elements, start with
   * the '{' and end with the '}', and null. The 'undefined', 'null', and ''
   * values will be transformed to null.
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
              value.indexOf('<svg') >= 0 ||
              value.indexOf('<?xml') >= 0 ||
              (value.startsWith('{') && value.endsWith('}')) ||
              ['undefined', 'null', ''].includes(value),
            {
              params: {
                errorMessage: `The value must be a string that contains '<svg' or '<?xml' or starts with '{' and ends with '}'`
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
   * The validation schema ensures that the schema will accept object values or
   * trimmed string values that end with '.json' and are at least one character
   * long excluding the extension, start with the '{' and end with the '}', and
   * null. The 'undefined', 'null', and '' values will be transformed to null.
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
                errorMessage: `The value must be a string that ends with '.json' or starts with '{' and ends with '}'`
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
 * including the default config file, a custom JSON file loaded with the
 * `loadConfig` option, the .env file, CLI arguments, and the request payload.
 * The `strictCheck` flag enables stricter validation and parsing rules. This
 * flag is set to false for values that come from the .env file or CLI arguments
 * because they are provided as strings and need to be parsed accordingly first.
 */
const config = {
  /**
   * The `args` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `stringArray` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `moduleScripts` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `indicatorScripts` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `customScripts` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
                errorMessage: `The value must be a string that ends with .json or .svg`
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
                errorMessage: `The value must be a string that ends with .json or .svg`
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
   * @returns {z.ZodSchema} A Zod schema object for validating the `options`
   * option.
   */
  options() {
    return v.chartConfig();
  },

  /**
   * The `svg` validator that returns a Zod schema.
   *
   * The validation schema ensures that the schema will accept object values or
   * trimmed string values that contain '<svg' or '<?xml' elements and null.
   * The 'undefined', 'null', and '' values will be transformed to null.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
            errorMessage: `The value must be a string that contains '<svg' or '<?xml'`
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
                errorMessage: `The value must be a string that ends with .jpeg, .jpg, .png, .pdf, or .svg`
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
                errorMessage: `The value must be a string that ends with .jpeg, .jpg, .png, .pdf, or .svg`
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * The `defaultHeight` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `positiveNum` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `defaultHeight` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `defaultWidth` option.
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
   * - When `strictCheck` is true, the schema will accept number values that are
   * between 0.1 and 5 (inclusive).
   *
   * - When `strictCheck` is false, the schema will accept number values and
   * stringified number values that are between 0.1 and 5 (inclusive), null,
   * 'undefined', 'null', and '' which will be transformed to null.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `defaultScale` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `globalOptions` option.
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
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `themeOptions` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `batch`
   * option.
   */
  batch(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `rasterizationTimeout` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `rasterizationTimeout` option.
   */
  rasterizationTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `allowCodeExecution` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `allowCodeExecution` option.
   */
  allowCodeExecution(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `allowFileResources` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `allowFileResources` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * - When `strictCheck` is true, the schema will accept a partial object with
   * allowed properties `js`, `css`, and `files` where each of the allowed
   * properties can be null, stringified version of the object, string that ends
   * with the '.json', and null.
   *
   * - When `strictCheck` is false, the schema will accept a stringified version
   * of a partial object with allowed properties `js`, `css`, and `files` where
   * each of the allowed properties can be null, string that ends with the
   * '.json', and will be null if the provided value is 'undefined', 'null' or
   * ''.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
            errorMessage: `The value must be a string that starts with '{' and ends with '}`
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
            errorMessage: `The value must be a string that ends with '.json'`
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
            errorMessage: `The value must be a string that ends with .json `
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `createConfig` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `enableServer` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `port`
   * option.
   */
  port(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `serverBenchmarking` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation
   * should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `serverBenchmarking` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `proxyTimeout` option.
   */
  proxyTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `enableRateLimiting` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `enableRateLimiting` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `acquireTimeout` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `createTimeout` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `destroyTimeout` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `idleTimeout` option.
   */
  idleTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `createRetryInterval` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `createRetryInterval` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `reaperInterval` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `poolBenchmarking` option.
   */
  poolBenchmarking(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `resourcesInterval` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `resourcesInterval` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
            errorMessage: `The value must be a string that ends with '.log'`
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `logToConsole` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `nodeEnv`
   * option.
   */
  nodeEnv(strictCheck) {
    return v.enum(['development', 'production', 'test'], strictCheck);
  },

  /**
   * The `listenToProcessExits` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `listenToProcessExits` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `hardResetPage` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `browserShellMode` option.
   */
  browserShellMode(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `connectionOverPipe` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `connectionOverPipe` option.
   */
  connectionOverPipe(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `enableDebug` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `listenToConsole` option.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `debuggingPort` option.
   */
  debuggingPort(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `enableWs` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `enableWs`
   * option.
   */
  enableWs(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `wsReconnect` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `wsReconnect`
   * option.
   */
  wsReconnect(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `wsRejectUnauthorized` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `wsRejectUnauthorized` option.
   */
  wsRejectUnauthorized(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `wsPingTimeout` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `wsPingTimeout` option.
   */
  wsPingTimeout(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `wsReconnectInterval` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `wsReconnectInterval` option.
   */
  wsReconnectInterval(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `wsReconnectAttempts` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `wsReconnectAttempts` option.
   */
  wsReconnectAttempts(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `wsMessageInterval` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `nonNegativeNum`
   * validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `wsMessageInterval` option.
   */
  wsMessageInterval(strictCheck) {
    return v.nonNegativeNum(strictCheck);
  },

  /**
   * The `wsGatherAllOptions` validator that returns a Zod schema with an
   * optional stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the
   * `wsGatherAllOptions` option.
   */
  wsGatherAllOptions(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `wsUrl` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `startsWith` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `wsUrl`
   * option.
   */
  wsUrl(strictCheck) {
    return v.startsWith(['ws://', 'wss://'], strictCheck).nullable();
  },

  /**
   * The `wsSecret` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `wsSecret`
   * option.
   */
  wsSecret(strictCheck) {
    return v.string(strictCheck);
  },

  /**
   * The `b64` validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `boolean` validator.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
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
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `noDownload`
   * option.
   */
  noDownload(strictCheck) {
    return v.boolean(strictCheck);
  },

  /**
   * The `requestId` validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures the same work as the `string` validator.
   * Additionally, it must be a stringified UUID or can be null.
   *
   * @param {boolean} strictCheck - Determines if stricter validation should be
   * applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating the `requestId`
   * option.
   */
  requestId() {
    return (
      z
        .string()
        /// TO DO: Correct
        .uuid({ message: 'The value must be a stringified UUID' })
        .nullable()
    );
  }
};

// Schema for the puppeteer section of options
const PuppeteerSchema = (strictCheck) =>
  z
    .object({
      args: config.args(strictCheck)
    })
    .partial();

// Schema for the highcharts section of options
const HighchartsSchema = (strictCheck) =>
  z
    .object({
      version: config.version(strictCheck),
      cdnUrl: config.cdnUrl(strictCheck),
      forceFetch: config.forceFetch(strictCheck),
      cachePath: config.cachePath(strictCheck),
      coreScripts: config.coreScripts(strictCheck),
      moduleScripts: config.moduleScripts(strictCheck),
      indicatorScripts: config.indicatorScripts(strictCheck),
      customScripts: config.customScripts(strictCheck)
    })
    .partial();

// Schema for the export section of options
const ExportSchema = (strictCheck) =>
  z
    .object({
      infile: config.infile(strictCheck),
      instr: config.instr(),
      options: config.options(),
      svg: config.svg(),
      outfile: config.outfile(strictCheck),
      type: config.type(strictCheck),
      constr: config.constr(strictCheck),
      b64: config.b64(strictCheck),
      noDownload: config.noDownload(strictCheck),
      defaultHeight: config.defaultHeight(strictCheck),
      defaultWidth: config.defaultWidth(strictCheck),
      defaultScale: config.defaultScale(strictCheck),
      height: config.height(strictCheck),
      width: config.width(strictCheck),
      scale: config.scale(strictCheck),
      globalOptions: config.globalOptions(),
      themeOptions: config.themeOptions(),
      batch: config.batch(false),
      rasterizationTimeout: config.rasterizationTimeout(strictCheck)
    })
    .partial();

// Schema for the customLogic section of options
const CustomLogicSchema = (strictCheck) =>
  z
    .object({
      allowCodeExecution: config.allowCodeExecution(strictCheck),
      allowFileResources: config.allowFileResources(strictCheck),
      customCode: config.customCode(false),
      callback: config.callback(false),
      resources: config.resources(strictCheck),
      loadConfig: config.loadConfig(false),
      createConfig: config.createConfig(false)
    })
    .partial();

// Schema for the server.proxy section of options
const ProxySchema = (strictCheck) =>
  z
    .object({
      host: config.proxyHost(false),
      port: config.proxyPort(strictCheck),
      timeout: config.proxyTimeout(strictCheck)
    })
    .partial();

// Schema for the server.rateLimiting section of options
const RateLimitingSchema = (strictCheck) =>
  z
    .object({
      enable: config.enableRateLimiting(strictCheck),
      maxRequests: config.maxRequests(strictCheck),
      window: config.window(strictCheck),
      delay: config.delay(strictCheck),
      trustProxy: config.trustProxy(strictCheck),
      skipKey: config.skipKey(false),
      skipToken: config.skipToken(false)
    })
    .partial();

// Schema for the server.ssl section of options
const SslSchema = (strictCheck) =>
  z
    .object({
      enable: config.enableSsl(strictCheck),
      force: config.sslForce(strictCheck),
      port: config.sslPort(strictCheck),
      certPath: config.sslCertPath(false)
    })
    .partial();

// Schema for the server section of options
const ServerSchema = (strictCheck) =>
  z.object({
    enable: config.enableServer(strictCheck).optional(),
    host: config.host(strictCheck).optional(),
    port: config.port(strictCheck).optional(),
    benchmarking: config.serverBenchmarking(strictCheck).optional(),
    proxy: ProxySchema(strictCheck).optional(),
    rateLimiting: RateLimitingSchema(strictCheck).optional(),
    ssl: SslSchema(strictCheck).optional()
  });

// Schema for the pool section of options
const PoolSchema = (strictCheck) =>
  z
    .object({
      minWorkers: config.minWorkers(strictCheck),
      maxWorkers: config.maxWorkers(strictCheck),
      workLimit: config.workLimit(strictCheck),
      acquireTimeout: config.acquireTimeout(strictCheck),
      createTimeout: config.createTimeout(strictCheck),
      destroyTimeout: config.destroyTimeout(strictCheck),
      idleTimeout: config.idleTimeout(strictCheck),
      createRetryInterval: config.createRetryInterval(strictCheck),
      reaperInterval: config.reaperInterval(strictCheck),
      benchmarking: config.poolBenchmarking(strictCheck)
    })
    .partial();

// Schema for the logging section of options
const LoggingSchema = (strictCheck) =>
  z
    .object({
      level: config.logLevel(strictCheck),
      file: config.logFile(strictCheck),
      dest: config.logDest(strictCheck),
      toConsole: config.logToConsole(strictCheck),
      toFile: config.logToFile(strictCheck)
    })
    .partial();

// Schema for the ui section of options
const UiSchema = (strictCheck) =>
  z
    .object({
      enable: config.enableUi(strictCheck),
      route: config.uiRoute(strictCheck)
    })
    .partial();

// Schema for the other section of options
const OtherSchema = (strictCheck) =>
  z
    .object({
      nodeEnv: config.nodeEnv(strictCheck),
      listenToProcessExits: config.listenToProcessExits(strictCheck),
      noLogo: config.noLogo(strictCheck),
      hardResetPage: config.hardResetPage(strictCheck),
      browserShellMode: config.browserShellMode(strictCheck)
    })
    .partial();

// Schema for the debug section of options
const DebugSchema = (strictCheck) =>
  z
    .object({
      enable: config.enableDebug(strictCheck),
      headless: config.headless(strictCheck),
      devtools: config.devtools(strictCheck),
      listenToConsole: config.listenToConsole(strictCheck),
      dumpio: config.dumpio(strictCheck),
      slowMo: config.slowMo(strictCheck),
      debuggingPort: config.debuggingPort(strictCheck)
    })
    .partial();

// Schema for the webSocket section of options
const WebSocketSchema = (strictCheck) =>
  z
    .object({
      enable: config.enableWs(strictCheck),
      reconnect: config.wsReconnect(strictCheck),
      rejectUnauthorized: config.wsRejectUnauthorized(strictCheck),
      pingTimeout: config.wsPingTimeout(strictCheck),
      reconnectInterval: config.wsReconnectInterval(strictCheck),
      reconnectAttempts: config.wsReconnectAttempts(strictCheck),
      messageInterval: config.wsMessageInterval(strictCheck),
      gatherAllOptions: config.wsGatherAllOptions(strictCheck),
      url: config.wsUrl(strictCheck)
    })
    .partial();

// Schema for the payload section of options
const PayloadSchema = () =>
  z
    .object({
      requestId: config.requestId()
    })
    .partial();

// Strict schema for the config
export const StrictConfigSchema = z.object({
  puppeteer: PuppeteerSchema(true),
  highcharts: HighchartsSchema(true),
  export: ExportSchema(true),
  customLogic: CustomLogicSchema(true),
  server: ServerSchema(true),
  pool: PoolSchema(true),
  logging: LoggingSchema(true),
  ui: UiSchema(true),
  other: OtherSchema(true),
  debug: DebugSchema(true),
  webSocket: WebSocketSchema(true),
  payload: PayloadSchema()
});

// Loose schema for the config
export const LooseConfigSchema = z.object({
  puppeteer: PuppeteerSchema(false),
  highcharts: HighchartsSchema(false),
  export: ExportSchema(false),
  customLogic: CustomLogicSchema(false),
  server: ServerSchema(false),
  pool: PoolSchema(false),
  logging: LoggingSchema(false),
  ui: UiSchema(false),
  other: OtherSchema(false),
  debug: DebugSchema(false),
  webSocket: WebSocketSchema(false),
  payload: PayloadSchema()
});

// Schema for the environment variables config
export const EnvSchema = z.object({
  // puppeteer
  PUPPETEER_ARGS: config.args(false),

  // highcharts
  HIGHCHARTS_VERSION: config.version(false),
  HIGHCHARTS_CDN_URL: config.cdnUrl(false),
  HIGHCHARTS_FORCE_FETCH: config.forceFetch(false),
  HIGHCHARTS_CACHE_PATH: config.cachePath(false),
  HIGHCHARTS_ADMIN_TOKEN: config.adminToken(false),
  HIGHCHARTS_CORE_SCRIPTS: config.coreScripts(false),
  HIGHCHARTS_MODULE_SCRIPTS: config.moduleScripts(false),
  HIGHCHARTS_INDICATOR_SCRIPTS: config.indicatorScripts(false),
  HIGHCHARTS_CUSTOM_SCRIPTS: config.customScripts(false),

  // export
  EXPORT_INFILE: config.infile(false),
  EXPORT_INSTR: config.instr(),
  EXPORT_OPTIONS: config.options(),
  EXPORT_SVG: config.svg(),
  EXPORT_TYPE: config.type(false),
  EXPORT_CONSTR: config.constr(false),
  EXPORT_OUTFILE: config.outfile(false),
  EXPORT_B64: config.b64(false),
  EXPORT_NO_DOWNLOAD: config.noDownload(false),
  EXPORT_HEIGHT: config.height(false),
  EXPORT_WIDTH: config.width(false),
  EXPORT_SCALE: config.scale(false),
  EXPORT_DEFAULT_HEIGHT: config.defaultHeight(false),
  EXPORT_DEFAULT_WIDTH: config.defaultWidth(false),
  EXPORT_DEFAULT_SCALE: config.defaultScale(false),
  EXPORT_GLOBAL_OPTIONS: config.globalOptions(),
  EXPORT_THEME_OPTIONS: config.themeOptions(),
  EXPORT_BATCH: config.batch(false),
  EXPORT_RASTERIZATION_TIMEOUT: config.rasterizationTimeout(false),

  // custom
  CUSTOM_LOGIC_ALLOW_CODE_EXECUTION: config.allowCodeExecution(false),
  CUSTOM_LOGIC_ALLOW_FILE_RESOURCES: config.allowFileResources(false),
  CUSTOM_LOGIC_CUSTOM_CODE: config.customCode(false),
  CUSTOM_LOGIC_CALLBACK: config.callback(false),
  CUSTOM_LOGIC_RESOURCES: config.resources(false),
  CUSTOM_LOGIC_LOAD_CONFIG: config.loadConfig(false),
  CUSTOM_LOGIC_CREATE_CONFIG: config.createConfig(false),

  // server
  SERVER_ENABLE: config.enableServer(false),
  SERVER_HOST: config.host(false),
  SERVER_PORT: config.port(false),
  SERVER_BENCHMARKING: config.serverBenchmarking(false),

  // server proxy
  SERVER_PROXY_HOST: config.proxyHost(false),
  SERVER_PROXY_PORT: config.proxyPort(false),
  SERVER_PROXY_TIMEOUT: config.proxyTimeout(false),

  // server rate limiting
  SERVER_RATE_LIMITING_ENABLE: config.enableRateLimiting(false),
  SERVER_RATE_LIMITING_MAX_REQUESTS: config.maxRequests(false),
  SERVER_RATE_LIMITING_WINDOW: config.window(false),
  SERVER_RATE_LIMITING_DELAY: config.delay(false),
  SERVER_RATE_LIMITING_TRUST_PROXY: config.trustProxy(false),
  SERVER_RATE_LIMITING_SKIP_KEY: config.skipKey(false),
  SERVER_RATE_LIMITING_SKIP_TOKEN: config.skipToken(false),

  // server ssl
  SERVER_SSL_ENABLE: config.enableSsl(false),
  SERVER_SSL_FORCE: config.sslForce(false),
  SERVER_SSL_PORT: config.sslPort(false),
  SERVER_SSL_CERT_PATH: config.sslCertPath(false),

  // pool
  POOL_MIN_WORKERS: config.minWorkers(false),
  POOL_MAX_WORKERS: config.maxWorkers(false),
  POOL_WORK_LIMIT: config.workLimit(false),
  POOL_ACQUIRE_TIMEOUT: config.acquireTimeout(false),
  POOL_CREATE_TIMEOUT: config.createTimeout(false),
  POOL_DESTROY_TIMEOUT: config.destroyTimeout(false),
  POOL_IDLE_TIMEOUT: config.idleTimeout(false),
  POOL_CREATE_RETRY_INTERVAL: config.createRetryInterval(false),
  POOL_REAPER_INTERVAL: config.reaperInterval(false),
  POOL_BENCHMARKING: config.poolBenchmarking(false),
  /// TO DO: Add config, tests, docs, etc.
  POOL_RESOURCES_INTERVAL: config.resourcesInterval(false),

  // logging
  LOGGING_LEVEL: config.logLevel(false),
  LOGGING_FILE: config.logFile(false),
  LOGGING_DEST: config.logDest(false),
  LOGGING_TO_CONSOLE: config.logToConsole(false),
  LOGGING_TO_FILE: config.logToFile(false),

  // ui
  UI_ENABLE: config.enableUi(false),
  UI_ROUTE: config.uiRoute(false),

  // other
  OTHER_NODE_ENV: config.nodeEnv(false),
  OTHER_LISTEN_TO_PROCESS_EXITS: config.listenToProcessExits(false),
  OTHER_NO_LOGO: config.noLogo(false),
  OTHER_HARD_RESET_PAGE: config.hardResetPage(false),
  OTHER_BROWSER_SHELL_MODE: config.browserShellMode(false),
  /// TO DO: Add config, tests, docs, etc.
  OTHER_CONNECTION_OVER_PIPE: config.connectionOverPipe(false),

  // debugger
  DEBUG_ENABLE: config.enableDebug(false),
  DEBUG_HEADLESS: config.headless(false),
  DEBUG_DEVTOOLS: config.devtools(false),
  DEBUG_LISTEN_TO_CONSOLE: config.listenToConsole(false),
  DEBUG_DUMPIO: config.dumpio(false),
  DEBUG_SLOW_MO: config.slowMo(false),
  DEBUG_DEBUGGING_PORT: config.debuggingPort(false),

  // websocket
  WEB_SOCKET_ENABLE: config.enableWs(false),
  WEB_SOCKET_RECONNECT: config.wsReconnect(false),
  WEB_SOCKET_REJECT_UNAUTHORIZED: config.wsRejectUnauthorized(false),
  WEB_SOCKET_PING_TIMEOUT: config.wsPingTimeout(false),
  WEB_SOCKET_RECONNECT_INTERVAL: config.wsReconnectInterval(false),
  WEB_SOCKET_RECONNECT_ATTEMPTS: config.wsReconnectAttempts(false),
  WEB_SOCKET_MESSAGE_INTERVAL: config.wsMessageInterval(false),
  WEB_SOCKET_GATHER_ALL_OPTIONS: config.wsGatherAllOptions(false),
  WEB_SOCKET_URL: config.wsUrl(false),
  WEB_SOCKET_SECRET: config.wsSecret(false)
});

/**
 * Validates the environment variables options using the EnvSchema.
 *
 * @param {Object} configOptions - The configuration options from environment
 * variables file to validate.
 *
 * @returns {Object} The parsed and validated configuration options.
 */
export const envs = EnvSchema.partial().parse(process.env);

/**
 * Validates the configuration options using the StrictConfigSchema.
 *
 * @param {Object} configOptions - The configuration options to validate.
 *
 * @returns {Object} The parsed and validated configuration options.
 */
export function strictValidate(configOptions) {
  return StrictConfigSchema.partial().parse(configOptions);
}

/**
 * Validates the configuration options using the LooseConfigSchema.
 *
 * @param {Object} configOptions - The configuration options to validate.
 *
 * @returns {Object} The parsed and validated configuration options.
 */
export function looseValidate(configOptions) {
  return LooseConfigSchema.partial().parse(configOptions);
}

/**
 * Validates a provided option using the specific validator from the config
 * object.
 *
 * @param {string} name - The name of an option to validate.
 * @param {any} option - The option to validate.
 * @param {boolean} strictCheck - Determines if stricter validation should be
 * applied.
 *
 * @returns {any} The parsed and validated option value.
 */
export function validateOption(name, option, strictCheck) {
  return config[name](strictCheck).parse(option);
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
  StrictConfigSchema,
  LooseConfigSchema,
  EnvSchema,
  envs,
  strictValidate,
  looseValidate,
  validateOption
};
