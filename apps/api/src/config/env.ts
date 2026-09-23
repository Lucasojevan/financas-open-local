import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  APP_ORIGIN: z.string().url(),
  SESSION_COOKIE_NAME: z.string().min(1).default('financas_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  TOKEN_ENCRYPTION_KEY: z.string().min(32),
  OPEN_FINANCE_PROVIDER: z.literal('pluggy').default('pluggy'),
  CLIENT_ID: z.string().optional(),
  CLIENT_SECRET: z.string().optional(),
  PLUGGY_SANDBOX: z.coerce.boolean().default(true),
  PLUGGY_WEBHOOK_SECRET: z.preprocess((value) => value === '' ? undefined : value, z.string().min(16).optional()),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  return schema.parse(input);
}
