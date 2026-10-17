-- ============================================================================
-- A shop that has asked to be deleted disappears from the feed on the REST
-- path too, not only through the API.
--
-- `common/live-owner.ts` states the promise: an account waiting out its 30-day
-- deletion grace period "must vanish from every public surface immediately —
-- that is most of what people mean when they say they want to be deleted".
-- Every public query in the API applies `ownerIsLive()` to keep it.
--
-- The RLS policy did not. `feed_posts_public_read` tested only
-- `status = 'published'`, so the one surface that does NOT go through the API
-- — a direct read of /rest/v1/feed_posts with the public anon key, which ships
-- in every app bundle — still served a leaving tailor's work. Latent rather
-- than exploited (today two accounts are leaving and neither has a published
-- post), which is the right time to close it.
--
-- The test has to be a SECURITY DEFINER function, not an inline subquery: a
-- policy's subquery is itself subject to RLS, and `anon` cannot see `users`
-- rows at all, so an inline EXISTS would be false for everyone and the feed
-- would go dark. Same shape and same reasoning as `current_tailor_ids()`,
-- including the pinned search_path so the function body cannot be redirected
-- at a shadowing table.
--
-- The API reads the feed with the service role and so bypasses this; the cost
-- is paid only by direct REST reads.
-- ============================================================================

create or replace function public.tailor_owner_is_live(p_tailor_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.tailors t
    join public.users u on u.id = t.user_id
    where t.id = p_tailor_id
      and u.deletion_requested_at is null
      and u.deleted_at is null
  );
$$;

comment on function public.tailor_owner_is_live(uuid) is
  'True while the shop''s owner is neither pending deletion nor purged. Used by the public feed policy; mirrors ownerIsLive() in the API.';

drop policy if exists feed_posts_public_read on public.feed_posts;

create policy feed_posts_public_read on public.feed_posts
  for select
  using (
    status = 'published'::feed_post_status
    and public.tailor_owner_is_live(tailor_id)
  );
