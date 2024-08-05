/*******************************************************************************

Highcharts Export Server

Copyright (c) 2016-2024, Highsoft

Licenced under the MIT licence.

Additionally a valid Highcharts license is required for use.

See LICENSE file in root for details.

*******************************************************************************/

/**
 * @fileoverview
 * This file is responsible for parsing the environment variables and options
 * config with the 'zod' library. The parsed variants are then exported to be
 * used in the application as "envs" and final config. We should not use
 * process.env directly in the application as these would not be parsed
 * properly.
 *
 * The environment variables are parsed and validated only once when the
 * application starts. We should write a custom validator or a transformer for
 * each of the options.
 *
 * The options on the other hand are validated and parsed live, each time there
 * is an export attempt.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

import { scriptsNames } from './schemas/config.js';

// Load .env into environment variables
dotenv.config();

/**
 * Object with custom general validators and transformers to avoid repetition in
 * schema objects. All validators work both for values from the .env file and
 * config options from the object. The `envsCheck` flag allows parsing/
 * validating values from the .env file and defines in which mode the value
 * should be checked.
 */
export const v = {
  /**
   * The boolean validator that returns a Zod schema with an optional
   * environment variables check and transformation based on the `envsCheck`
   * parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the accepted values are true and false and the
   * schema will validate against the default boolean validator.
   *
   * - When `envsCheck` is true, the accepted values are true, false, 'true',
   * 'false', and ''. The string 'true' will be transformed to the boolean value
   * true, and any other string will be transformed to false.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating boolean values.
   */
  boolean(envsCheck = false) {
    return envsCheck
      ? z
          .boolean()
          .or(
            z.enum(['true', 'false', '']).transform((value) => value === 'true')
          )
      : z.boolean();
  },

  /**
   * The enum validator that returns a Zod schema with an optional environment
   * variables check and transformation based on the `envsCheck` parameter.
   *
   * The schema will validate against the provided `values` array.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will validate against the `values`
   * array with the default enum validator.
   *
   * - When `envsCheck` is true, an empty string is added to the list of valid
   * values, and the schema will transform the empty string to null.
   *
   * @param {Array<string>} values - An array of valid string values for the
   * enum.
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating enum values.
   */
  enum(values, envsCheck = false) {
    const validate = z.enum(envsCheck ? [...values, ''] : [...values]);

    return envsCheck
      ? validate.transform((value) => (value !== '' ? value : null))
      : validate;
  },

  /**
   * The string validator that returns a Zod schema with an optional environment
   * variables check and transformation based on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept trimmed string values
   * and transform any provided value of another type to a string.
   *
   * - When `envsCheck` is true, in addition to the above, the schema will
   * transform an empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating string values.
   */
  string(envsCheck = false) {
    const validate = z.coerce.string().trim();

    return envsCheck
      ? validate.transform((value) => (value !== '' ? value : null))
      : validate;
  },

  /**
   * The strictString validator that returns a Zod schema with an optional
   * environment variables check and transformation based on the `envsCheck`
   * parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept trimmed string values
   * except the forbidden values: 'false', 'undefined', 'void 0', 'NaN', and
   * 'null'.
   *
   * - When `envsCheck` is true, in addition to the above, the schema will
   * transform an empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating strict string
   * values.
   */
  strictString(envsCheck = false) {
    const validate = z
      .string()
      .trim()
      .refine(
        (value) =>
          !['false', 'undefined', 'void 0', 'NaN', 'null'].includes(value),
        (value) => ({
          message: `The string contains forbidden values, received '${value}'`
        })
      );

    return envsCheck
      ? validate.transform((value) => (value !== '' ? value : null))
      : validate;
  },

  /**
   * The strictStringNullable validator that returns a Zod schema with an
   * optional environment variables check and transformation based on the
   * `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept trimmed string values
   * except the forbidden values: 'false', 'undefined', 'void 0', and 'NaN'. It
   * also accepts the null value.
   *
   * - When `envsCheck` is true, in addition to the above, the schema will
   * transform an empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating nullable strict
   * string values.
   */
  strictStringNullable(envsCheck = false) {
    const validate = z
      .string()
      .trim()
      .refine(
        (value) => !['false', 'undefined', 'void 0', 'NaN'].includes(value),
        (value) => ({
          message: `The string contains forbidden values, received '${value}'`
        })
      )
      .nullable();

    return envsCheck
      ? validate.transform((value) =>
          value !== '' && value !== 'null' ? value : null
        )
      : validate;
  },

  /**
   * The stringArray validator that returns a Zod schema.
   *
   * The validation schema ensures that:
   *
   * - The schema will accept an array of trimmed string values.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating array of string
   * values.
   */
  stringArray() {
    return z.string().trim().array();
  },

  /**
   * The positiveNum validator that returns a Zod schema with an optional
   * environment variables check and transformation based on the `envsCheck`
   * parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept positive number values
   * and validate against the default positive number validator.
   *
   * - When `envsCheck` is true, the schema will additionally accept trimmed
   * string values that can either be empty or represent a positive number. It
   * will transform the string to a positive number, or to null if the string is
   * empty.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating positive number
   * values.
   */
  positiveNum(envsCheck = false) {
    return envsCheck
      ? z
          .string()
          .trim()
          .or(z.number().positive())
          .refine(
            (value) =>
              value === '' || (!isNaN(Number(value)) && Number(value) > 0),
            (value) => ({
              message: `The value must be numeric and positive, received '${value}'`
            })
          )
          .transform((value) => (value !== '' ? Number(value) : null))
      : z.number().positive();
  },

  /**
   * The nonNegativeNum validator that returns a Zod schema with an optional
   * environment variables check and transformation based on the `envsCheck`
   * parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept non-negative number
   * values and validate against the default nonnegative number validator.
   *
   * - When `envsCheck` is true, the schema will additionally accept trimmed
   * string values that can either be empty or represent a non-negative number.
   * It will transform the string to a non-negative number, or to null if the
   * string is empty.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating non-negative
   * number values.
   */
  nonNegativeNum(envsCheck = false) {
    return envsCheck
      ? z
          .string()
          .trim()
          .or(z.number().nonnegative())
          .refine(
            (value) =>
              value === '' || (!isNaN(Number(value)) && Number(value) >= 0),
            (value) => ({
              message: `The value must be numeric and non-negative, received '${value}'`
            })
          )
          .transform((value) => (value !== '' ? Number(value) : null))
      : z.number().nonnegative();
  }
};

/**
 * Object with custom specific validators and transformers to avoid repetition
 * in schema objects. All validators work both for values from the .env file and
 * config options from the object. The `envsCheck` flag allows parsing/
 * validating values from the .env file and defines in which mode the value
 * should be checked.
 */
export const c = {
  /**
   * The infile validator that returns a Zod schema for validating input file
   * names with specific extensions.
   *
   * The validation schema ensures that the schema will accept trimmed string
   * values that end with '.json' or '.svg', are at least one character long
   * excluding the extension, and will be null if the provided value is an empty
   * string or null.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating input file names
   * with the specified extensions.
   */
  infile() {
    return z
      .string()
      .trim()
      .refine(
        (value) =>
          value === '' ||
          (value.length >= 6 && value.endsWith('.json')) ||
          (value.length >= 5 && value.endsWith('.svg')),
        (value) => ({
          message: `The infile option must be a string that ends with .json or .svg, received '${value}'`
        })
      )
      .transform((value) => (value !== '' ? value : null))
      .nullable();
  },

  /**
   * The outfile validator that returns a Zod schema for validating output file
   * names with specific extensions.
   *
   * The validation schema ensures that the schema will accept trimmed string
   * values that end with '.jpeg', '.jpg', '.png', '.pdf', or '.svg', are at
   * least one character long excluding the extension, and will be null if the
   * provided value is an empty string or null.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating output file names
   * with the specified extensions.
   */
  outfile() {
    return z
      .string()
      .trim()
      .refine(
        (value) =>
          value === '' ||
          (value.length >= 6 && value.endsWith('.jpeg')) ||
          (value.length >= 5 &&
            (value.endsWith('.jpg') ||
              value.endsWith('.png') ||
              value.endsWith('.pdf') ||
              value.endsWith('.svg'))),
        (value) => ({
          message: `The outfile option must be a string that ends with .jpeg, .jpg, .png, .pdf, or .svg, received '${value}'`
        })
      )
      .transform((value) => (value !== '' ? value : null))
      .nullable();
  },

  /**
   * The outfile validator that returns a Zod schema for validating custom
   * config file names with specific extensions.
   *
   * The validation schema ensures that the schema will accept trimmed string
   * values that end with '.json', are  at least one character long excluding
   * the extension, and will be null if the provided value is an empty string or
   * null.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating custom
   * configuration file names with the specified extensions.
   */
  customConfig() {
    return z
      .string()
      .trim()
      .refine(
        (value) =>
          value === '' || (value.length >= 6 && value.endsWith('.json')),
        (value) => ({
          message: `The createConfig or loadConfig option must be a string that ends with .json, received '${value}'`
        })
      )
      .transform((value) => (value !== '' ? value : null))
      .nullable();
  },

  /**
   * The optionsObject validator that returns a Zod schema for validating the
   * options object.
   *
   * The validation schema ensures that the schema will accept any key-value
   * pairs object, trimmed string object, and will be null if the provided value
   * is an empty string or null.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the options
   * object.
   */
  optionsObject() {
    return z
      .record(z.string(), z.any())
      .or(
        z
          .string()
          .trim()
          .transform((value) => (value !== '' ? value : null))
      )
      .nullable();
  },

  /**
   * The resources validator that returns a Zod schema for validating the
   * resources object.
   *
   * The validation schema ensures that the schema will accept a partial object
   * with allowed properties `js`, `css`, and `files` and null.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the resources
   * object.
   */
  resources() {
    return z
      .object({
        js: v.strictStringNullable(),
        css: v.strictStringNullable(),
        files: v.strictString().array()
      })
      .partial()
      .nullable();
  },

  /**
   * The chartType validator that returns a Zod schema for validating the chart
   * type with an optional environment variables check and transformation based
   * on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will validate against the array
   * with 'jpeg', 'jpg', 'png', 'pdf', and 'svg' values with the default enum
   * validator.
   *
   * - When `envsCheck` is true, an empty string is added to the list of valid
   * values, and the schema will transform the empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the chart type.
   */
  chartType(envsCheck = false) {
    return v.enum(['jpeg', 'jpg', 'png', 'pdf', 'svg'], envsCheck);
  },

  /**
   * The chartConstr validator that returns a Zod schema for validating the
   * chart constructor with an optional environment variables check and
   * transformation based on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will validate against the array
   * with 'chart', 'stockChart', 'mapChart', and 'ganttChart' values with the
   * default enum validator.
   *
   * - When `envsCheck` is true, an empty string is added to the list of valid
   * values, and the schema will transform the empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the chart
   * constructor.
   */
  chartConstr(envsCheck = false) {
    return v.enum(['chart', 'stockChart', 'mapChart', 'ganttChart'], envsCheck);
  },

  /**
   * The nodeEnv validator that returns a Zod schema for validating the node
   * server environment with an optional environment variables check and
   * transformation based on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will validate against the array
   * with 'development', 'production', and 'test' values with the default enum
   * validator.
   *
   * - When `envsCheck` is true, an empty string is added to the list of valid
   * values, and the schema will transform the empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the node server
   * environment.
   */
  nodeEnv(envsCheck = false) {
    return v.enum(['development', 'production', 'test'], envsCheck);
  },

  /**
   * The cdnUrl validator that returns a Zod schema for validating the
   * Highcharts CDN URL for scripts with an optional environment variables check
   * and transformation based on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept trimmed string values
   * that start with 'http://' or 'https://'.
   *
   * - When `envsCheck` is true, the URL can also be an empty string, and the
   * schema will transform the empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the Highcharts
   * CDN URL for scripts.
   */
  cdnUrl(envsCheck = false) {
    // The custom validate function based on envsCheck
    const validate = z
      .string()
      .trim()
      .refine(
        (value) =>
          value.startsWith('https://') ||
          value.startsWith('http://') ||
          (envsCheck && value === ''),
        (value) => ({
          message: `Invalid value for the ${envsCheck ? 'HIGHCHARTS_CDN_URL' : 'cdnURL'}. It should start with http:// or https://, received '${value}'`
        })
      );

    // Return correct variant of validation chain
    return envsCheck
      ? validate.transform((value) => (value !== '' ? value : null))
      : validate;
  },

  /**
   * The wsUrl validator that returns a Zod schema for validating the WebSocket
   * server URL with an optional environment variables check and transformation
   * based on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept trimmed string values
   * that start with 'ws://' or 'wss://'.
   *
   * - When `envsCheck` is true, the URL can also be an empty string, and the
   * schema will transform the empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the WebSocket
   * server URL.
   */
  wsUrl(envsCheck = false) {
    // The custom validate function based on envsCheck
    const validate = z
      .string()
      .trim()
      .refine(
        (value) =>
          value.startsWith('wss://') ||
          value.startsWith('ws://') ||
          (envsCheck && value === ''),
        (value) => ({
          message: `Invalid value for ${envsCheck ? 'WEB_SOCKET_URL' : 'wsUrl'}. It should start with ws:// or wss://, received '${value}'`
        })
      );

    // Return correct variant of validation chain
    return envsCheck
      ? validate.transform((value) => (value !== '' ? value : null))
      : validate;
  },

  /**
   * The uiRoute validator that returns a Zod schema for validating the UI route
   * URL for the server with an optional environment variables check and
   * transformation based on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept trimmed string values
   * that start with '/'.
   *
   * - When `envsCheck` is true, the URL can also be an empty string, and the
   * schema will transform the empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the UI route
   * URL for the server.
   */
  uiRoute(envsCheck = false) {
    // The custom validate function based on envsCheck
    const validate = z
      .string()
      .trim()
      .refine(
        (value) => value.startsWith('/') || (envsCheck && value === ''),
        (value) => ({
          message: `Invalid value for ${envsCheck ? 'UI_ROUTE' : 'uiRoute'}. It should start with /, received '${value}'`
        })
      );

    // Return correct variant of validation chain
    return envsCheck
      ? validate.transform((value) => (value !== '' ? value : null))
      : validate;
  },

  /**
   * The version validator that returns a Zod schema for validating the
   * Highcharts version with an optional environment variables check and
   * transformation based on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept trimmed string values
   * that are a RegExp-based values that allows to be 'latest', a major version,
   * or in the format XX, XX.YY, or XX.YY.ZZ, where XX, YY, and ZZ are numeric
   * for the Highcharts version option.
   *
   * - When `envsCheck` is true, the version can also be an empty string, and
   * the schema will transform the empty string to null.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the version
   * of Highcharts.
   */
  version(envsCheck = false) {
    // The custom validate function
    const validate = z
      .string()
      .trim()
      .refine(
        (value) =>
          /^(latest|\d+(\.\d+){0,2})$/.test(value) ||
          (envsCheck && value === ''),
        (value) => ({
          message: `Invalid value for the ${envsCheck ? 'HIGHCHARTS_VERSION' : 'version'}. It should be 'latest', a major version, or in the form XX.YY.ZZ, received '${value}'`
        })
      );

    // Return correct variant of the validation chain
    return envsCheck
      ? validate.transform((value) => (value !== '' ? value : null))
      : validate;
  },

  /**
   * The scale validator that returns a Zod schema for validating the scale of a
   * chart with an optional environment variables check and transformation based
   * on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept number values that are
   * between 0.1 and 5 (inclusive) or null.
   *
   * - When `envsCheck` is true, additionally the value can be a string that is
   * empty, which will be transformed to null or can represents a number between
   * 0.1 and 5 (inclusive).
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the scale of a
   * chart.
   */
  scale(envsCheck = false) {
    return envsCheck
      ? z
          .string()
          .trim()
          .or(z.number().gte(0.1).lte(5).nullable())
          .refine(
            (value) =>
              value === '' ||
              (!isNaN(Number(value)) &&
                value !== true &&
                !value.startsWith('[') &&
                Number(value) >= 0.1 &&
                Number(value) <= 5),
            (value) => ({
              message: `Invalid value for the ${envsCheck ? 'EXPORT_DEFAULT_SCALE' : 'scale'}. It should be in the 0.1 - 5.0 range, received '${value}'`
            })
          )
          .transform((value) => (value !== '' ? Number(value) : null))
      : z.number().gte(0.1).lte(5).nullable();
  },

  /**
   * The logLevel validator that returns a Zod schema for validating the logging
   * level with an optional environment variables check and transformation based
   * on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the schema will accept integer number values
   * that are between 1 and 5 (inclusive) or null.
   *
   * - When `envsCheck` is true, additionally the value can be a string that is
   * empty, which will be transformed to null or can represents an integer
   * number between 1 and 5 (inclusive).
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the logging
   * level.
   */
  logLevel(envsCheck = false) {
    return envsCheck
      ? z
          .string()
          .trim()
          .or(z.number().int().gte(1).lte(5).nullable())
          .refine(
            (value) =>
              value === '' ||
              (!isNaN(Number(value)) &&
                value !== true &&
                !value.startsWith('[') &&
                Number.isInteger(Number(value)) &&
                Number(value) >= 1 &&
                Number(value) <= 5),
            (value) => ({
              message: `Invalid value for ${envsCheck ? 'LOGGING_LEVEL' : 'logLevel'}. It should be a value from 0 to 5 as logging levels, received '${value}'`
            })
          )
          .transform((value) => (value !== '' ? Number(value) : null))
      : z.number().int().gte(1).lte(5).nullable();
  },

  /**
   * The scriptsArray validator that returns a Zod schema for validating the
   * Highcharts scripts array with an optional environment variables check and
   * transformation based on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the scripts array can be an array of strings.
   *
   * - When `envsCheck` is true, the scripts array can also be a single string
   * that will be split into an array using commas as delimiters.
   *
   * All values in the array will be trimmed and filtered based on the
   * `filterArray`.
   *
   * @param {string[]} filterArray - An array of valid script  names to
   * filter against.
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating
   * and transforming the Highcharts scripts array.
   */
  scriptsArray(filterArray, envsCheck = false) {
    // Return correct variant of the validation chain
    return (envsCheck ? z.string() : z.coerce.string().array())
      .transform((value) =>
        // If an initial value is string, split it to an array first
        (envsCheck ? value.split(',') : value)
          .map((value) => value.trim())
          .filter((value) => filterArray.includes(value))
      )
      .transform((value) => (value.length ? value : []));
  },

  /**
   * The customScriptsArray validator that returns a Zod schema for validating
   * the URLs of custom scripts array with an optional environment variables
   * check and transformation based on the `envsCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envsCheck` is false, the scripts array can be an array of strings.
   *
   * - When `envsCheck` is true, the scripts array can also be a single string
   * that will be split into an array using commas as delimiters.
   *
   * All values in the array will be trimmed and filtered based
   * on the check if they start with either https:// or http://.
   *
   * @param {boolean} [envsCheck=false] - Determines if environment variable
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating
   * and transforming the URLs of custom scripts array.
   */
  customScriptsArray(envsCheck = false) {
    // Return correct variant of the validation chain
    return (envsCheck ? z.string() : z.coerce.string().array())
      .transform((value) =>
        // If an initial value is string, split it to an array first
        (envsCheck ? value.split(',') : value)
          .map((value) => value.trim())
          .filter(
            (value) =>
              value.startsWith('https://') || value.startsWith('http://')
          )
      )
      .transform((value) => (value.length ? value : []));
  }
};

export const EnvConfig = z.object({
  // highcharts
  HIGHCHARTS_VERSION: c.version(true),
  HIGHCHARTS_CDN_URL: c.cdnUrl(true),
  HIGHCHARTS_FORCE_FETCH: v.boolean(true),
  HIGHCHARTS_CACHE_PATH: v.strictString(true),
  HIGHCHARTS_CORE_SCRIPTS: c.scriptsArray(scriptsNames.core, true),
  HIGHCHARTS_MODULE_SCRIPTS: c.scriptsArray(scriptsNames.modules, true),
  HIGHCHARTS_INDICATOR_SCRIPTS: c.scriptsArray(scriptsNames.indicators, true),
  HIGHCHARTS_CUSTOM_SCRIPTS: c.customScriptsArray(true),
  HIGHCHARTS_ADMIN_TOKEN: v.strictString(true),

  // export
  EXPORT_TYPE: c.chartType(true),
  EXPORT_CONSTR: c.chartConstr(true),
  EXPORT_DEFAULT_HEIGHT: v.positiveNum(true),
  EXPORT_DEFAULT_WIDTH: v.positiveNum(true),
  EXPORT_DEFAULT_SCALE: c.scale(true),
  EXPORT_RASTERIZATION_TIMEOUT: v.nonNegativeNum(true),

  // custom
  CUSTOM_LOGIC_ALLOW_CODE_EXECUTION: v.boolean(true),
  CUSTOM_LOGIC_ALLOW_FILE_RESOURCES: v.boolean(true),

  // server
  SERVER_ENABLE: v.boolean(true),
  SERVER_HOST: v.strictString(true),
  SERVER_PORT: v.positiveNum(true),
  SERVER_BENCHMARKING: v.boolean(true),

  // server proxy
  SERVER_PROXY_HOST: v.strictString(true),
  SERVER_PROXY_PORT: v.positiveNum(true),
  SERVER_PROXY_TIMEOUT: v.nonNegativeNum(true),

  // server rate limiting
  SERVER_RATE_LIMITING_ENABLE: v.boolean(true),
  SERVER_RATE_LIMITING_MAX_REQUESTS: v.nonNegativeNum(true),
  SERVER_RATE_LIMITING_WINDOW: v.nonNegativeNum(true),
  SERVER_RATE_LIMITING_DELAY: v.nonNegativeNum(true),
  SERVER_RATE_LIMITING_TRUST_PROXY: v.boolean(true),
  SERVER_RATE_LIMITING_SKIP_KEY: v.strictString(true),
  SERVER_RATE_LIMITING_SKIP_TOKEN: v.strictString(true),

  // server ssl
  SERVER_SSL_ENABLE: v.boolean(true),
  SERVER_SSL_FORCE: v.boolean(true),
  SERVER_SSL_PORT: v.positiveNum(true),
  SERVER_SSL_CERT_PATH: v.strictString(true),

  // pool
  POOL_MIN_WORKERS: v.positiveNum(true),
  POOL_MAX_WORKERS: v.positiveNum(true),
  POOL_WORK_LIMIT: v.positiveNum(true),
  POOL_ACQUIRE_TIMEOUT: v.nonNegativeNum(true),
  POOL_CREATE_TIMEOUT: v.nonNegativeNum(true),
  POOL_DESTROY_TIMEOUT: v.nonNegativeNum(true),
  POOL_IDLE_TIMEOUT: v.nonNegativeNum(true),
  POOL_CREATE_RETRY_INTERVAL: v.nonNegativeNum(true),
  POOL_REAPER_INTERVAL: v.nonNegativeNum(true),
  POOL_BENCHMARKING: v.boolean(true),

  // logger
  LOGGING_LEVEL: c.logLevel(true),
  LOGGING_FILE: v.strictString(true),
  LOGGING_DEST: v.strictString(true),
  LOGGING_TO_CONSOLE: v.boolean(true),
  LOGGING_TO_FILE: v.boolean(true),

  // ui
  UI_ENABLE: v.boolean(true),
  UI_ROUTE: c.uiRoute(true),

  // other
  OTHER_NODE_ENV: c.nodeEnv(true),
  OTHER_LISTEN_TO_PROCESS_EXITS: v.boolean(true),
  OTHER_NO_LOGO: v.boolean(true),
  OTHER_HARD_RESET_PAGE: v.boolean(true),
  OTHER_BROWSER_SHELL_MODE: v.boolean(true),

  // debugger
  DEBUG_ENABLE: v.boolean(true),
  DEBUG_HEADLESS: v.boolean(true),
  DEBUG_DEVTOOLS: v.boolean(true),
  DEBUG_LISTEN_TO_CONSOLE: v.boolean(true),
  DEBUG_DUMPIO: v.boolean(true),
  DEBUG_SLOW_MO: v.nonNegativeNum(true),
  DEBUG_DEBUGGING_PORT: v.positiveNum(true),

  // websocket
  WEB_SOCKET_ENABLE: v.boolean(true),
  WEB_SOCKET_RECONNECT: v.boolean(true),
  WEB_SOCKET_REJECT_UNAUTHORIZED: v.boolean(true),
  WEB_SOCKET_PING_TIMEOUT: v.nonNegativeNum(true),
  WEB_SOCKET_RECONNECT_INTERVAL: v.nonNegativeNum(true),
  WEB_SOCKET_RECONNECT_ATTEMPTS: v.nonNegativeNum(true),
  WEB_SOCKET_MESSAGE_INTERVAL: v.nonNegativeNum(true),
  WEB_SOCKET_GATHER_ALL_OPTIONS: v.boolean(true),
  WEB_SOCKET_URL: c.wsUrl(true),
  WEB_SOCKET_SECRET: v.strictString(true)
});

// Schema for the puppeteer section of options
const puppeteerSchema = z.object({
  args: v.stringArray()
});

// Schema for the highcharts section of options
const highchartsScheme = z.object({
  version: c.version(),
  cdnURL: c.cdnUrl(),
  forceFetch: v.boolean(),
  cachePath: v.strictString(),
  coreScripts: c.scriptsArray(scriptsNames.core),
  moduleScripts: c.scriptsArray(scriptsNames.modules),
  indicatorScripts: c.scriptsArray(scriptsNames.indicators),
  customScripts: c.customScriptsArray()
});

const exportSchema = z.object({
  infile: c.infile(),
  instr: v.strictStringNullable(),
  options: v.strictStringNullable(),
  outfile: c.outfile(),
  type: c.chartType(),
  constr: c.chartConstr(),
  defaultHeight: v.positiveNum(),
  defaultWidth: v.positiveNum(),
  defaultScale: c.scale(),
  height: v.positiveNum().nullable(),
  width: v.positiveNum().nullable(),
  scale: c.scale(),
  globalOptions: c.optionsObject(),
  themeOptions: c.optionsObject(),
  batch: v.strictStringNullable(),
  rasterizationTimeout: v.nonNegativeNum()
});

const customLogicSchema = z.object({
  allowCodeExecution: v.boolean(),
  allowFileResources: v.boolean(),
  customCode: v.strictStringNullable(),
  callback: v.strictStringNullable(),
  resources: c.resources(),
  loadConfig: c.customConfig(),
  createConfig: c.customConfig()
});

const proxySchema = z.object({
  host: v.strictStringNullable(),
  port: v.positiveNum(),
  timeout: v.nonNegativeNum()
});

const rateLimitingSchema = z.object({
  enable: v.boolean(),
  maxRequests: v.nonNegativeNum(),
  window: v.nonNegativeNum(),
  delay: v.nonNegativeNum(),
  trustProxy: v.boolean(),
  skipKey: v.strictStringNullable(),
  skipToken: v.strictStringNullable()
});

const sslSchema = z.object({
  enable: v.boolean(),
  force: v.boolean(),
  port: v.positiveNum(),
  certPath: v.strictStringNullable()
});

const serverSchema = z.object({
  enable: v.boolean(),
  host: v.strictString(),
  port: v.positiveNum(),
  benchmarking: v.boolean(),
  proxy: proxySchema,
  rateLimiting: rateLimitingSchema,
  ssl: sslSchema
});

const poolSchema = z.object({
  minWorkers: v.positiveNum(),
  maxWorkers: v.positiveNum(),
  workLimit: v.positiveNum(),
  acquireTimeout: v.nonNegativeNum(),
  createTimeout: v.nonNegativeNum(),
  destroyTimeout: v.nonNegativeNum(),
  idleTimeout: v.nonNegativeNum(),
  createRetryInterval: v.nonNegativeNum(),
  reaperInterval: v.nonNegativeNum(),
  benchmarking: v.boolean()
});

const loggingSchema = z.object({
  level: c.logLevel(),
  file: v.strictStringNullable(),
  dest: v.strictStringNullable(),
  toConsole: v.boolean(),
  toFile: v.boolean()
});

const uiScheme = z.object({
  enable: v.boolean(),
  route: c.uiRoute()
});

const otherScheme = z.object({
  nodeEnv: c.nodeEnv(),
  listenToProcessExits: v.boolean(),
  noLogo: v.boolean(),
  hardResetPage: v.boolean(),
  browserShellMode: v.boolean()
});

const debugScheme = z.object({
  enable: v.boolean(),
  headless: v.boolean(),
  devtools: v.boolean(),
  listenToConsole: v.boolean(),
  dumpio: v.boolean(),
  slowMo: v.nonNegativeNum(),
  debuggingPort: v.positiveNum()
});

const webSocketSchema = z.object({
  enable: v.boolean(),
  reconnect: v.boolean(),
  rejectUnauthorized: v.boolean(),
  pingTimeout: v.nonNegativeNum(),
  reconnectInterval: v.nonNegativeNum(),
  reconnectAttempts: v.nonNegativeNum(),
  messageInterval: v.nonNegativeNum(),
  gatherAllOptions: v.boolean(),
  url: c.wsUrl(),
  secret: v.strictStringNullable()
});

export const CustomConfig = z.object({
  puppeteer: puppeteerSchema,
  highcharts: highchartsScheme,
  export: exportSchema,
  customLogic: customLogicSchema,
  server: serverSchema,
  pool: poolSchema,
  logging: loggingSchema,
  ui: uiScheme,
  other: otherScheme,
  debug: debugScheme,
  webSocket: webSocketSchema
});

export const envs = EnvConfig.partial().parse(process.env);

export const validateAndParse = (configOptions) =>
  CustomConfig.partial().parse(configOptions);
