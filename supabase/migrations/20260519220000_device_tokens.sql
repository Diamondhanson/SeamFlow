-- Phase 1.8 — push notifications: per-user, per-device Expo push tokens.
--
-- A user can have multiple devices (phone + tablet, or two phones). Each
-- device produces a unique Expo push token. We store one row per token and
-- enforce uniqueness on (user_id, expo_token) — re-installing the app on
-- the same device produces a new token, so a tiny amount of drift here is
-- expected and pruned by the periodic invalid-token cleanup.

create table public.device_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  expo_token      text not null,
  platform        text not null check (platform in ('ios', 'android', 'web')),
  -- Last time the mobile app re-asserted this token by POSTing /me/device-tokens.
  -- Tokens not seen for 60+ days get pruned by a future maintenance job.
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create unique index device_tokens_user_token_uniq
  on public.device_tokens(user_id, expo_token);

create index device_tokens_user_idx
  on public.device_tokens(user_id);

-- RLS — a user can only see/manage their own tokens. The notifications
-- service uses the service-role client to read across users when fanning
-- out a push.
alter table public.device_tokens enable row level security;

create policy device_tokens_self_select on public.device_tokens
  for select using (user_id = auth.uid());

create policy device_tokens_self_insert on public.device_tokens
  for insert with check (user_id = auth.uid());

create policy device_tokens_self_update on public.device_tokens
  for update using (user_id = auth.uid());

create policy device_tokens_self_delete on public.device_tokens
  for delete using (user_id = auth.uid());

comment on table public.device_tokens is
  'Expo push tokens, one row per user per device. Pruned by the notifications service when Expo reports a token as invalid.';
