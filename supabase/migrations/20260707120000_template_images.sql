-- ============================================================================
-- measurement_templates.images — optional reference photos / stencils
--
-- A tailor can attach reference images (a measurement stencil, a garment
-- mockup) to a template so it's easy to recognise and understand. Optional —
-- existing templates keep an empty array and behave exactly as before.
--
-- Shape: JSONB array of { id, storagePath, thumbnailPath, contentType }.
-- Images live in the existing private `designs` storage bucket under
-- `<tailorId>/templates/<uuid>` (the bucket RLS gates on the first path
-- segment = tailor id, so no new bucket or policy is required). The API
-- resolves short-lived signed URLs for each image on read.
-- ============================================================================

alter table public.measurement_templates
  add column if not exists images jsonb not null default '[]'::jsonb;

comment on column public.measurement_templates.images is
  'Optional reference images / stencils: array of {id, storagePath, thumbnailPath, contentType}. Signed URLs resolved by the API on read.';
