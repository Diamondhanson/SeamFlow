-- ============================================================================
-- What staff did, and when.
--
-- The ops dashboard is about to be able to verify a shop, sign someone out,
-- cancel a deletion and take a post down. The moment a dashboard can do things
-- TO people rather than just show them, "who did this" stops being optional:
-- it is what makes a mistake traceable and an accusation answerable.
--
-- Append-only by intent. Nothing in the app writes here, nothing updates a row,
-- and the actor is the staff member's own user id, never a shared account.
-- ============================================================================

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.users(id) on delete restrict,
  -- A short verb, e.g. 'tailor.verify', 'user.sign_out', 'post.takedown'.
  action text not null,
  -- What it was done to: 'tailor' | 'user' | 'feed_post' | 'platform'.
  target_type text not null,
  target_id uuid,
  -- Whatever the action needs to be understood later: the old and new value,
  -- a reason, the number of days granted.
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- The history shown on a person's page.
create index if not exists admin_actions_target_idx
  on public.admin_actions (target_type, target_id, created_at desc);

-- "What has this staff member been doing", and the platform-wide feed.
create index if not exists admin_actions_actor_idx
  on public.admin_actions (actor_user_id, created_at desc);
create index if not exists admin_actions_recent_idx
  on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;
-- No policies: the service role (the API) writes and reads this. Nobody
-- reaches it with an anon or authenticated key, which is the point.

comment on table public.admin_actions is
  'Append-only record of every staff action taken from the ops dashboard.';
