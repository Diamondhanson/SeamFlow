-- ============================================================================
-- Order photos remember where they came from.
--
-- A photo can now be attached to an order straight from Design Studio or My
-- Designs instead of only from the camera or the phone's gallery. The file is
-- COPIED rather than referenced: an order is a record of a job that has to
-- stay true months later, and a tailor tidying their design studio in October
-- must not punch a hole in an order from August.
--
-- These columns are therefore provenance only, never the source of the image.
-- The order photo owns its own object in the order-photos bucket and renders
-- from that. Deleting the original design nulls the pointer and changes
-- nothing else — which is exactly why `on delete set null` and not `cascade`.
-- ============================================================================

alter table public.order_photos
  add column if not exists source_design_id uuid
    references public.designs (id) on delete set null,
  add column if not exists source_work_id uuid
    references public.tailor_works (id) on delete set null;

alter table public.group_order_photos
  add column if not exists source_design_id uuid
    references public.designs (id) on delete set null,
  add column if not exists source_work_id uuid
    references public.tailor_works (id) on delete set null;

-- Answers "which orders did I use this design on?" — the only query these
-- columns exist to serve. Partial, because the overwhelming majority of order
-- photos come from a camera and carry neither pointer.
create index if not exists order_photos_source_design_id_idx
  on public.order_photos (source_design_id)
  where source_design_id is not null;

create index if not exists order_photos_source_work_id_idx
  on public.order_photos (source_work_id)
  where source_work_id is not null;

comment on column public.order_photos.source_design_id is
  'Provenance only. The photo owns its own file; the design may be deleted.';
comment on column public.order_photos.source_work_id is
  'Provenance only. The photo owns its own file; the work may be deleted.';
