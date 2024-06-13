/**
 * @fileoverview
 * This file is responsible for parsing the environment variables with the 'zod'
 * library. The parsed environment variables are then exported to be used
 * in the application as "envs". We should not use process.env directly
 * in the application as these would not be parsed properly.
 *
 * The environment variables are parsed and validated only once when
 * the application starts. We should write a custom validator or a transformer
 * for each of the options.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

import { scriptsNames } from './schemas/config.js';

// Load .env into environment variables
dotenv.config();

// Object with custom validators and transformers, to avoid repetition
// in the Config object
const v = {
  // Splits string value into elements in an array, trims every element, checks
  // if an array is correct, if it is empty, and if it is, returns undefined
  array: (filterArray) =>
    z
      .string()
      .transform((value) =>
        value
          .split(',')
          .map((value) => value.trim())
          .filter((value) => filterArray.includes(value))
      )
      .transform((value) => (value.length ? value : undefined)),

  // Allows only true, false and correctly parse the value to boolean
  // or no value in which case the returned value will be undefined
  boolean: () =>
    z
      .enum(['true', 'false', ''])
      .transform((value) => (value !== '' ? value === 'true' : undefined)),

  // Allows passed values or no value in which case the returned value will
  // be undefined
  enum: (values) =>
    z
      .enum([...values, ''])
      .transform((value) => (value !== '' ? value : undefined)),

  // Trims the string value and checks if it is empty or contains stringified
  // values such as false, undefined, null, NaN, if it does, returns undefined
  string: () =>
    z
      .string()
      .trim()
      .refine(
        (value) =>
          !['false', 'undefined', 'null', 'NaN'].includes(value) ||
          value === '',
        (value) => ({
          message: `The string contains forbidden values, received '${value}'`
        })
      )
      .transform((value) => (value !== '' ? value : undefined)),

  // Allows positive numbers or no value in which case the returned value will
  // be undefined
  positiveNum: () =>
    z
      .string()
      .trim()
      .refine(
        (value) =>
          value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) > 0),
        (value) => ({
          message: `The value must be numeric and positive, received '${value}'`
        })
      )
      .transform((value) => (value !== '' ? parseFloat(value) : undefined)),

  // Allows non-negative numbers or no value in which case the returned value
  // will be undefined
  nonNegativeNum: () =>
    z
      .string()
      .trim()
      .refine(
        (value) =>
          value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0),
        (value) => ({
          message: `The value must be numeric and non-negative, received '${value}'`
        })
      )
      .transform((value) => (value !== '' ? parseFloat(value) : undefined))
};

export const Config = z.object({
  // highcharts
  HIGHCHARTS_VERSION: z
    .string()
    .trim()
    .refine(
      (value) => /^(latest|\d+(\.\d+){0,2})$/.test(value) || value === '',
      (value) => ({
        message: `HIGHCHARTS_VERSION must be 'latest', a major version, or in the form XX.YY.ZZ, received '${value}'`
      })
    )
    .transform((value) => (value !== '' ? value : undefined)),
  HIGHCHARTS_CDN_URL: z
    .string()
    .trim()
    .refine(
      (value) =>
        value.startsWith('https://') ||
        value.startsWith('http://') ||
        value === '',
      (value) => ({
        message: `Invalid value for HIGHCHARTS_CDN_URL. It should start with http:// or https://, received '${value}'`
      })
    )
    .transform((value) => (value !== '' ? value : undefined)),
  HIGHCHARTS_CORE_SCRIPTS: v.array(scriptsNames.core),
  HIGHCHARTS_MODULE_SCRIPTS: v.array(scriptsNames.modules),
  HIGHCHARTS_INDICATOR_SCRIPTS: v.array(scriptsNames.indicators),
  HIGHCHARTS_FORCE_FETCH: v.boolean(),
  HIGHCHARTS_CACHE_PATH: v.string(),
  HIGHCHARTS_ADMIN_TOKEN: v.string(),

  // export
  EXPORT_TYPE: v.enum(['jpeg', 'png', 'pdf', 'svg']),
  EXPORT_CONSTR: v.enum(['chart', 'stockChart', 'mapChart', 'ganttChart']),
  EXPORT_DEFAULT_HEIGHT: v.positiveNum(),
  EXPORT_DEFAULT_WIDTH: v.positiveNum(),
  EXPORT_DEFAULT_SCALE: v.positiveNum(),
  EXPORT_RASTERIZATION_TIMEOUT: v.nonNegativeNum(),

  // custom
  CUSTOM_LOGIC_ALLOW_CODE_EXECUTION: v.boolean(),
  CUSTOM_LOGIC_ALLOW_FILE_RESOURCES: v.boolean(),

  // server
  SERVER_ENABLE: v.boolean(),
  SERVER_HOST: v.string(),
  SERVER_PORT: v.positiveNum(),
  SERVER_BENCHMARKING: v.boolean(),

  // server proxy
  SERVER_PROXY_HOST: v.string(),
  SERVER_PROXY_PORT: v.positiveNum(),
  SERVER_PROXY_TIMEOUT: v.nonNegativeNum(),

  // server rate limiting
  SERVER_RATE_LIMITING_ENABLE: v.boolean(),
  SERVER_RATE_LIMITING_MAX_REQUESTS: v.nonNegativeNum(),
  SERVER_RATE_LIMITING_WINDOW: v.nonNegativeNum(),
  SERVER_RATE_LIMITING_DELAY: v.nonNegativeNum(),
  SERVER_RATE_LIMITING_TRUST_PROXY: v.boolean(),
  SERVER_RATE_LIMITING_SKIP_KEY: v.string(),
  SERVER_RATE_LIMITING_SKIP_TOKEN: v.string(),

  // server ssl
  SERVER_SSL_ENABLE: v.boolean(),
  SERVER_SSL_FORCE: v.boolean(),
  SERVER_SSL_PORT: v.positiveNum(),
  SERVER_SSL_CERT_PATH: v.string(),

  // pool
  POOL_MIN_WORKERS: v.nonNegativeNum(),
  POOL_MAX_WORKERS: v.nonNegativeNum(),
  POOL_WORK_LIMIT: v.positiveNum(),
  POOL_ACQUIRE_TIMEOUT: v.nonNegativeNum(),
  POOL_CREATE_TIMEOUT: v.nonNegativeNum(),
  POOL_DESTROY_TIMEOUT: v.nonNegativeNum(),
  POOL_IDLE_TIMEOUT: v.nonNegativeNum(),
  POOL_CREATE_RETRY_INTERVAL: v.nonNegativeNum(),
  POOL_REAPER_INTERVAL: v.nonNegativeNum(),
  POOL_BENCHMARKING: v.boolean(),

  // logger
  LOGGING_LEVEL: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (!isNaN(parseFloat(value)) &&
          parseFloat(value) >= 0 &&
          parseFloat(value) <= 5),
      (value) => ({
        message: `Invalid value for LOGGING_LEVEL. We only accept values from 0 to 5 as logging levels, received '${value}'`
      })
    )
    .transform((value) => (value !== '' ? parseFloat(value) : undefined)),
  LOGGING_FILE: v.string(),
  LOGGING_DEST: v.string(),
  LOGGING_TO_CONSOLE: v.boolean(),
  LOGGING_TO_FILE: v.boolean(),

  // ui
  UI_ENABLE: v.boolean(),
  UI_ROUTE: v.string(),

  // other
  OTHER_NODE_ENV: v.enum(['development', 'production', 'test']),
  OTHER_LISTEN_TO_PROCESS_EXITS: v.boolean(),
  OTHER_NO_LOGO: v.boolean(),
  OTHER_HARD_RESET_PAGE: v.boolean(),
  OTHER_BROWSER_SHELL_MODE: v.boolean(),

  // debugger
  DEBUG_ENABLE: v.boolean(),
  DEBUG_HEADLESS: v.boolean(),
  DEBUG_DEVTOOLS: v.boolean(),
  DEBUG_LISTEN_TO_CONSOLE: v.boolean(),
  DEBUG_DUMPIO: v.boolean(),
  DEBUG_SLOW_MO: v.nonNegativeNum(),
  DEBUG_DEBUGGING_PORT: v.positiveNum()
});

export const envs = Config.partial().parse(process.env);
