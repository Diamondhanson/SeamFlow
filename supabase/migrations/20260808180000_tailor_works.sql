-- ============================================================================
-- "My Designs" — the tailor's portfolio of work they actually MADE.
--
-- Distinct from `designs`, which is the Design Studio: inspiration collected
-- from elsewhere. This is their own finished work, and it is the thing that
-- feeds the public discovery feed.
--
-- Relationship to feed_posts, and why it's two tables:
--
--   tailor_works  PRIVATE portfolio. Every piece, published or not. The image
--                 lives in the private `works` bucket (direct uploads) or is
--                 referenced from the private `order-photos` bucket (pieces
--                 adopted from a finished order).
--   feed_posts    PUBLIC projection. Exists only while a work is published,
--                 and points at copies in the public `feed` bucket.
--
-- Keeping them apart preserves the property the roadmap called for: the public
-- feed query never reads a table containing private rows. It also means an
-- unpublished piece is never publicly addressable, even by guessing the URL.
--
-- Strictly ADDITIVE. Safe against live data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums — structured so filters actually work. Free text can't be filtered on
-- reliably once two tailors spell "womens" three different ways.
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.work_audience as enum ('women', 'men', 'unisex', 'children');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.work_occasion as enum (
    'wedding', 'traditional', 'corporate', 'casual', 'party'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.work_source as enum ('upload', 'order_photo');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- tailor_works
-- ---------------------------------------------------------------------------
create table if not exists public.tailor_works (
  id             uuid primary key default gen_random_uuid(),
  tailor_id      uuid not null references public.tailors(id) on delete cascade,

  source         public.work_source not null default 'upload',
  -- Which private bucket `storage_path` lives in: 'works' for a direct upload,
  -- 'order-photos' for a piece adopted from a finished order. Storing it
  -- explicitly beats inferring from `source` at every read site.
  storage_bucket text not null default 'works',
  storage_path   text not null,
  thumbnail_path text,
  width          integer,
  height         integer,

  -- Set when the piece came from (or is linked to) real work.
  order_photo_id uuid references public.order_photos(id) on delete set null,
  order_id       uuid references public.orders(id) on delete set null,

  -- Attributes. Nullable because a tailor should be able to save a photo now
  -- and describe it later rather than being blocked by a form.
  title          text,
  garment_type   text,
  audience       public.work_audience,
  fabric         text,
  occasion       public.work_occasion,
  tags           jsonb not null default '[]'::jsonb,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists tailor_works_tailor_created_idx
  on public.tailor_works (tailor_id, created_at desc, id desc);
create index if not exists tailor_works_garment_type_idx on public.tailor_works (garment_type);
create index if not exists tailor_works_audience_idx     on public.tailor_works (audience);
create index if not exists tailor_works_occasion_idx     on public.tailor_works (occasion);
create index if not exists tailor_works_tags_gin         on public.tailor_works using gin (tags);

-- One portfolio entry per source order photo — adopting the same photo twice
-- would show a tailor the same garment twice in their own grid.
create unique index if not exists tailor_works_order_photo_uniq
  on public.tailor_works (order_photo_id)
  where order_photo_id is not null;

alter table public.tailor_works enable row level security;

-- Owner-only. No public read policy at all: this table is never served to an
-- anonymous browser — that's what feed_posts is for.
drop policy if exists tailor_works_owner_all on public.tailor_works;
create policy tailor_works_owner_all on public.tailor_works
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));

-- ---------------------------------------------------------------------------
-- feed_posts — link back to the source work, and carry the two new attributes
-- so the PUBLIC feed can filter on them without touching tailor_works.
-- ---------------------------------------------------------------------------
alter table public.feed_posts
  add column if not exists work_id  uuid references public.tailor_works(id) on delete cascade,
  add column if not exists audience public.work_audience,
  add column if not exists occasion public.work_occasion;

create index if not exists feed_posts_work_id_idx  on public.feed_posts (work_id);
create index if not exists feed_posts_audience_idx on public.feed_posts (audience);
create index if not exists feed_posts_occasion_idx on public.feed_posts (occasion);

-- A work is published at most once.
create unique index if not exists feed_posts_work_uniq
  on public.feed_posts (work_id)
  where work_id is not null;

-- ---------------------------------------------------------------------------
-- Private `works` bucket for direct uploads.
--
-- Private on purpose: an unpublished piece must not be readable by URL. Only
-- the copy made at publish time lands in the public `feed` bucket.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('works', 'works', false)
on conflict (id) do nothing;

drop policy if exists works_tailor_all on storage.objects;
create policy works_tailor_all on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'works'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'works'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );
