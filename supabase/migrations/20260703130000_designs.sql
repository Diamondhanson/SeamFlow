-- ============================================================================
-- Designs — the tailor's inspiration library ("moodboard").
--
-- Same shape as order_photos, but tailor-scoped (no parent order) and in its
-- own private storage bucket. Path convention: <tailor_id>/designs/<uuid>.<ext>
-- so storage RLS is trivial (path[0] is the tailor id).
-- ============================================================================

create table public.designs (
  id              uuid primary key default gen_random_uuid(),
  tailor_id       uuid not null references public.tailors(id) on delete cascade,
  source          text not null default 'uploaded',   -- 'uploaded' | 'generated'
  storage_path    text not null,
  thumbnail_path  text,
  content_type    text,
  caption         text,
  tags            jsonb not null default '[]'::jsonb,
  ai_notes        text,
  prompt          text,
  created_at      timestamptz not null default now()
);

create index designs_tailor_id_idx on public.designs(tailor_id);

-- RLS: tailor owns their own designs directly.
alter table public.designs enable row level security;

create policy designs_tailor_all on public.designs
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));

-- =========================================================================
-- Supabase Storage bucket — private, 10 MB cap, image MIME types only.
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'designs',
  'designs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =========================================================================
-- storage.objects RLS — tailor can act on objects under their tailor_id folder.
-- =========================================================================

create policy "tailor_insert_designs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'designs'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );

create policy "tailor_select_designs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'designs'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );

create policy "tailor_update_designs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'designs'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'designs'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );

create policy "tailor_delete_designs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'designs'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );
