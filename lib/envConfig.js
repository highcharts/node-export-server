import { z } from 'zod';

const envToBoolean = () =>
  z.enum(['true', 'false']).transform((v) => v === 'true');

const EnvConfig = z.object({
  WS_ENABLE: envToBoolean(),
  WS_RECONNECT: envToBoolean(),
  WS_REJECT_UNAUTHORIZED: envToBoolean(),
  WS_PING_TIMEOUT: z.coerce.number(),
  WS_RECONNECT_INTERVAL: z.coerce.number(),
  WS_URL: z.string(),
  WS_SECRET: z.string()
});

export const envConfig = EnvConfig.parse(process.env);
