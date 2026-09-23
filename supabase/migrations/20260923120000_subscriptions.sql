-- ============================================================================
-- Subscriptions: trial, entitlement, payment history (ROADMAP appendix I).
--
-- One row per tailor, holding ONE date — `premium_until` — that every gate in
-- the product reads. Whatever pays (mobile money now, card later) just pushes
-- that date forward; the rest of the system never learns how it was paid.
--
-- THE TRIAL STARTS TODAY, FOR EVERYONE. Tailors already using SeamFlow get a
-- full six weeks from the moment this runs, not backdated to their signup —
-- nobody who has been using the app for months should wake up on the Free tier
-- with no warning.
--
-- Additive and idempotent. Nothing existing is touched.
-- ============================================================================

do $$ begin
  create type public.subscription_status as enum ('trialing', 'active', 'grace', 'free');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_plan as enum ('monthly', 'quarterly', 'annual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_method as enum ('mtn_momo', 'orange_money', 'card');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_payment_status as enum ('pending', 'succeeded', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null unique references public.tailors(id) on delete cascade,
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz not null,
  -- Null until something is paid. The trial is tracked separately so "you have
  -- never paid" stays distinguishable from "you paid and it ran out".
  premium_until timestamptz,
  method public.subscription_method,
  plan public.subscription_plan,
  -- Card recurring, later: the saved-card handle and the dunning window.
  card_token text,
  provider text,
  grace_until timestamptz,
  last_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The daily jobs ask "whose time is up?", which is this index.
create index if not exists subscriptions_trial_ends_idx on public.subscriptions (trial_ends_at);
create index if not exists subscriptions_premium_until_idx on public.subscriptions (premium_until);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- Append-only: every charge, successful or not. A tailor asking "what did I
-- pay for?" and a dispute both get answered from here, not from a balance.
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailors(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency char(3) not null default 'XAF',
  method public.subscription_method,
  plan public.subscription_plan,
  days_added integer not null default 0,
  provider text,
  -- The provider's own id. Unique so a webhook delivered twice cannot pay twice.
  provider_ref text,
  status public.subscription_payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_payments_tailor_idx
  on public.subscription_payments (tailor_id, created_at desc);
create unique index if not exists subscription_payments_provider_ref_key
  on public.subscription_payments (provider, provider_ref)
  where provider_ref is not null;

-- Everything goes through the API (service role); the apps never read these
-- tables directly, and entitlement must never be decided on a device.
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

-- Existing tailors: six weeks from now.
insert into public.subscriptions (tailor_id, status, trial_ends_at)
select t.id, 'trialing', now() + interval '42 days'
from public.tailors t
on conflict (tailor_id) do nothing;
