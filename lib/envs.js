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

// Load the .env into environment variables
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
 * Object containing custom general validators and parsers to avoid repetition
 * in schema objects. All validators apply to values from various sources,
 * including the default config file, a custom JSON file loaded with the
 * loadConfig option, the .env file, and CLI arguments. The `strictCheck` flag
 * enables stricter validation and parsing rules. This flag is set to false
 * for values that come from the .env file or CLI arguments because they are
 * provided as strings and need to be parsed accordingly first.
 */
const v = {
  /**
   * The boolean validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the accepted values are true and false and
   * the schema will validate against the default boolean validator.
   *
   * - When `strictCheck` is false, the accepted values are true, false, null,
   * 'true', 'false', 'undefined', 'null', and ''. The strings 'undefined',
   * 'null' and '' will be transformed to null, the string 'true' will be
   * transformed to the boolean value true, and 'false' will be transformed to
   * the boolean value false.
   *
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
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
   * The string validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept trimmed strings except
   * the forbidden values: 'false', 'undefined', 'NaN', 'null', and ''.
   *
   * - When `strictCheck` is true, the schema will accept trimmed strings and
   * null. The forbidden values: 'false', 'undefined', 'NaN', 'null', and ''
   * will be transformed to null.
   *
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating string values.
   */
  string(strictCheck) {
    return strictCheck
      ? z
          .string()
          .trim()
          .refine(
            (value) =>
              !['false', 'undefined', 'NaN', 'null', ''].includes(value),
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
            !['false', 'undefined', 'NaN', 'null', ''].includes(value)
              ? value
              : null
          )
          .nullable();
  },

  /**
   * The enum validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   * The schema will validate against the provided `values` array.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will validate against the `values`
   * array with the default enum validator.
   *
   * - When `strictCheck` is false, null, 'undefined', 'null', and '' are added
   * to the list of accepted values, which will be transformed to null.
   *
   * @param {Array<string>} values - An array of valid string values for the
   * enum.
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
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
   * The object validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter.
   *
   *  The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept any key-value pairs
   * objects and null.
   *
   * - When `strictCheck` is false, the schema will accept any key-value pairs
   * objects, null and trimmed string values which start with the '{' and end
   * with the '}' and will be transformed to null if the provided value is
   * 'undefined', 'null', or ''.
   *
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating object values.
   */
  object(strictCheck) {
    return strictCheck
      ? z.object({}).passthrough().nullable()
      : z
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
                    errorMessage: `The value must be a string that starts with '{' and ends with '}'`
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
   * The stringArray validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept an array of trimmed
   * string values filtered from the forbidden values: 'false', 'undefined',
   * 'NaN', 'null', and ''.
   *
   * - When `strictCheck` is false, the schema will accept null and a trimmed
   * string values which will be splitted into an array of strings and filtered
   * from the '[' and ']' characters and forbidden values: 'false', 'undefined',
   * 'NaN', 'null', and ''. If the array is empty, it will be transformed to
   * null.
   *
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating array of string
   * values.
   */
  stringArray(strictCheck) {
    return strictCheck
      ? z
          .string()
          .trim()
          .array()
          .transform((value) => {
            // Filter array elements
            return value
              .map((v) => v.trim())
              .filter(
                (v) => !['false', 'undefined', 'NaN', 'null', ''].includes(v)
              );
          })
      : z
          .string()
          .trim()
          .transform((value) => {
            // If present, remove the start square bracket from a string
            if (value.startsWith('[')) {
              value = value.slice(1);
            }

            // If present, remove the end square bracket from a string
            if (value.endsWith(']')) {
              value = value.slice(0, -1);
            }

            // Finally, split it to an array
            value = value.split(',');

            // Filter array elements
            return value
              .map((v) => v.trim())
              .filter(
                (v) => !['false', 'undefined', 'NaN', 'null', ''].includes(v)
              );
          })
          .transform((value) => (value.length ? value : null))
          .nullable();
  },

  /**
   * The positiveNum validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept positive number values
   * and validate against the default positive number validator.
   *
   * - When `strictCheck` is false, the schema will accept positive number
   * values and trimmed string values that can either be empty, 'null', or
   * represent a positive number. It will transform the string to a positive
   * number, or to null if it is 'undefined', 'null' or ''.
   *
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
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
   * The nonNegativeNum validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept non-negative number
   * values and validate against the default positive number validator.
   *
   * - When `strictCheck` is false, the schema will accept non-negative number
   * values and trimmed string values that can either be empty, 'null', or
   * represent a non-negative number. It will transform the string to a
   * non-negative number, or to null if it is 'undefined', 'null' or ''.
   *
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
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
   * The startsWith validator that returns a Zod schema with an optional
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
   * @param {string[]} prefixes - An array of prefixes to validate the string
   * against.
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating string values.
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
  }
};

/**
 * Object containing custom specific validators and parsers to avoid repetition
 * in schema objects. All validators apply to values from various sources,
 * including the default config file, a custom JSON file loaded with the
 * loadConfig option, the .env file, and CLI arguments. The `strictCheck` flag
 * enables stricter parsing and validation rules. This flag is set to false
 * for values that come from the .env file or CLI arguments because they are
 * provided as strings and need to be parsed accordingly first.
 */
const c = {
  /**
   * The infile validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter for validating input file name
   * with the specified extension.
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
   * 'null' or ''.
   *
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating an input file
   * name with the specified extension.
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
   * The outfile validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter for validating output file name
   * with the specified extension.
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
   * value is null, 'undefined', 'null' or ''.
   *
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
   *
   * @returns {z.ZodSchema} A Zod schema object for validating output file name
   * with the specified extension.
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
   * The version validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter for validating the version of
   * Highcharts.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept trimmed string values
   * that are a RegExp-based values that allows to be 'latest', or in the format
   * XX, XX.YY, or XX.YY.ZZ, where XX, YY, and ZZ are numeric for the Highcharts
   * version option.
   *
   * - When `strictCheck` is false, the version can also be null, 'undefined',
   * 'null' or '' and in all cases the schema will transform them to null.
   *
   * @param {boolean} [strictCheck] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the version
   * of Highcharts.
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
   * The scale validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter for validating the scale of a
   * chart.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept number values that are
   * between 0.1 and 5 (inclusive).
   *
   * - When `strictCheck` is false, the schema will accept number values and
   * stringified number values that are between 0.1 and 5 (inclusive), null,
   * 'undefined', 'null' and '' which will be transformed to null.
   *
   * @param {boolean} [strictCheck] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the scale of a
   * chart.
   */
  scale(strictCheck) {
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
   * The logLevel validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter for validating the logging
   * level.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept integer number values
   * that are between 1 and 5 (inclusive).
   *
   * - When `strictCheck` is false, the schema will accept integer number values
   * and stringified integer number values that are between 1 and 5 (inclusive),
   * null, 'undefined', 'null' or '' which will be transformed to null.
   *
   * @param {boolean} [strictCheck] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the logging
   * level.
   */
  logLevel(strictCheck) {
    return strictCheck
      ? z.number().int().gte(1).lte(5)
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
                    Number(value) >= 1 &&
                    Number(value) <= 5) ||
                  ['undefined', 'null', ''].includes(value),
                {
                  params: {
                    errorMessage: 'The value must be within a 1 and 5 range'
                  }
                }
              )
              .transform((value) =>
                !['undefined', 'null', ''].includes(value)
                  ? Number(value)
                  : null
              ),
            z.number().int().gte(1).lte(5)
          ])
          .nullable();
  },

  /**
   * The resources validator that returns a Zod schema with an optional stricter
   * check based on the `strictCheck` parameter for validating the resources
   * object.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the schema will accept a partial object
   * with allowed properties `js`, `css`, and `files` where each of the allowed
   * properties can be null, stringified version of the object, string that ends
   * with the '.json' and null.
   *
   * - When `strictCheck` is false, the schema will accept a stringified version
   * of a partial object with allowed properties `js`, `css`, and `files` where
   * each of the allowed properties can be null, string that ends with the
   * '.json' and will be null if the provided value is an empty string or 'null'.
   *
   * @param {boolean} [strictCheck] - Determines if stricter validation
   * should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the resources
   * object.
   */
  resources(strictCheck) {
    const objectSchema = z
      .object({
        js: v.string(false),
        css: v.string(false),
        files: v.stringArray(true).nullable()
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
   * The scriptsArray validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter for validating the
   * Highcharts scripts array.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the scripts array can be an array of strings.
   *
   * - When `strictCheck` is false, the scripts array can be null and a single
   * string that will be split into an array using commas as delimiters.
   *
   * All values in the array will be trimmed and filtered based on the
   * `filterArray`.
   *
   * @param {string[]} filterArray - An array of valid script names to filter
   * against.
   * @param {boolean} [strictCheck] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the Highcharts
   * scripts array.
   */
  scriptsArray(filterArray, strictCheck) {
    return strictCheck
      ? z
          .string()
          .trim()
          .array()
          .transform((value) =>
            value
              .map((value) => value.trim())
              .filter((value) => filterArray.includes(value))
          )
      : z
          .string()
          .trim()
          .transform((value) => {
            // If present, remove the start square bracket from a string
            if (value.startsWith('[')) {
              value = value.slice(1);
            }

            // If present, remove the end square bracket from a string
            if (value.endsWith(']')) {
              value = value.slice(0, -1);
            }

            // Finally, split it to an array
            value = value.split(',');

            // Filter array elements
            return value
              .map((value) => value.trim())
              .filter((value) => filterArray.includes(value));
          })
          .transform((value) => (value.length ? value : null))
          .nullable();
  },

  /**
   * The customScriptsArray validator that returns a Zod schema with an optional
   * stricter check based on the `strictCheck` parameter for validating the URLs
   * of custom scripts array.
   *
   * The validation schema ensures that:
   *
   * - When `strictCheck` is true, the scripts array can be an array of strings.
   *
   * - When `strictCheck` is false, the scripts array can be null and a single
   * string that will be split into an array using commas as delimiters.
   *
   * All values in the array will be trimmed and filtered based on the check if
   * they start with either https:// or http://.
   *
   * @param {boolean} [strictCheck] - Determines if environment variables
   * validation should be applied.
   *
   * @returns {z.ZodSchema} - A Zod schema object for validating the URLs of
   * custom scripts array.
   */
  customScriptsArray(strictCheck) {
    return strictCheck
      ? z
          .string()
          .trim()
          .array()
          .transform((value) => value.map((value) => value.trim()))
      : z
          .string()
          .trim()
          .transform((value) => {
            // If present, remove the start square bracket from a string
            if (value.startsWith('[')) {
              value = value.slice(1);
            }

            // If present, remove the end square bracket from a string
            if (value.endsWith(']')) {
              value = value.slice(0, -1);
            }

            // Finally, split it to an array
            value = value.split(',');

            // Filter array elements
            return value
              .map((value) => value.trim())
              .filter(
                (value) =>
                  value.startsWith('https://') || value.startsWith('http://')
              );
          })
          .transform((value) => (value.length ? value : null))
          .nullable();
  }
};

// Schema for the puppeteer section of options
const PuppeteerSchema = (strictCheck) =>
  z
    .object({
      args: v.stringArray(strictCheck)
    })
    .partial();

// Schema for the highcharts section of options
const HighchartsSchema = (strictCheck) =>
  z
    .object({
      version: c.version(strictCheck),
      cdnUrl: v.startsWith(['http://', 'https://'], strictCheck),
      forceFetch: v.boolean(strictCheck),
      cachePath: v.string(strictCheck),
      coreScripts: c.scriptsArray(scriptsNames.core, strictCheck),
      moduleScripts: c.scriptsArray(scriptsNames.modules, strictCheck),
      indicatorScripts: c.scriptsArray(scriptsNames.indicators, strictCheck),
      customScripts: c.customScriptsArray(strictCheck)
    })
    .partial();

const ExportSchema = (strictCheck) =>
  z
    .object({
      infile: c.infile(strictCheck),
      instr: v.object(strictCheck),
      options: v.object(strictCheck),
      outfile: c.outfile(strictCheck),
      type: v.enum(['jpeg', 'jpg', 'png', 'pdf', 'svg'], strictCheck),
      constr: v.enum(
        ['chart', 'stockChart', 'mapChart', 'ganttChart'],
        strictCheck
      ),
      defaultHeight: v.positiveNum(strictCheck),
      defaultWidth: v.positiveNum(strictCheck),
      defaultScale: c.scale(strictCheck),
      height: v.positiveNum(strictCheck).nullable(),
      width: v.positiveNum(strictCheck).nullable(),
      scale: c.scale(strictCheck).nullable(),
      globalOptions: v.object(strictCheck),
      themeOptions: v.object(strictCheck),
      batch: v.string(false),
      rasterizationTimeout: v.nonNegativeNum(strictCheck)
    })
    .partial();

const CustomLogicSchema = (strictCheck) =>
  z
    .object({
      allowCodeExecution: v.boolean(strictCheck),
      allowFileResources: v.boolean(strictCheck),
      customCode: v.string(false),
      callback: v.string(false),
      resources: c.resources(strictCheck),
      loadConfig: v.string(false),
      createConfig: v.string(false)
    })
    .partial();

const ProxySchema = (strictCheck) =>
  z
    .object({
      host: v.string(false),
      port: v.nonNegativeNum(strictCheck).nullable(),
      timeout: v.nonNegativeNum(strictCheck)
    })
    .partial();

const RateLimitingSchema = (strictCheck) =>
  z
    .object({
      enable: v.boolean(strictCheck),
      maxRequests: v.nonNegativeNum(strictCheck),
      window: v.nonNegativeNum(strictCheck),
      delay: v.nonNegativeNum(strictCheck),
      trustProxy: v.boolean(strictCheck),
      skipKey: v.string(false),
      skipToken: v.string(false)
    })
    .partial();

const SslSchema = (strictCheck) =>
  z
    .object({
      enable: v.boolean(strictCheck),
      force: v.boolean(strictCheck),
      port: v.nonNegativeNum(strictCheck),
      certPath: v.string(false)
    })
    .partial();

const ServerSchema = (strictCheck) =>
  z.object({
    enable: v.boolean(strictCheck).optional(),
    host: v.string(strictCheck).optional(),
    port: v.nonNegativeNum(strictCheck).optional(),
    benchmarking: v.boolean(strictCheck).optional(),
    proxy: ProxySchema(strictCheck).optional(),
    rateLimiting: RateLimitingSchema(strictCheck).optional(),
    ssl: SslSchema(strictCheck).optional()
  });

const PoolSchema = (strictCheck) =>
  z
    .object({
      minWorkers: v.positiveNum(strictCheck),
      maxWorkers: v.positiveNum(strictCheck),
      workLimit: v.positiveNum(strictCheck),
      acquireTimeout: v.nonNegativeNum(strictCheck),
      createTimeout: v.nonNegativeNum(strictCheck),
      destroyTimeout: v.nonNegativeNum(strictCheck),
      idleTimeout: v.nonNegativeNum(strictCheck),
      createRetryInterval: v.nonNegativeNum(strictCheck),
      reaperInterval: v.nonNegativeNum(strictCheck),
      benchmarking: v.boolean(strictCheck)
    })
    .partial();

const LoggingSchema = (strictCheck) =>
  z
    .object({
      level: c.logLevel(strictCheck),
      file: v.string(strictCheck),
      dest: v.string(strictCheck),
      toConsole: v.boolean(strictCheck),
      toFile: v.boolean(strictCheck)
    })
    .partial();

const UiSchema = (strictCheck) =>
  z
    .object({
      enable: v.boolean(strictCheck),
      route: v.startsWith(['/'], strictCheck)
    })
    .partial();

const OtherSchema = (strictCheck) =>
  z
    .object({
      nodeEnv: v.enum(['development', 'production', 'test'], strictCheck),
      listenToProcessExits: v.boolean(strictCheck),
      noLogo: v.boolean(strictCheck),
      hardResetPage: v.boolean(strictCheck),
      browserShellMode: v.boolean(strictCheck)
    })
    .partial();

const DebugSchema = (strictCheck) =>
  z
    .object({
      enable: v.boolean(strictCheck),
      headless: v.boolean(strictCheck),
      devtools: v.boolean(strictCheck),
      listenToConsole: v.boolean(strictCheck),
      dumpio: v.boolean(strictCheck),
      slowMo: v.nonNegativeNum(strictCheck),
      debuggingPort: v.nonNegativeNum(strictCheck)
    })
    .partial();

const WebSocketSchema = (strictCheck) =>
  z
    .object({
      enable: v.boolean(strictCheck),
      reconnect: v.boolean(strictCheck),
      rejectUnauthorized: v.boolean(strictCheck),
      pingTimeout: v.nonNegativeNum(strictCheck),
      reconnectInterval: v.nonNegativeNum(strictCheck),
      reconnectAttempts: v.nonNegativeNum(strictCheck),
      messageInterval: v.nonNegativeNum(strictCheck),
      gatherAllOptions: v.boolean(strictCheck),
      url: v.startsWith(['ws://', 'wss://'], strictCheck).nullable(),
      secret: v.string(false)
    })
    .partial();

export const ConfigSchema = z.object({
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
  webSocket: WebSocketSchema(true)
});

export const PayloadSchema = z.object({
  svg: v.string(),
  b64: v.string(),
  noDownload: v.boolean(),
  requestId: z.string().uuid()
});

export const CliSchema = z.object({
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
  webSocket: WebSocketSchema(false)
});

export const EnvSchema = z.object({
  // puppeteer
  PUPPETEER_ARGS: v.stringArray(false),

  // highcharts
  HIGHCHARTS_VERSION: c.version(false),
  HIGHCHARTS_CDN_URL: v.startsWith(['http://', 'https://'], false),
  HIGHCHARTS_FORCE_FETCH: v.boolean(false),
  HIGHCHARTS_CACHE_PATH: v.string(false),
  HIGHCHARTS_ADMIN_TOKEN: v.string(false),
  HIGHCHARTS_CORE_SCRIPTS: c.scriptsArray(scriptsNames.core, false),
  HIGHCHARTS_MODULE_SCRIPTS: c.scriptsArray(scriptsNames.modules, false),
  HIGHCHARTS_INDICATOR_SCRIPTS: c.scriptsArray(scriptsNames.indicators, false),
  HIGHCHARTS_CUSTOM_SCRIPTS: c.customScriptsArray(false),

  // export
  EXPORT_TYPE: v.enum(['jpeg', 'jpg', 'png', 'pdf', 'svg'], false),
  EXPORT_CONSTR: v.enum(
    ['chart', 'stockChart', 'mapChart', 'ganttChart'],
    false
  ),
  EXPORT_DEFAULT_HEIGHT: v.positiveNum(false),
  EXPORT_DEFAULT_WIDTH: v.positiveNum(false),
  EXPORT_DEFAULT_SCALE: c.scale(false),
  EXPORT_RASTERIZATION_TIMEOUT: v.nonNegativeNum(false),

  // custom
  CUSTOM_LOGIC_ALLOW_CODE_EXECUTION: v.boolean(false),
  CUSTOM_LOGIC_ALLOW_FILE_RESOURCES: v.boolean(false),

  // server
  SERVER_ENABLE: v.boolean(false),
  SERVER_HOST: v.string(false),
  SERVER_PORT: v.nonNegativeNum(false),
  SERVER_BENCHMARKING: v.boolean(false),

  // server proxy
  SERVER_PROXY_HOST: v.string(false),
  SERVER_PROXY_PORT: v.nonNegativeNum(false),
  SERVER_PROXY_TIMEOUT: v.nonNegativeNum(false),

  // server rate limiting
  SERVER_RATE_LIMITING_ENABLE: v.boolean(false),
  SERVER_RATE_LIMITING_MAX_REQUESTS: v.nonNegativeNum(false),
  SERVER_RATE_LIMITING_WINDOW: v.nonNegativeNum(false),
  SERVER_RATE_LIMITING_DELAY: v.nonNegativeNum(false),
  SERVER_RATE_LIMITING_TRUST_PROXY: v.boolean(false),
  SERVER_RATE_LIMITING_SKIP_KEY: v.string(false),
  SERVER_RATE_LIMITING_SKIP_TOKEN: v.string(false),

  // server ssl
  SERVER_SSL_ENABLE: v.boolean(false),
  SERVER_SSL_FORCE: v.boolean(false),
  SERVER_SSL_PORT: v.nonNegativeNum(false),
  SERVER_SSL_CERT_PATH: v.string(false),

  // pool
  POOL_MIN_WORKERS: v.positiveNum(false),
  POOL_MAX_WORKERS: v.positiveNum(false),
  POOL_WORK_LIMIT: v.positiveNum(false),
  POOL_ACQUIRE_TIMEOUT: v.nonNegativeNum(false),
  POOL_CREATE_TIMEOUT: v.nonNegativeNum(false),
  POOL_DESTROY_TIMEOUT: v.nonNegativeNum(false),
  POOL_IDLE_TIMEOUT: v.nonNegativeNum(false),
  POOL_CREATE_RETRY_INTERVAL: v.nonNegativeNum(false),
  POOL_REAPER_INTERVAL: v.nonNegativeNum(false),
  POOL_BENCHMARKING: v.boolean(false),

  // logging
  LOGGING_LEVEL: c.logLevel(false),
  LOGGING_FILE: v.string(false),
  LOGGING_DEST: v.string(false),
  LOGGING_TO_CONSOLE: v.boolean(false),
  LOGGING_TO_FILE: v.boolean(false),

  // ui
  UI_ENABLE: v.boolean(false),
  UI_ROUTE: v.startsWith(['/'], false),

  // other
  OTHER_NODE_ENV: v.enum(['development', 'production', 'test'], false),
  OTHER_LISTEN_TO_PROCESS_EXITS: v.boolean(false),
  OTHER_NO_LOGO: v.boolean(false),
  OTHER_HARD_RESET_PAGE: v.boolean(false),
  OTHER_BROWSER_SHELL_MODE: v.boolean(false),

  // debugger
  DEBUG_ENABLE: v.boolean(false),
  DEBUG_HEADLESS: v.boolean(false),
  DEBUG_DEVTOOLS: v.boolean(false),
  DEBUG_LISTEN_TO_CONSOLE: v.boolean(false),
  DEBUG_DUMPIO: v.boolean(false),
  DEBUG_SLOW_MO: v.nonNegativeNum(false),
  DEBUG_DEBUGGING_PORT: v.nonNegativeNum(false),

  // websocket
  WEB_SOCKET_ENABLE: v.boolean(false),
  WEB_SOCKET_RECONNECT: v.boolean(false),
  WEB_SOCKET_REJECT_UNAUTHORIZED: v.boolean(false),
  WEB_SOCKET_PING_TIMEOUT: v.nonNegativeNum(false),
  WEB_SOCKET_RECONNECT_INTERVAL: v.nonNegativeNum(false),
  WEB_SOCKET_RECONNECT_ATTEMPTS: v.nonNegativeNum(false),
  WEB_SOCKET_MESSAGE_INTERVAL: v.nonNegativeNum(false),
  WEB_SOCKET_GATHER_ALL_OPTIONS: v.boolean(false),
  WEB_SOCKET_URL: v.startsWith(['ws://', 'wss://'], false),
  WEB_SOCKET_SECRET: v.string(false)
});

export const validateConfig = (configOptions) =>
  ConfigSchema.partial().parse(configOptions);

export const validateCli = (configOptions) =>
  CliSchema.partial().parse(configOptions);

export const validatePayload = (configOptions) =>
  PayloadSchema.partial().parse(configOptions);

export const envs = EnvSchema.partial().parse(process.env);
