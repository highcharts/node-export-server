import { z } from 'zod';

const envToBoolean = () =>
  z.enum(['true', 'false']).transform((v) => v === 'true');

const EnvConfig = z.object({
  WS_ENABLE: envToBoolean().optional(),
  WS_RECONNECT: envToBoolean().optional(),
  WS_REJECT_UNAUTHORIZED: envToBoolean().optional(),
  WS_PING_TIMEOUT: z.coerce.number().optional(),
  WS_RECONNECT_INTERVAL: z.coerce.number().optional(),
  WS_URL: z.string().optional(),
  WS_SECRET: z.string().optional()
});

export const envConfig = EnvConfig.parse(process.env);
