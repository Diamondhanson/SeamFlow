-- ============================================================================
-- Suspension: stop someone acting, without taking anything away.
--
-- The rule that cannot break (appendix I.1) is that a person can always open
-- SeamFlow and read their own clients, measurements and order history. A
-- suspension therefore blocks WRITING, never reading: a suspended tailor can
-- still open every order they ever took, export their data, and write to
-- support to argue about it. They simply cannot publish, take new orders or
-- message anyone until it is lifted.
--
-- Nullable, so "not suspended" needs no backfill and no default row.
-- ============================================================================

alter table public.users
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

comment on column public.users.suspended_at is
  'Set while this account may not write. Reads always continue to work.';
comment on column public.users.suspension_reason is
  'Shown to the person themselves, so it has to be a sentence they can act on.';

-- Suspended accounts are rare and looked up by the dashboard, not by the apps.
create index if not exists users_suspended_idx
  on public.users (suspended_at) where suspended_at is not null;
