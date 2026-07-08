-- ============================================================================
-- Fabric library integration — wire the existing `fabrics` table into orders.
--
-- The `fabrics` table (name, supplier, color, composition, yardage_meters,
-- cost_per_meter, photo_key) already exists with RLS + an updated_at trigger.
-- This migration makes fabric a first-class thing the rest of the app points at:
--
--  1. fabrics.photo_thumb_key — the swatch photo is stored as two WebP variants
--     (full + thumb) like every other image in the app; the thumb keeps lists
--     light while the detail/swatch uses the full image. Signed URLs for both
--     are resolved by the API on read. Photos live in the existing private
--     `designs` bucket under `<tailorId>/fabrics/<uuid>` (bucket RLS gates on the
--     first path segment = tailor id, so no new bucket or policy is required).
--
--  2. orders.fabric_id — the fabric used for an individual order (nullable;
--     a group order shares one via group_orders.shared_fabric_id instead).
--
--  3. orders.fabric_yardage_used — meters of that fabric used on the order,
--     which pre-fills the invoice's fabric line (quantity × cost_per_meter).
--
-- All additive + idempotent. Existing rows keep NULLs and behave as before.
-- ============================================================================

alter table public.fabrics
  add column if not exists photo_thumb_key text;

comment on column public.fabrics.photo_thumb_key is
  'Storage key of the small (thumb) swatch variant in the designs bucket. Full variant is photo_key. Signed URLs resolved by the API on read.';

alter table public.orders
  add column if not exists fabric_id uuid references public.fabrics(id) on delete set null;

alter table public.orders
  add column if not exists fabric_yardage_used numeric(10,2);

create index if not exists orders_fabric_id_idx on public.orders(fabric_id);

comment on column public.orders.fabric_id is
  'Fabric used for this order (nullable). Feeds the invoice fabric line and the client-facing order page.';
comment on column public.orders.fabric_yardage_used is
  'Meters of fabric_id used on this order; pre-fills the invoice fabric line quantity.';
