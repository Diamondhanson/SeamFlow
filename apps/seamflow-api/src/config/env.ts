import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Extra browser origins allowed by CORS, comma-separated and exact (e.g. a
  // preview deployment's URL). The production sites are built in; see main.ts.
  WEB_ORIGINS: z.string().optional(),

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

  // Which payment rail subscriptions are bought through. Empty (the default)
  // means none: checkout answers 503 and the app says "payment is coming
  // soon". 'fake' is a development-only stand-in that lets the whole payment
  // path be tested before a real provider is chosen.
  SUBSCRIPTION_PAYMENT_PROVIDER: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),

  // ── Fapshi (MTN MoMo + Orange Money, Cameroon) ────────────────────────────
  // Per-environment credentials from the Fapshi dashboard: a service in
  // sandbox and a separate one live. 'sandbox' unless FAPSHI_ENV says 'live',
  // because getting this wrong spends real money.
  FAPSHI_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
  FAPSHI_API_USER: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  FAPSHI_API_KEY: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  // Echoed by Fapshi in the x-wh-secret header. Without it every webhook is
  // refused — an open payment webhook is a giveaway, not an integration.
  FAPSHI_WEBHOOK_SECRET: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),

  // ── Email (Resend) ────────────────────────────────────────────────────────
  // Subscriptions are sold on the web, so these emails are how a tailor on a
  // store build learns their trial is ending and where to pay. Unset means no
  // email is sent — the jobs log and carry on.
  RESEND_API_KEY: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  EMAIL_FROM: z.string().default('SeamFlow <contact@seamflowtech.com>'),
  // Replies land here. The From address can send but not receive, and a tailor
  // answering an email about money is the most valuable message of the week.
  EMAIL_REPLY_TO: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  // Where the plans live. The link in every subscription email points here.
  APP_WEB_URL: z.string().url().default('https://app.seamflowtech.com'),

  // ── Phone verification (WhatsApp-first) ───────────────────────────────────
  // Which OTP delivery adapter to use. Unset (the default) means phone
  // verification is INACTIVE and /me/phone/* returns 503 — chosen over a silent
  // no-op so a half-configured server can never mark a number "verified"
  // without having contacted it.
  //
  //   unset      → disabled, endpoints 503
  //   'console'  → dev only; logs the code instead of sending it. Refuses to
  //                run when NODE_ENV=production.
  //   'didit'    → WhatsApp first with automatic SMS fallback. Needs
  //                DIDIT_API_KEY. Didit owns the code itself, which is why the
  //                seam has two provider shapes; see otp-provider.ts.
  //   (future)   → add the real provider slug here and a case in
  //                phone-verification/resolve-otp-provider.ts
  OTP_PROVIDER: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),

  // Didit's API key, from business.didit.me → your Application → API & Webhooks.
  // Server-side only: it must never reach an app bundle. Without it,
  // OTP_PROVIDER=didit resolves to the unconfigured provider and the endpoints
  // answer 503 rather than pretending to work.
  //
  // NOTE ON BILLING: phone verification is pay-as-you-go and is NOT part of
  // Didit's free tier (that covers full KYC only). Until the organisation's
  // first top-up the module is disabled outright and every send answers 403,
  // which surfaces as a 503 to the app and a loud line in the log. A working key
  // with no credit looks exactly like a broken key unless you read that line.
  //
  // A key from a SANDBOX application verifies phones for free, so use one of
  // those to exercise the flow end to end before spending anything.
  DIDIT_API_KEY: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),

  // Key for HMAC-hashing OTP codes at rest. Falls back to SHARE_LINK_JWT_SECRET
  // when unset, so there's one fewer secret to provision. Set it separately if
  // you ever want to rotate OTP hashing without invalidating share links —
  // rotating it only invalidates codes that are in flight, which is harmless.
  OTP_HASH_SECRET: z.string().min(32).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
});

export type Env = z.infer<typeof envSchema>;
