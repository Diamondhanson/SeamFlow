-- Phase 1.3 follow-up — store a per-photo thumbnail path so list/grid views
-- can pull a 20–40 KB thumb instead of the full 150–300 KB image. The full
-- image still lives at `storage_path`; thumb at `thumbnail_path`. Both are
-- under the same `<tailor_id>/<order_id>/` folder so the existing storage
-- RLS already covers them.

alter table public.order_photos
  add column thumbnail_path text;
