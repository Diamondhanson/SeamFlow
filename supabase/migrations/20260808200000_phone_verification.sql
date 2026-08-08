-- ============================================================================
-- Phone verification scaffolding (WhatsApp-first).
--
-- The delivery PROVIDER is not chosen yet, so nothing here names one. What the
-- provider changes is: which API we POST to, and the shape of the message. What
-- it does not change is any of the below — a code is minted, hashed, stored
-- with an expiry and an attempt counter, and consumed once. Swapping providers
-- later touches one adapter class, not this schema.
--
-- Channel is an enum rather than a boolean because WhatsApp delivery is not
-- universal: a number with no WhatsApp account has to fall back to SMS, and we
-- want to know per attempt which route was used when debugging "I never got a
-- code" reports.
-- ============================================================================

create type otp_channel as enum ('whatsapp', 'sms');

-- ── users: the verified result ──────────────────────────────────────────────
-- users.phone already exists and is whatever Supabase Auth captured (often
-- null for email/password signups). It stays the "claimed" number; this column
-- is what makes it trustworthy. Never gate anything on users.phone alone.
alter table public.users
  add column if not exists phone_verified_at timestamptz;

comment on column public.users.phone_verified_at is
  'Set when the user completed an OTP challenge for users.phone. Null = the number is self-asserted and unproven.';

-- ── the challenges themselves ───────────────────────────────────────────────
create table public.phone_verifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,

  -- E.164, normalised before insert. Stored per attempt rather than read from
  -- users.phone so that "change my number" is verify-then-commit: the new
  -- number only reaches users.phone after a successful challenge.
  phone         text not null,

  -- HMAC-SHA-256 of the code, never the code itself. A leaked database backup
  -- should not hand over live OTPs, and this table is short-lived but not
  -- instantly purged.
  code_hash     text not null,
  channel       otp_channel not null default 'whatsapp',

  -- Set once the provider accepts it; null while queued or if send failed.
  -- Useful for support ("did we actually send it?") and provider reconciliation.
  provider_id   text,
  provider_message_id text,

  attempts      integer not null default 0,
  expires_at    timestamptz not null,
  consumed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- The hot query: "latest live challenge for this user".
create index phone_verifications_user_idx
  on public.phone_verifications (user_id, created_at desc);

-- Rate limiting counts recent attempts per number, across users — a single
-- number being hammered from several accounts is the abuse case that matters,
-- since each send costs money and annoys whoever owns the line.
create index phone_verifications_phone_created_idx
  on public.phone_verifications (phone, created_at desc);

-- At most one live (unconsumed, unexpired) challenge per user. Enforced rather
-- than merely intended: without it, a double-tapped "send code" leaves two
-- valid codes and the second silently invalidates the first in the user's SMS
-- app while both still verify — confusing to debug and a wider guess window.
create unique index phone_verifications_one_live_per_user
  on public.phone_verifications (user_id)
  where consumed_at is null;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- No policies at all: this table is service-role only. Clients never read it.
-- Exposing rows would leak the attempt counter and expiry, which are exactly
-- the signals a brute-forcer wants; the API returns only what the caller needs.
alter table public.phone_verifications enable row level security;

comment on table public.phone_verifications is
  'OTP challenges for phone verification. Service-role only — no RLS policies by design. Rows are disposable; safe to prune once consumed or expired.';
