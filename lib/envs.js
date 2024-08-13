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
 * @param {object} ctx - The context object providing additional information
 * about the validation error.
 *
 * @returns {object} An object containing the customized error message.
 */
const customErrorMap = (issue, ctx) => {
  // Get the chain of properties which error directly refers to
  const propertyName = issue.path.join('.');

  // Create a first part of the message about the property information
  const propertyInfo = `Invalid value for the ${propertyName}`;

  // Modified message for the invalid type
  if (issue.code === z.ZodIssueCode.invalid_type) {
    // Modified message for the required values
    if (issue.received === z.ZodParsedType.undefined) {
      return {
        message: `${propertyInfo} - No value was provided.`
      };
    }

    // Modified for the specific invalid type when values exist
    return {
      message: `${propertyInfo} - Invalid type. ${ctx.defaultError}.`
    };
  }

  // Modified message for the custom validation
  if (issue.code === z.ZodIssueCode.custom) {
    // If the custom message for error exist, include it
    if (issue.params?.errorMessage) {
      return {
        message: `${propertyInfo} - ${issue.params?.errorMessage}, received '${ctx.data}'.`
      };
    }
  }

  // Modified message for the invalid union error
  if (issue.code === z.ZodIssueCode.invalid_union) {
    // Create a first part of the message about the multiple errors
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
    message: `${propertyInfo} - ${ctx.defaultError}.`
  };
};

/**
 * Sets the custom error map globally
 */
z.setErrorMap(customErrorMap);

/**
 * Object with custom general validators and transformers to avoid repetition in
 * schema objects. All validators work both for values from the .env file and
 * config options from the object. The `envcheck` flag allows parsing/
 * validating values from the .env file and defines in which mode the value
 * should be checked.
 */
export const v = {
  /**
   * The boolean validator that returns a Zod schema with an optional
   * environment variables check and transformation based on the `envcheck`
   * parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the accepted values are true and false and the
   * schema will validate against the default boolean validator.
   *
   * - When `envcheck` is true, the accepted values are 'true', 'false', 'null',
   * '', true, false, and null. The strings 'null' and '' will be transformed to
   * null, the string 'true' will be transformed to the boolean value true, and
   * any other string will be transformed to false.
   *
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating boolean values.
   */
  boolean(envcheck = false) {
    return envcheck
      ? z
          .union([
            z.enum(['true', 'false', 'null', '']).transform((value) => {
              if (value === 'null' || value === '') {
                return null;
              }
              return value === 'true';
            }),
            z.boolean()
          ])
          .nullable()
      : z.boolean();
  },

  /**
   * The enum validator that returns a Zod schema with an optional environment
   * variables check and transformation based on the `envcheck` parameter.
   *
   * The schema will validate against the provided `values` array.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the schema will validate against the `values`
   * array with the default enum validator.
   *
   * - When `envcheck` is true, null, 'null' and an empty strings are added to
   * the list of valid values, and the schema will transform the last two of
   * them to null.
   *
   * @param {Array<string>} values - An array of valid string values for the
   * enum.
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating enum values.
   */
  enum(values, envcheck = false) {
    const validate = z.enum(envcheck ? [...values, 'null', ''] : [...values]);

    return envcheck
      ? validate
          .transform((value) =>
            value !== 'null' && value !== '' ? value : null
          )
          .nullable()
      : validate;
  },

  /**
   * The strictString validator that returns a Zod schema.
   *
   * The validation schema ensures that:
   *
   * - The schema will accept trimmed string values except the forbidden values:
   * 'false', 'undefined', 'void 0', 'NaN', 'null', and ''.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating strict string
   * values.
   */
  strictString() {
    return z
      .string()
      .trim()
      .refine(
        (value) =>
          !['false', 'undefined', 'void 0', 'NaN', 'null', ''].includes(value),
        {
          params: {
            errorMessage: `The string contains a forbidden value`
          }
        }
      );
  },

  /**
   * The nullishString validator that returns a Zod schema.
   *
   * The validation schema ensures that:
   *
   * - The schema will accept trimmed string values and null. Additionaly, the
   * 'false', 'undefined', 'void 0', 'NaN', 'null', and '' values will be
   * transformed to null.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating strict string
   * values.
   */
  nullishString() {
    return z
      .string()
      .trim()
      .nullable()
      .transform((value) =>
        !['false', 'undefined', 'void 0', 'NaN', 'null', ''].includes(value)
          ? value
          : null
      );
  },

  /**
   * The stringArray validator that returns a Zod schema.
   *
   * The validation schema ensures that:
   *
   * - The schema will accept an array of trimmed string values or null.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating array of string
   * values.
   */
  stringArray() {
    return z.string().trim().array().nullable();
  },

  /**
   * The positiveNum validator that returns a Zod schema with an optional
   * environment variables check and transformation based on the `envcheck`
   * parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the schema will accept positive number values
   * and validate against the default positive number validator.
   *
   * - When `envcheck` is true, the schema will additionally accept null and
   * trimmed string values that can either be empty or represent a positive
   * number. It will transform the string to a positive number, or to null if
   * the string is empty or 'null'.
   *
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating positive number
   * values.
   */
  positiveNum(envcheck = false) {
    return envcheck
      ? z
          .union([
            z
              .string()
              .trim()
              .refine(
                (value) =>
                  value === 'null' ||
                  value === '' ||
                  (!isNaN(Number(value)) && Number(value) > 0),
                {
                  params: {
                    errorMessage: `The value must be numeric and positive`
                  }
                }
              )
              .transform((value) =>
                value !== 'null' && value !== '' ? Number(value) : null
              ),
            z.number().positive()
          ])
          .nullable()
      : z.number().positive();
  },

  /**
   * The nonNegativeNum validator that returns a Zod schema with an optional
   * environment variables check and transformation based on the `envcheck`
   * parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the schema will accept non-negative number
   * values and validate against the default nonnegative number validator.
   *
   * - When `envcheck` is true, the schema will additionally accept null and
   * trimmed string values that can either be empty or represent a non-negative
   * number. It will transform the string to a non-negative number, or to null
   * if the string is empty or 'null'.
   *
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating non-negative
   * number values.
   */
  nonNegativeNum(envcheck = false) {
    return envcheck
      ? z
          .union([
            z
              .string()
              .trim()
              .refine(
                (value) =>
                  value === 'null' ||
                  value === '' ||
                  (!isNaN(Number(value)) && Number(value) >= 0),
                {
                  params: {
                    errorMessage: `The value must be numeric and non-negative`
                  }
                }
              )
              .transform((value) =>
                value !== 'null' && value !== '' ? Number(value) : null
              ),
            z.number().nonnegative()
          ])
          .nullable()
      : z.number().nonnegative();
  },

  /**
   * The startsWith validator that returns a Zod schema for validating whether a
   * string starts with any of the values provided in the prefixes array with an
   * optional environment variables check and transformation based on the
   * `envcheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the schema will accept trimmed string values
   * that start with values from the prefixes array.
   *
   * - When `envcheck` is true, the URL can also be null, stringified null or
   * empty string, and the schema will transform the empty string and
   * stringified null to null.
   *
   * @param {string[]} prefixes - An array of prefixes to validate the string
   * against.
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating a string.
   */
  startsWith(prefixes, envcheck = false) {
    // The custom validate function based on envcheck
    const validate = z
      .string()
      .trim()
      .refine(
        (value) =>
          prefixes.some((prefix) => value.startsWith(prefix)) ||
          (envcheck && (value === 'null' || value === '')),
        {
          params: {
            errorMessage: `The value must be a string that starts with ${prefixes.join(', ')}`
          }
        }
      );

    // Return correct variant of validation chain
    return envcheck
      ? validate
          .transform((value) =>
            value !== 'null' && value !== '' ? value : null
          )
          .nullable()
      : validate;
  }
};

/**
 * Object with custom specific validators and transformers to avoid repetition
 * in schema objects. All validators work both for values from the .env file and
 * config options from the object. The `envcheck` flag allows parsing/
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
   * string, stringified null, or null.
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
          value === 'null' ||
          value === '' ||
          (value.length >= 6 && value.endsWith('.json')) ||
          (value.length >= 5 && value.endsWith('.svg')),
        {
          params: {
            errorMessage: `The value must be a string that ends with .json or .svg`
          }
        }
      )
      .transform((value) => (value !== 'null' && value !== '' ? value : null))
      .nullable();
  },

  /**
   * The outfile validator that returns a Zod schema for validating output file
   * names with specific extensions.
   *
   * The validation schema ensures that the schema will accept trimmed string
   * values that end with '.jpeg', '.jpg', '.png', '.pdf', or '.svg', are at
   * least one character long excluding the extension, and will be null if the
   * provided value is an empty string, stringified null, or null.
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
          value === 'null' ||
          value === '' ||
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
      .transform((value) => (value !== 'null' && value !== '' ? value : null))
      .nullable();
  },

  /**
   * The outfile validator that returns a Zod schema for validating custom
   * config file names with specific extensions.
   *
   * The validation schema ensures that the schema will accept trimmed string
   * values that end with '.json', are  at least one character long excluding
   * the extension, and will be null if the provided value is an empty string,
   * stringified null, or null.
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
          value === 'null' ||
          value === '' ||
          (value.length >= 6 && value.endsWith('.json')),
        {
          params: {
            errorMessage: `The value must be a string that ends with .json`
          }
        }
      )
      .transform((value) => (value !== 'null' && value !== '' ? value : null))
      .nullable();
  },

  /**
   * The object validator that returns a Zod schema for validating the
   * options object.
   *
   * The validation schema ensures that the schema will accept any key-value
   * pairs object, trimmed string object, and will be null if the provided value
   * is an empty string, stringified null, or null.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the options
   * object.
   */
  object() {
    return z
      .union([
        z
          .string()
          .trim()
          .transform((value) =>
            value !== 'null' && value !== '' ? value : null
          ),
        z.record(z.string(), z.any())
      ])
      .nullable();
  },

  /**
   * The resources validator that returns a Zod schema for validating the
   * resources object.
   *
   * The validation schema ensures that the schema will accept a partial object
   * with allowed properties `js`, `css`, and `files` and null. Additionaly,
   * each of the allowed properties can be null.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the resources
   * object.
   */
  resources() {
    return z
      .object({
        js: v.nullishString(),
        css: v.nullishString(),
        files: v.stringArray()
      })
      .partial()
      .nullable();
  },

  /**
   * The version validator that returns a Zod schema for validating the
   * Highcharts version with an optional environment variables check and
   * transformation based on the `envcheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the schema will accept trimmed string values
   * that are a RegExp-based values that allows to be 'latest', or in the format
   * XX, XX.YY, or XX.YY.ZZ, where XX, YY, and ZZ are numeric for the Highcharts
   * version option.
   *
   * - When `envcheck` is true, the version can also be null, an empty string,
   * or a stringified null and in all cases the schema will transform them to
   * null.
   *
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the version
   * of Highcharts.
   */
  version(envcheck = false) {
    const validate = z
      .string()
      .trim()
      .refine(
        (value) =>
          /^(latest|\d{1,2}(\.\d{1,2}){0,2})$/.test(value) ||
          (envcheck && (value === 'null' || value === '')),
        {
          params: {
            errorMessage:
              "The value must be 'latest', a major version, or in the form XX.YY.ZZ"
          }
        }
      );

    // Return correct variant of the validation chain
    return envcheck
      ? validate
          .transform((value) =>
            value !== 'null' && value !== '' ? value : null
          )
          .nullable()
      : validate;
  },

  /**
   * The scale validator that returns a Zod schema for validating the scale of a
   * chart with an optional environment variables check and transformation based
   * on the `envcheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the schema will accept number values that are
   * between 0.1 and 5 (inclusive).
   *
   * - When `envcheck` is true, additionally the value can be null, a string
   * that is empty, or stringified null which will be transformed to null or can
   * represents a number between 0.1 and 5 (inclusive).
   *
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the scale of a
   * chart.
   */
  scale(envcheck = false) {
    // The string schema for the scale
    const stringSchema = z
      .string()
      .trim()
      .refine(
        (value) =>
          value === 'null' ||
          value === '' ||
          (!isNaN(Number(value)) &&
            value !== true &&
            !value.startsWith('[') &&
            Number(value) >= 0.1 &&
            Number(value) <= 5),
        {
          params: {
            errorMessage: 'The value must be within a 0.1 and 5.0 range'
          }
        }
      )
      .transform((value) =>
        value !== 'null' && value !== '' ? Number(value) : null
      );

    // The number schema for the scale
    const numberSchema = z.number().gte(0.1).lte(5);

    // Based on the envcheck, choose the correct one
    return envcheck
      ? z.union([numberSchema, stringSchema]).nullable()
      : numberSchema;
  },

  /**
   * The logLevel validator that returns a Zod schema for validating the logging
   * level with an optional environment variables check and transformation based
   * on the `envcheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the schema will accept integer number values
   * that are between 1 and 5 (inclusive).
   *
   * - When `envcheck` is true, additionally the value can be null, a string
   * that is empty, or stringified null which will be transformed to null or can
   * represents an integer number between 1 and 5 (inclusive).
   *
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the logging
   * level.
   */
  logLevel(envcheck = false) {
    // The string schema for the loglevel
    const stringSchema = z
      .string()
      .trim()
      .refine(
        (value) =>
          value === 'null' ||
          value === '' ||
          (!isNaN(Number(value)) &&
            value !== true &&
            !value.startsWith('[') &&
            Number.isInteger(Number(value)) &&
            Number(value) >= 1 &&
            Number(value) <= 5),
        {
          params: {
            errorMessage: 'The value must be within a 1 and 5 range'
          }
        }
      )
      .transform((value) =>
        value !== 'null' && value !== '' ? Number(value) : null
      );

    // The number schema for the scale
    const numberSchema = z.number().int().gte(1).lte(5);

    // Based on the envcheck, choose the correct one
    return envcheck
      ? z.union([numberSchema, stringSchema]).nullable()
      : numberSchema;
  },

  /**
   * The scriptsArray validator that returns a Zod schema for validating the
   * Highcharts scripts array with an optional environment variables check and
   * transformation based on the `envcheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the scripts array can be an array of strings.
   *
   * - When `envcheck` is true, the scripts array can also be a single string
   * that will be split into an array using commas as delimiters.
   *
   * All values in the array will be trimmed and filtered based on the
   * `filterArray`.
   *
   * @param {string[]} filterArray - An array of valid script  names to
   * filter against.
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating
   * and transforming the Highcharts scripts array.
   */
  scriptsArray(filterArray, envcheck = false) {
    // Return correct variant of the validation chain
    return (envcheck ? z.coerce.string() : z.coerce.string().array())
      .transform((value) => {
        if (envcheck) {
          if (value.startsWith('[')) {
            value = value.slice(1);
          }
          if (value.endsWith(']')) {
            value = value.slice(0, -1);
          }
          value = value.split(',');
        }

        // If an initial value is string, split it to an array first
        return value
          .map((value) => value.trim())
          .filter((value) => filterArray.includes(value));
      })
      .transform((value) => (value.length ? value : []));
  },

  /**
   * The customScriptsArray validator that returns a Zod schema for validating
   * the URLs of custom scripts array with an optional environment variables
   * check and transformation based on the `envcheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `envcheck` is false, the scripts array can be an array of strings.
   *
   * - When `envcheck` is true, the scripts array can also be a single string
   * that will be split into an array using commas as delimiters.
   *
   * All values in the array will be trimmed and filtered based
   * on the check if they start with either https:// or http://.
   *
   * @param {boolean} [envcheck=false] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating
   * and transforming the URLs of custom scripts array.
   */
  customScriptsArray(envcheck = false) {
    // Return correct variant of the validation chain
    return (envcheck ? z.coerce.string() : z.coerce.string().array())
      .transform((value) => {
        if (envcheck) {
          if (value.startsWith('[')) {
            value = value.slice(1);
          }
          if (value.endsWith(']')) {
            value = value.slice(0, -1);
          }
          value = value.split(',');
        }

        // If an initial value is string, split it to an array first
        return value
          .map((value) => value.trim())
          .filter(
            (value) =>
              value.startsWith('https://') || value.startsWith('http://')
          );
      })
      .transform((value) => (value.length ? value : []));
  }
};

export const EnvSchema = z.object({
  // highcharts
  HIGHCHARTS_VERSION: c.version(true),
  HIGHCHARTS_CDN_URL: v.startsWith(['http://', 'https://'], true),
  HIGHCHARTS_FORCE_FETCH: v.boolean(true),
  HIGHCHARTS_CACHE_PATH: v.nullishString(),
  HIGHCHARTS_ADMIN_TOKEN: v.nullishString(),
  HIGHCHARTS_CORE_SCRIPTS: c.scriptsArray(scriptsNames.core, true),
  HIGHCHARTS_MODULE_SCRIPTS: c.scriptsArray(scriptsNames.modules, true),
  HIGHCHARTS_INDICATOR_SCRIPTS: c.scriptsArray(scriptsNames.indicators, true),
  HIGHCHARTS_CUSTOM_SCRIPTS: c.customScriptsArray(true),

  // export
  EXPORT_TYPE: v.enum(['jpeg', 'jpg', 'png', 'pdf', 'svg'], true),
  EXPORT_CONSTR: v.enum(
    ['chart', 'stockChart', 'mapChart', 'ganttChart'],
    true
  ),
  EXPORT_DEFAULT_HEIGHT: v.positiveNum(true),
  EXPORT_DEFAULT_WIDTH: v.positiveNum(true),
  EXPORT_DEFAULT_SCALE: c.scale(true),
  EXPORT_RASTERIZATION_TIMEOUT: v.nonNegativeNum(true),

  // custom
  CUSTOM_LOGIC_ALLOW_CODE_EXECUTION: v.boolean(true),
  CUSTOM_LOGIC_ALLOW_FILE_RESOURCES: v.boolean(true),

  // server
  SERVER_ENABLE: v.boolean(true),
  SERVER_HOST: v.nullishString(),
  SERVER_PORT: v.nonNegativeNum(true),
  SERVER_BENCHMARKING: v.boolean(true),

  // server proxy
  SERVER_PROXY_HOST: v.nullishString(),
  SERVER_PROXY_PORT: v.nonNegativeNum(true),
  SERVER_PROXY_TIMEOUT: v.nonNegativeNum(true),

  // server rate limiting
  SERVER_RATE_LIMITING_ENABLE: v.boolean(true),
  SERVER_RATE_LIMITING_MAX_REQUESTS: v.nonNegativeNum(true),
  SERVER_RATE_LIMITING_WINDOW: v.nonNegativeNum(true),
  SERVER_RATE_LIMITING_DELAY: v.nonNegativeNum(true),
  SERVER_RATE_LIMITING_TRUST_PROXY: v.boolean(true),
  SERVER_RATE_LIMITING_SKIP_KEY: v.nullishString(),
  SERVER_RATE_LIMITING_SKIP_TOKEN: v.nullishString(),

  // server ssl
  SERVER_SSL_ENABLE: v.boolean(true),
  SERVER_SSL_FORCE: v.boolean(true),
  SERVER_SSL_PORT: v.nonNegativeNum(true),
  SERVER_SSL_CERT_PATH: v.nullishString(),

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

  // logging
  LOGGING_LEVEL: c.logLevel(true),
  LOGGING_FILE: v.nullishString(),
  LOGGING_DEST: v.nullishString(),
  LOGGING_TO_CONSOLE: v.boolean(true),
  LOGGING_TO_FILE: v.boolean(true),

  // ui
  UI_ENABLE: v.boolean(true),
  UI_ROUTE: v.startsWith(['/'], true),

  // other
  OTHER_NODE_ENV: v.enum(['development', 'production', 'test'], true),
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
  DEBUG_DEBUGGING_PORT: v.nonNegativeNum(true),

  // websocket
  WEB_SOCKET_ENABLE: v.boolean(true),
  WEB_SOCKET_RECONNECT: v.boolean(true),
  WEB_SOCKET_REJECT_UNAUTHORIZED: v.boolean(true),
  WEB_SOCKET_PING_TIMEOUT: v.nonNegativeNum(true),
  WEB_SOCKET_RECONNECT_INTERVAL: v.nonNegativeNum(true),
  WEB_SOCKET_RECONNECT_ATTEMPTS: v.nonNegativeNum(true),
  WEB_SOCKET_MESSAGE_INTERVAL: v.nonNegativeNum(true),
  WEB_SOCKET_GATHER_ALL_OPTIONS: v.boolean(true),
  WEB_SOCKET_URL: v.startsWith(['ws://', 'wss://'], true),
  WEB_SOCKET_SECRET: v.nullishString()
});

// Schema for the puppeteer section of options
export const PuppeteerSchema = z.object({
  args: v.stringArray()
});

// Schema for the highcharts section of options
export const HighchartsSchema = z.object({
  version: c.version(),
  cdnUrl: v.startsWith(['http://', 'https://']),
  forceFetch: v.boolean(),
  cachePath: v.strictString(),
  coreScripts: c.scriptsArray(scriptsNames.core),
  moduleScripts: c.scriptsArray(scriptsNames.modules),
  indicatorScripts: c.scriptsArray(scriptsNames.indicators),
  customScripts: c.customScriptsArray()
});

export const ExportSchema = z.object({
  infile: c.infile(),
  instr: v.nullishString(),
  options: v.nullishString(),
  outfile: c.outfile(),
  type: v.enum(['jpeg', 'jpg', 'png', 'pdf', 'svg']),
  constr: v.enum(['chart', 'stockChart', 'mapChart', 'ganttChart']),
  defaultHeight: v.positiveNum(),
  defaultWidth: v.positiveNum(),
  defaultScale: c.scale(),
  height: v.positiveNum().nullable(),
  width: v.positiveNum().nullable(),
  scale: c.scale().nullable(),
  globalOptions: c.object(),
  themeOptions: c.object(),
  batch: v.nullishString(),
  rasterizationTimeout: v.nonNegativeNum()
});

export const CustomLogicSchema = z.object({
  allowCodeExecution: v.boolean(),
  allowFileResources: v.boolean(),
  customCode: v.nullishString(),
  callback: v.nullishString(),
  resources: c.resources(),
  loadConfig: c.customConfig(),
  createConfig: c.customConfig()
});

export const ProxySchema = z.object({
  host: v.nullishString(),
  port: v.nonNegativeNum().nullable(),
  timeout: v.nonNegativeNum()
});

export const RateLimitingSchema = z.object({
  enable: v.boolean(),
  maxRequests: v.nonNegativeNum(),
  window: v.nonNegativeNum(),
  delay: v.nonNegativeNum(),
  trustProxy: v.boolean(),
  skipKey: v.nullishString(),
  skipToken: v.nullishString()
});

export const SslSchema = z.object({
  enable: v.boolean(),
  force: v.boolean(),
  port: v.nonNegativeNum(),
  certPath: v.nullishString()
});

export const ServerSchema = z.object({
  enable: v.boolean(),
  host: v.strictString(),
  port: v.nonNegativeNum(),
  benchmarking: v.boolean(),
  proxy: ProxySchema,
  rateLimiting: RateLimitingSchema,
  ssl: SslSchema
});

export const PoolSchema = z.object({
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

export const LoggingSchema = z.object({
  level: c.logLevel(),
  file: v.strictString(),
  dest: v.strictString(),
  toConsole: v.boolean(),
  toFile: v.boolean()
});

export const UiSchema = z.object({
  enable: v.boolean(),
  route: v.startsWith(['/'])
});

export const OtherSchema = z.object({
  nodeEnv: v.enum(['development', 'production', 'test']),
  listenToProcessExits: v.boolean(),
  noLogo: v.boolean(),
  hardResetPage: v.boolean(),
  browserShellMode: v.boolean()
});

export const DebugSchema = z.object({
  enable: v.boolean(),
  headless: v.boolean(),
  devtools: v.boolean(),
  listenToConsole: v.boolean(),
  dumpio: v.boolean(),
  slowMo: v.nonNegativeNum(),
  debuggingPort: v.nonNegativeNum()
});

export const WebSocketSchema = z.object({
  enable: v.boolean(),
  reconnect: v.boolean(),
  rejectUnauthorized: v.boolean(),
  pingTimeout: v.nonNegativeNum(),
  reconnectInterval: v.nonNegativeNum(),
  reconnectAttempts: v.nonNegativeNum(),
  messageInterval: v.nonNegativeNum(),
  gatherAllOptions: v.boolean(),
  url: v.startsWith(['ws://', 'wss://']),
  secret: v.nullishString()
});

export const ConfigSchema = z.object({
  puppeteer: PuppeteerSchema,
  highcharts: HighchartsSchema,
  export: ExportSchema,
  customLogic: CustomLogicSchema,
  server: ServerSchema,
  pool: PoolSchema,
  logging: LoggingSchema,
  ui: UiSchema,
  other: OtherSchema,
  debug: DebugSchema,
  webSocket: WebSocketSchema
});

export const envs = EnvSchema.partial().parse(process.env);

export const validateAndParse = (configOptions) =>
  ConfigSchema.partial().parse(configOptions);
