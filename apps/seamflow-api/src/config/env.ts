import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Postgres — optional at boot so the skeleton can start before DATABASE_URL
  // is filled in. DbService logs "not configured" and queries throw if used.
  DATABASE_URL: z.string().url().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),

  // Redis — optional. BullMQ disabled when empty.
  REDIS_URL: z.string().url().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),

  // Sentry — optional. Error tracking disabled when empty.
  SENTRY_DSN: z.string().url().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
});

export type Env = z.infer<typeof envSchema>;
