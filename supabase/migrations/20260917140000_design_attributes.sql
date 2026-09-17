-- ============================================================================
-- Structured design attributes — the intake half of feed search.
--
-- Evidence this exists: of 38 published feed posts, ZERO carry a tag, and
-- garment_type has fragmented into "dress"(13), "set"(6), "gown"(4),
-- "cover-up"(1) and 4 NULLs. Search currently ILIKEs across a caption, that
-- fragmented column, and an empty array. No retrieval work can fix data that
-- was never collected.
--
-- So: three columns that a model proposes and a tailor confirms.
--
--   garment_key  the taxonomy key (packages/schemas/src/garment.ts), NOT free
--                text. garment_type stays as the human label the tailor typed,
--                because "Long kaftan" is worth showing even though "kaftan"
--                is what we filter on. One is for reading, one is for matching.
--   colors       [{key, hex, share}] — key for filtering, hex for a true
--                swatch, share for ranking a 60% red above a 5% red.
--   attributes   style keys (sleeve, length, neckline, detail…).
--
-- Deliberately NOT added here: a tsvector or an embedding. Those belong with
-- the retrieval change, and adding an index over columns that are still empty
-- on every existing row would index nothing. Backfill first (the classifier
-- runs over the existing 38), then index.
-- ============================================================================

alter table public.feed_posts
  add column if not exists garment_key text,
  add column if not exists colors      jsonb not null default '[]'::jsonb,
  add column if not exists attributes  jsonb not null default '[]'::jsonb;

alter table public.tailor_works
  add column if not exists garment_key text,
  add column if not exists colors      jsonb not null default '[]'::jsonb,
  add column if not exists attributes  jsonb not null default '[]'::jsonb;

comment on column public.feed_posts.garment_key is
  'Stable key from the garment taxonomy. Filter on this; show garment_type.';
comment on column public.feed_posts.colors is
  'Extracted palette: [{key, hex, share}]. key snaps to the colour vocabulary.';
comment on column public.feed_posts.attributes is
  'Style keys from DESIGN_ATTRIBUTES — silhouette, length, sleeve, neckline, detail.';

-- Facet counts ("Kaftan 12") scan this on every feed open, so it earns an
-- index even before the catalogue is large.
create index if not exists feed_posts_garment_key_idx
  on public.feed_posts (garment_key)
  where status = 'published';

-- GIN over the jsonb arrays: "show me everything red" and "everything with
-- long sleeves" are containment queries, which is exactly what GIN answers.
create index if not exists feed_posts_colors_idx
  on public.feed_posts using gin (colors jsonb_path_ops);

create index if not exists feed_posts_attributes_idx
  on public.feed_posts using gin (attributes jsonb_path_ops);
