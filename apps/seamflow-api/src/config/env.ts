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

  // Anthropic (Claude) — optional. AI auto-describe is disabled (503) when empty
  // so the API still boots without a key during development.
  ANTHROPIC_API_KEY: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),

  // Share-link signing — separate from Supabase JWT so rotating it doesn't
  // invalidate user sessions. 32+ random bytes recommended.
  SHARE_LINK_JWT_SECRET: z.string().min(32),

  // Base URL of seamflow-web for building share URLs. Set to your deployed web
  // domain in every real environment. Defaults to the production placeholder so
  // links never accidentally point at localhost; override locally if you're
  // testing the web app on http://localhost:3000.
  WEB_BASE_URL: z.string().url().default('https://www.seamflowtech.com'),
});

export type Env = z.infer<typeof envSchema>;
