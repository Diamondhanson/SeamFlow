-- ============================================================================
-- SeamFlow staff — who may use the admin dashboard and answer support.
--
-- A table rather than an env var so the dashboard and the API agree from one
-- source, and so adding a second person later is one insert, not a redeploy
-- of two services. Keyed by user id, not email: an email can be changed by
-- its owner; a user id cannot.
--
-- RLS on with no policies: only the service role (API, dashboard server) can
-- read it. The apps never see who is staff.
-- ============================================================================

create table if not exists public.staff (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.staff enable row level security;
