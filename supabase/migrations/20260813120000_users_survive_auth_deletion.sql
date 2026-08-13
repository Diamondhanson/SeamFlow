-- ============================================================================
-- Let a profile outlive its credentials.
--
-- public.users.id referenced auth.users(id) ON DELETE CASCADE. That is a
-- sensible default and it is wrong for us, for one specific reason: the last
-- step of an account purge is deleting the Supabase auth user, and with this
-- constraint in place that delete reaches back into our schema and takes the
-- profile row with it.
--
-- Which sounds like what we want, until you follow the next cascade:
--
--     auth.users  →  public.users  →  messages.sender_user_id (CASCADE)
--
-- One tailor closing their account would delete their half of every
-- conversation, out of inboxes belonging to people who did not ask for
-- anything. The other party is left with their own replies answering nothing.
-- order_events.actor_user_id would likewise null out the history of orders
-- that still exist.
--
-- So the purge keeps the profile row and strips it instead — no email, no
-- phone, no name, just a key and a deleted_at. Dropping this constraint is
-- what makes that possible: the tombstone is precisely a profile with no
-- credentials behind it, which the FK defined as impossible.
--
-- Signup is unaffected. Rows are created by the on_auth_user_created trigger
-- on auth.users, not by this constraint.
-- ============================================================================

alter table public.users
  drop constraint if exists users_id_fkey;

comment on table public.users is
  'App-level profile. Deliberately NOT foreign-keyed to auth.users: a purged account keeps a tombstone row here (deleted_at set, personal fields cleared) so that foreign keys from messages and order_events stay valid after the credentials are destroyed.';
