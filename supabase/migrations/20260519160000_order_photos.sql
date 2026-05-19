-- Phase 1.3 — photos on orders.
-- We deviate from the ROADMAP's Cloudflare R2 + Cloudflare Images path and
-- use Supabase Storage instead: same project, no extra vendor. The
-- structural advice (store image KEYS, not URLs) still holds — swapping to
-- R2 later is a localized change in OrderPhotosService.
--
-- Path convention: <tailor_id>/<order_id>/<photo_uuid>.<ext>
-- That layout makes storage RLS trivial (path[0] is the tailor id).

-- =========================================================================
-- order_photos — metadata only. Pixels live in Supabase Storage.
-- =========================================================================

create table public.order_photos (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders(id) on delete cascade,
  storage_path          text not null,
  content_type          text,
  role                  text not null default 'reference',
  caption               text,
  uploaded_by_user_id   uuid references public.users(id) on delete set null,
  created_at            timestamptz not null default now()
);

create index order_photos_order_id_idx on public.order_photos(order_id);

-- RLS: gated by parent order's tailor ownership.
alter table public.order_photos enable row level security;

create policy order_photos_tailor_all on public.order_photos
  for all
  using (
    order_id in (
      select id from public.orders
      where tailor_id in (select public.current_tailor_ids())
    )
  )
  with check (
    order_id in (
      select id from public.orders
      where tailor_id in (select public.current_tailor_ids())
    )
  );

-- =========================================================================
-- Supabase Storage bucket — private. 10 MB cap. Image MIME types only.
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-photos',
  'order-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =========================================================================
-- storage.objects RLS — tailor can act on objects under their tailor_id folder.
-- (storage.foldername(name))[1] returns the first path segment.
-- =========================================================================

create policy "tailor_insert_order_photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );

create policy "tailor_select_order_photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );

create policy "tailor_update_order_photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );

create policy "tailor_delete_order_photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );
