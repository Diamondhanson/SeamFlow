-- ============================================================================
-- The optional extras (appendix J phase 3).
--
-- Three things a tailor MAY add to make their shop stronger, none of them ever
-- required and none of them a gate:
--
--   a social handle    proved by a short code in the bio for a day
--   one location fix   foreground only, taken while they stand in the shop
--   a registration no. for the minority who have one
--
-- Only the SOCIAL HANDLE gets columns here, and the reason is worth stating:
-- it is the only one of the three that a client ever sees. It is evidence to us
-- and a benefit to them in the same object, which is why it is worth asking for
-- at all — a tailor gets their Instagram on their storefront out of it.
--
-- The location fix and the registration number live in the request's `evidence`
-- array and are shown to STAFF only. A registration number on a public page
-- helps nobody, and J.7 is emphatic that a client is never shown a coordinate:
-- a neighbourhood, never a pin, because many tailors work from home.
--
-- WHY `social_confirmed_at` IS SEPARATE FROM THE HANDLE
--
-- The handle is only copied here when a staff member has actually opened the
-- profile and found the code. An unconfirmed handle is not stored at all, so
-- there is no state where the storefront shows a handle nobody checked — which
-- would be the badge problem (J.1) all over again, in miniature.
-- ============================================================================

alter table public.tailors
  add column if not exists social_platform text,
  add column if not exists social_handle text,
  add column if not exists social_confirmed_at timestamptz;

comment on column public.tailors.social_platform is
  'instagram | facebook | tiktok. Null unless a handle was confirmed.';
comment on column public.tailors.social_handle is
  'Confirmed handle, without the @. Public: shown on the storefront.';
comment on column public.tailors.social_confirmed_at is
  'When staff found our code in their bio. Never set by the tailor.';

-- The app sends one of three; the constraint is the last line of defence for a
-- value that ends up choosing an icon on a public page.
alter table public.tailors
  drop constraint if exists tailors_social_platform_known;
alter table public.tailors
  add constraint tailors_social_platform_known
  check (social_platform is null or social_platform in ('instagram', 'facebook', 'tiktok'));

-- A handle and its platform travel together, and neither means anything without
-- the confirmation. All three, or none.
alter table public.tailors
  drop constraint if exists tailors_social_complete;
alter table public.tailors
  add constraint tailors_social_complete
  check (
    (social_platform is null and social_handle is null and social_confirmed_at is null)
    or (social_platform is not null and social_handle is not null and social_confirmed_at is not null)
  );

-- ---------------------------------------------------------------------------
-- Discover's ranking lift (J.5).
--
-- Verified shops sort as if their posts were a little newer. NOT a separate
-- tier: a tier would bury every unverified shop below every verified one
-- forever, and J's one rule is that unverified tailors are still found and
-- still messaged. A few days of nudge decays naturally — a month-old verified
-- post still sits below a fresh unverified one.
--
-- Expressed as an index so the feed's keyset pagination keeps working on the
-- same shape of sort key it uses today.
-- ---------------------------------------------------------------------------
create index if not exists feed_posts_published_created_idx
  on public.feed_posts (created_at desc, id desc) where status = 'published';
