/**
 * @fileoverview
 * This file is responsible for parsing the environment variables with the 'zod' library.
 * The parsed environment variables are then exported to be used in the application as "envs".
 * We should not use process.env directly in the application as these would not be parsed properly.
 *
 * The environment variables are parsed and validated only once when the application starts.
 * We should write a custom validator or a transformer for each of the options.
 *
 * For envs not defined in config.js with defaults, we also include default values here (PROXY_...).
 */

import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

// Object with custom validators and transformers, to avoid repetition in the Config object
const v = {
  boolean: () =>
    z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  array: () =>
    z
      .string()
      .transform((val) => val.split(',').map((v) => v.trim()))
      .optional()
};

export const Config = z.object({
  // highcharts
  HIGHCHARTS_VERSION: z
    .string()
    .refine((value) => /^(latest|\d+(\.\d+){0,2})$/.test(value), {
      message:
        "HIGHCHARTS_VERSION must be 'latest', a major version, or in the form XX.YY.ZZ"
    })
    .optional(), // todo: create an array of available Highcharts versions
  HIGHCHARTS_CDN_URL: z
    .string()
    .trim()
    .refine((val) => val.startsWith('https://') || val.startsWith('http://'), {
      message:
        'Invalid value for HIGHCHARTS_CDN_URL. It should start with http:// or https://.'
    })
    .optional(),
  HIGHCHARTS_CORE_SCRIPTS: v.array(),
  HIGHCHARTS_MODULES: v.array(),
  HIGHCHARTS_INDICATORS: v.array(),
  HIGHCHARTS_FORCE_FETCH: v.boolean(),
  HIGHCHARTS_CACHE_PATH: z.string().optional(),
  HIGHCHARTS_ADMIN_TOKEN: z.string().optional(),

  // export
  EXPORT_TYPE: z.enum(['jpeg', 'png', 'pdf', 'svg']).optional(),
  EXPORT_CONSTR: z
    .string()
    .refine(
      (val) =>
        ['chart', 'stockChart', 'mapChart', 'ganttChart'].includes(val || ''),
      { message: 'Invalid value for EXPORT_CONSTR. ' }
    )
    .optional(),
  EXPORT_DEFAULT_HEIGHT: z.coerce.number().positive().optional(),
  EXPORT_DEFAULT_WIDTH: z.coerce.number().positive().optional(),
  EXPORT_DEFAULT_SCALE: z.coerce.number().positive().optional(),
  EXPORT_RASTERIZATION_TIMEOUT: z.coerce.number().positive().optional(),

  // custom
  CUSTOM_LOGIC_ALLOW_CODE_EXECUTION: v.boolean(),
  CUSTOM_LOGIC_ALLOW_FILEL_RESOURCES: v.boolean(),

  // server-related
  SERVER_ENABLE: v.boolean(),
  SERVER_HOST: z.string().optional(),
  SERVER_PORT: z.coerce.number().optional(),
  SERVER_BENCHMARKING: v.boolean(),
  SERVER_SSL_ENABLE: v.boolean(),
  SERVER_SSL_FORCE: v.boolean(),
  SERVER_SSL_PORT: z.coerce.number().optional(),
  SERVER_SSL_CERT_PATH: z.string().optional(),
  SERVER_RATE_LIMITING_ENABLE: v.boolean(),
  SERVER_RATE_LIMITING_MAX_REQUESTS: z.coerce.number().optional(),
  SERVER_RATE_LIMITING_WINDOW: z.coerce.number().optional(),
  SERVER_RATE_LIMITING_DELAY: z.coerce.number().optional(),
  SERVER_RATE_LIMITING_TRUST_PROXY: v.boolean(),
  SERVER_RATE_LIMITING_SKIP_KEY: z.string().optional(),
  SERVER_RATE_LIMITING_SKIP_TOKEN: z.string().optional(),

  // pool
  POOL_MIN_WORKERS: z.coerce.number().optional(),
  POOL_MAX_WORKERS: z.coerce.number().optional(),
  POOL_WORK_LIMIT: z.coerce.number().optional(),
  POOL_ACQUIRE_TIMEOUT: z.coerce.number().optional(),
  POOL_CREATE_TIMEOUT: z.coerce.number().optional(),
  POOL_DESTROY_TIMEOUT: z.coerce.number().optional(),
  POOL_IDLE_TIMEOUT: z.coerce.number().optional(),
  POOL_CREATE_RETRY_INTERVAL: z.coerce.number().optional(),
  POOL_REAPER_INTERVAL: z.coerce.number().optional(),
  POOL_BENCHMARKING: v.boolean(),
  POOL_LISTEN_TO_PROCESS_EXITS: v.boolean(),

  // logger
  LOGGING_LEVEL: z.coerce
    .number()
    .optional()
    .refine((val) => (val || 5) >= 0 && (val || 5) <= 5, {
      message:
        'Invalid value for LOGGING_LEVEL. We only accept 0, 1, 2, 3, 4, 5 as logging levels.'
    }),
  LOGGING_FILE: z.string().optional(),
  LOGGING_DEST: z.string().optional(),

  // ui
  UI_ENABLE: v.boolean(),
  UI_ROUTE: z.string().optional(),

  // other
  OTHER_NO_LOGO: v.boolean(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('production'),

  // proxy (! NOT INCLUDED IN CONFIG.JS !)
  PROXY_SERVER_TIMEOUT: z.coerce.number().positive().optional().default(5000),
  PROXY_SERVER_HOST: z.string().optional().default('localhost'),
  PROXY_SERVER_PORT: z.coerce.number().positive().optional().default(8080)
});

export const envs = Config.parse(process.env);
