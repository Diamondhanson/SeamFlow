-- ============================================================================
-- Moderation: reporting content, and blocking a person.
--
-- SeamFlow publishes photographs to a feed readable without an account, and
-- lets two strangers exchange free text and images. Until now there was no way
-- for anyone to say "this is wrong" from inside the app, and no way to make
-- someone stop messaging you. These two tables are that.
--
-- Nothing here screens content before it appears. A report is a signal that a
-- human reads, and the remedies already exist (feed post takedown, account
-- suspension). Reactive moderation is what this platform can actually staff.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),

  -- Who complained. Kept on delete so a queue entry does not vanish mid-review
  -- when someone closes their account; the row stays, the reporter goes null.
  reporter_user_id uuid references public.users (id) on delete set null,

  -- What. NOT a foreign key on purpose: the target may be a design, a shop or
  -- a message, and the whole point of a report is that it must survive the
  -- thing it is about being deleted. A dangling id with a status of 'actioned'
  -- is exactly the record we want to keep.
  target text not null check (target in ('design', 'shop', 'message')),
  target_id uuid not null,

  reason text not null check (
    reason in ('stolen_work', 'sexual_content', 'violence', 'harassment', 'scam', 'spam', 'other')
  ),
  note text,

  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  decision_note text,

  created_at timestamptz not null default now()
);

comment on table public.content_reports is
  'User reports of a design, a shop or a message. Reviewed by staff; the remedies are the existing takedown and suspension actions.';
comment on column public.content_reports.target_id is
  'Deliberately not a foreign key: a report must outlive the content it is about.';

-- The queue is always read the same way: open first, newest first.
create index if not exists content_reports_open_idx
  on public.content_reports (created_at desc)
  where status = 'open';

create index if not exists content_reports_target_idx
  on public.content_reports (target, target_id);

-- One open report per person per thing. Reporting twice is a slip, not a
-- stronger signal, and a queue full of duplicates is a queue nobody finishes.
-- Partial, so the same person can report again after a decision if it recurs.
create unique index if not exists content_reports_one_open_per_reporter_idx
  on public.content_reports (reporter_user_id, target, target_id)
  where status = 'open';

-- ---------------------------------------------------------------------------
-- Blocks
-- ---------------------------------------------------------------------------

create table if not exists public.user_blocks (
  blocker_user_id uuid not null references public.users (id) on delete cascade,
  blocked_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  -- Blocking yourself is always a bug upstream, never an intention.
  constraint user_blocks_not_self check (blocker_user_id <> blocked_user_id)
);

comment on table public.user_blocks is
  'Private, immediate, no review. Stops messages in BOTH directions; the app also hides a blocked shop from the blocker''s Discover.';

-- "Who have I blocked" (the settings list) and "has anyone blocked me" (the
-- send check) are both hot paths, and they read the table from opposite ends.
create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_user_id);

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- Both tables are written through the API with the service role, which bypasses
-- RLS. Enabling it with no permissive policy is the point: nothing reaches
-- these rows over the anon or authenticated key, so a report queue cannot be
-- read by the people in it, and a block list cannot be read by the blocked.
-- ---------------------------------------------------------------------------

alter table public.content_reports enable row level security;
alter table public.user_blocks enable row level security;
