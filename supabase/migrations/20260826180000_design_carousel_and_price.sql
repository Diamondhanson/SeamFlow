-- ============================================================================
-- A design becomes a set of photos with a price, rather than a single photo.
--
-- Two changes, and the reasoning for each is worth keeping.
--
-- 1. CAROUSEL. A tailor photographs a finished piece from the front, the back
--    and the side. Until now each of those became a separate "design", so a
--    catalogue showed the same garment three times and a client could not tell
--    they were looking at one thing. Images move into their own table, ordered.
--
--    The cover columns on tailor_works and feed_posts are NOT dropped. They are
--    kept as a denormalised mirror of position 0 — the same pattern feed_posts
--    already uses for `city`. That keeps every existing query, screen and
--    signed-URL path working unchanged, and means a reader that only wants one
--    representative image never has to join. The invariant is enforced in
--    WorksService: whatever sits at position 0 is what the cover columns hold.
--
-- 2. PRICE ON THE DESIGN, NOT THE POST. starting_price lived only on
--    feed_posts, so it was set at publish time and destroyed on unpublish — a
--    tailor who took a piece down and put it back lost the price they had
--    typed. It belongs to the design; the public post keeps its denormalised
--    copy for the feed to read without a join.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Private images — the tailor's own copies, in the `works` or `order-photos`
-- bucket. Never publicly addressable; served via short-lived signed URLs.
-- ---------------------------------------------------------------------------
create table if not exists public.tailor_work_images (
  id             uuid primary key default gen_random_uuid(),
  work_id        uuid not null references public.tailor_works (id) on delete cascade,

  -- Stored per image, not per work: an adopted order photo lives in
  -- `order-photos` while photos added afterwards live in `works`, and one
  -- design can legitimately hold both.
  storage_bucket text not null default 'works',
  storage_path   text not null,
  thumbnail_path text,

  -- From the source asset, so a grid can reserve the right box before the
  -- image arrives. Null for older rows that predate the client capturing them.
  width          integer,
  height         integer,

  -- 0 is the cover. Contiguous from 0, maintained by the service on delete
  -- and on reorder — a gap would make "next photo" skip in the carousel.
  position       integer not null default 0,

  created_at     timestamptz not null default now()
);

create index if not exists tailor_work_images_work_position_idx
  on public.tailor_work_images (work_id, position);

-- One image per slot. Without this a failed reorder could leave two photos
-- both claiming to be the cover, and which one you saw would depend on
-- planner whim.
create unique index if not exists tailor_work_images_work_position_key
  on public.tailor_work_images (work_id, position);

-- ---------------------------------------------------------------------------
-- Public images — copies in the `feed` bucket, created at publish time.
--
-- Separate from the private table on purpose: the public feed must never have
-- to read a private table to render (the rule feed_posts was built around).
-- Unpublishing deletes these rows and the pixels behind them.
-- ---------------------------------------------------------------------------
create table if not exists public.feed_post_images (
  id                uuid primary key default gen_random_uuid(),
  feed_post_id      uuid not null references public.feed_posts (id) on delete cascade,
  public_path       text not null,
  public_thumb_path text not null,
  width             integer,
  height            integer,
  position          integer not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists feed_post_images_post_position_idx
  on public.feed_post_images (feed_post_id, position);

create unique index if not exists feed_post_images_post_position_key
  on public.feed_post_images (feed_post_id, position);

-- ---------------------------------------------------------------------------
-- Backfill: every existing design and post becomes a one-image carousel.
--
-- Guarded by `not exists` so re-running is harmless — this migration may be
-- applied by hand, and a second run must not duplicate position 0.
-- ---------------------------------------------------------------------------
insert into public.tailor_work_images
  (work_id, storage_bucket, storage_path, thumbnail_path, width, height, position)
select w.id, w.storage_bucket, w.storage_path, w.thumbnail_path, w.width, w.height, 0
from public.tailor_works w
where not exists (
  select 1 from public.tailor_work_images i where i.work_id = w.id
);

insert into public.feed_post_images
  (feed_post_id, public_path, public_thumb_path, width, height, position)
select p.id, p.public_path, p.public_thumb_path, p.width, p.height, 0
from public.feed_posts p
where not exists (
  select 1 from public.feed_post_images i where i.feed_post_id = p.id
);

-- ---------------------------------------------------------------------------
-- Description and price on the design itself.
-- ---------------------------------------------------------------------------
alter table public.tailor_works
  add column if not exists description    text,
  add column if not exists starting_price numeric(12,2),
  add column if not exists currency       char(3);

comment on column public.tailor_works.starting_price is
  'Optional "from" price in MAJOR units (25000.00 = twenty-five thousand). Lives on the design, not the post, so unpublishing does not destroy it.';

comment on column public.tailor_works.description is
  'Optional longer note shown under the design on the public catalogue.';

-- feed_posts already carries `caption`; a design now also has a short name,
-- and the catalogue shows both.
alter table public.feed_posts
  add column if not exists title text;

-- Move any price a tailor already typed at publish time onto the design it
-- describes, so the new editor shows what the public page is already showing.
update public.tailor_works w
set starting_price = p.starting_price,
    currency       = p.currency
from public.feed_posts p
where p.work_id = w.id
  and w.starting_price is null
  and p.starting_price is not null;

-- Same for the name: the post's caption was the only place a title survived
-- publishing, so seed the post's title from it rather than leaving it blank.
update public.feed_posts p
set title = w.title
from public.tailor_works w
where p.work_id = w.id
  and p.title is null
  and w.title is not null;
