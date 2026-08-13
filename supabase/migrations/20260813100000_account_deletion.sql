-- ============================================================================
-- Account deletion with a 30-day grace period.
--
-- Required by App Store guideline 5.1.1(v) and Google Play's data deletion
-- policy: an app that lets people create accounts must let them delete one
-- from inside the app, and Play additionally wants a web route for someone
-- who has already uninstalled.
--
-- Three timestamps rather than a status enum, because each answers a different
-- question and the combination is self-describing:
--
--   deletion_requested_at   when they asked. Null = a normal, live account.
--   deletion_scheduled_for  when the purge may run. Requested + 30 days.
--   deleted_at              when the purge actually ran. Non-null = tombstone;
--                           the row survives only to keep foreign keys valid.
--
-- Why the row survives: messages.sender_user_id and order_events.actor_user_id
-- point here. Hard-deleting a departing user would either cascade their words
-- out of a conversation the OTHER party is still reading, or null out the
-- history of an order that still exists. So the purge strips every piece of
-- personal data from this row and leaves the key behind. What remains — a
-- random uuid, a role, timestamps — identifies nobody.
-- ============================================================================

alter table public.users
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_scheduled_for timestamptz,
  add column if not exists deleted_at timestamptz;

comment on column public.users.deletion_requested_at is
  'When the user asked for deletion. Null for live accounts.';
comment on column public.users.deletion_scheduled_for is
  'Earliest the purge may run — request + 30 days. Cancelling clears it.';
comment on column public.users.deleted_at is
  'When the purge ran. Non-null means this row is a tombstone with no personal data left.';

-- The purge cron asks exactly one question every night: who is due? A partial
-- index keeps that a lookup over the handful of pending rows rather than a
-- scan of every account in the table.
create index if not exists users_deletion_due_idx
  on public.users (deletion_scheduled_for)
  where deletion_scheduled_for is not null and deleted_at is null;

-- Tombstoned accounts must never be counted as real users again — not in
-- admin totals, not in the feed, not anywhere. Partial index so the common
-- "live users" filter stays cheap.
create index if not exists users_live_idx
  on public.users (id)
  where deleted_at is null;
