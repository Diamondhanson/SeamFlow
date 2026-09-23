-- ============================================================================
-- platform_settings — the few switches that must flip without a deploy.
--
-- First of them: whether the Free tier's caps and premium gates actually bite.
-- That has to be turnable on from the ops dashboard the moment payments work,
-- because the alternative is asking someone to redeploy the API at exactly the
-- moment they least want surprises.
--
-- Deliberately tiny and generic: a key, a value, and who last touched it.
-- Settings are read constantly, so the API caches them briefly rather than
-- querying per request.
-- ============================================================================

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  -- Who flipped it. Null for a value that was seeded rather than set.
  updated_by uuid references public.users(id) on delete set null
);

alter table public.platform_settings enable row level security;

-- Ships OFF, which is the whole point: nobody is blocked before they can pay.
insert into public.platform_settings (key, value)
values ('subscription_enforcement', 'false'::jsonb)
on conflict (key) do nothing;
