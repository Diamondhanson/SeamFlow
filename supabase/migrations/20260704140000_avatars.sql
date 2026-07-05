-- ============================================================================
-- Avatars — tailor profile photos ("logos").
--
-- Unlike designs/order-photos (private + signed URLs), a profile photo is shown
-- everywhere and its URL is persisted on tailors.photo_url, so it must be a
-- STABLE, directly-loadable link. Hence a PUBLIC bucket: reads go through the
-- public CDN URL (no expiry), while writes stay locked to the owner's folder.
--
-- Path convention: <tailor_id>/<uuid>.<ext>  → (storage.foldername(name))[1]
-- is the tailor id, so the write policies are a trivial folder check.
-- Idempotent: bucket upserts, policies drop-then-create.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read is implicit for a public bucket — no SELECT policy needed.
-- Writes are restricted to objects under the tailor's own folder.

drop policy if exists "tailor_insert_avatars" on storage.objects;
create policy "tailor_insert_avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );

drop policy if exists "tailor_update_avatars" on storage.objects;
create policy "tailor_update_avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );

drop policy if exists "tailor_delete_avatars" on storage.objects;
create policy "tailor_delete_avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );
