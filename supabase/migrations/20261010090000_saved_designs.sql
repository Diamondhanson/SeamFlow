-- ============================================================================
-- Saved designs.
--
-- The thing this replaces is the screenshot. Commissioning is a slow decision;
-- people see a piece, are not ready to ask about it, and want to come back. A
-- screenshot leaves with no shop attached and no way back to an enquiry — and
-- a loose image with no attribution is how stolen work travels, which is the
-- fraud verification exists to fight.
--
-- Private. There is no public count and no "like": a visible counter would let
-- a number decide between a new shop and an established one, which penalises
-- the designers whose subscriptions pay for the platform, in their first month.
-- The maker sees a count of their OWN design's saves and nobody else does.
-- ============================================================================

create table if not exists public.saved_designs (
  user_id uuid not null references public.users (id) on delete cascade,
  feed_post_id uuid not null references public.feed_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, feed_post_id)
);

comment on table public.saved_designs is
  'Private bookmarks. No public count, deliberately — see the note in packages/schemas/src/saved-design.ts.';

-- The list is always read one way: mine, newest first.
create index if not exists saved_designs_user_idx
  on public.saved_designs (user_id, created_at desc);

-- And the maker''s private count reads it from the other end.
create index if not exists saved_designs_post_idx
  on public.saved_designs (feed_post_id);

-- Written through the API with the service role. RLS on with no permissive
-- policy means nothing reaches these rows over the anon or authenticated key —
-- so one person's saves cannot be read by anyone else, including the shops
-- they saved.
alter table public.saved_designs enable row level security;
