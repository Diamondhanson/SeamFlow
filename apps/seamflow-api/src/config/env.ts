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

  // ── Subscriptions (ROADMAP appendix I) ────────────────────────────────────
  // The master switch for the Free tier's gates and caps. It ships OFF: the
  // trial, the countdown and the upgrade screens are live, but nothing is ever
  // BLOCKED while there is no way to pay. Flip to 'true' the day subscriptions
  // can actually be bought. Entitlement itself (who is trialing, whose time has
  // run out) is tracked either way, so flipping it needs no backfill.
  SUBSCRIPTION_ENFORCEMENT: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // ── Phone verification (WhatsApp-first) ───────────────────────────────────
  // Which OTP delivery adapter to use. Unset (the default) means phone
  // verification is INACTIVE and /me/phone/* returns 503 — chosen over a silent
  // no-op so a half-configured server can never mark a number "verified"
  // without having contacted it.
  //
  //   unset      → disabled, endpoints 503
  //   'console'  → dev only; logs the code instead of sending it. Refuses to
  //                run when NODE_ENV=production.
  //   (future)   → add the real provider slug here and a case in
  //                phone-verification/otp-provider.ts
  OTP_PROVIDER: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),

  // Key for HMAC-hashing OTP codes at rest. Falls back to SHARE_LINK_JWT_SECRET
  // when unset, so there's one fewer secret to provision. Set it separately if
  // you ever want to rotate OTP hashing without invalidating share links —
  // rotating it only invalidates codes that are in flight, which is harmless.
  OTP_HASH_SECRET: z.string().min(32).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
});

export type Env = z.infer<typeof envSchema>;
