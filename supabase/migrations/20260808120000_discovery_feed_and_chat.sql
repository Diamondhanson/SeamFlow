-- ============================================================================
-- Discovery-first client app — foundation (ROADMAP Appendix D, phases C1–C3).
--
-- Adds:
--   feed_posts     — tailor-approved public showcase images (D.1.1)
--   tailors.*      — public storefront + trust fields (D.1.2)
--   conversations  — one thread per client ↔ tailor (D.1.3)
--   messages       — the thread contents (D.1.4)
--   storage        — public `feed` bucket + private `chat-media` bucket (D.5)
--   realtime       — messages + conversations on the supabase_realtime publication
--
-- Strictly ADDITIVE: new enums, new tables, new nullable/defaulted columns.
-- Nothing existing is dropped, renamed, or retyped, so this is safe to run
-- against a database holding live tailor and client records.
--
-- Idempotent throughout (if not exists / do-blocks) so a partial run can be
-- re-applied without hand-editing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.feed_post_status as enum ('published', 'hidden', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.conversation_origin as enum ('inquiry', 'order');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_sender_type as enum ('client', 'tailor');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- D.1.2 — Tailor public storefront + trust fields
--
-- `business_name` and `photo_url` already exist. Everything here is optional so
-- existing tailors stay valid; the public projection simply shows less until
-- they fill it in.
-- ---------------------------------------------------------------------------
alter table public.tailors
  add column if not exists bio                 text,
  add column if not exists city                text,
  add column if not exists specialties         jsonb        not null default '[]'::jsonb,
  add column if not exists languages           jsonb        not null default '[]'::jsonb,
  add column if not exists avatar_path         text,
  add column if not exists is_verified         boolean      not null default false,
  add column if not exists accepts_remote      boolean      not null default false,
  add column if not exists follower_count      integer      not null default 0,
  -- Computed nightly from median tailor reply latency; null until enough data.
  add column if not exists response_time_hours integer;

create index if not exists tailors_city_idx on public.tailors (city);

-- ---------------------------------------------------------------------------
-- D.1.1 — feed_posts
--
-- Denormalised on purpose: the public feed query must never touch a private
-- table. `city` and the image paths are copied at publish time.
--
-- `width`/`height` are stored so the masonry grid can reserve space before the
-- image loads — without them the feed reflows on every image and feels broken.
--
-- NOTE: the `embedding vector` column from D.1.1 is deliberately NOT created
-- here. It needs the pgvector extension and is only used by "more like this"
-- (phase C5 / roadmap 3.7). Add it in its own migration when that lands.
-- ---------------------------------------------------------------------------
create table if not exists public.feed_posts (
  id                uuid primary key default gen_random_uuid(),
  tailor_id         uuid not null references public.tailors(id) on delete cascade,
  -- Nullable so a future standalone upload (not derived from an order) fits.
  order_photo_id    uuid references public.order_photos(id) on delete set null,
  public_path       text not null,
  public_thumb_path text not null,
  width             integer,
  height            integer,
  caption           text,
  garment_type      text,
  tags              jsonb not null default '[]'::jsonb,
  fabric            text,
  starting_price    numeric(12, 2),
  currency          char(3),
  city              text,
  status            public.feed_post_status not null default 'published',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Feed page ordering (keyset on created_at, id).
create index if not exists feed_posts_status_created_idx
  on public.feed_posts (status, created_at desc, id desc);
create index if not exists feed_posts_garment_type_idx on public.feed_posts (garment_type);
create index if not exists feed_posts_tailor_id_idx    on public.feed_posts (tailor_id);
create index if not exists feed_posts_city_idx         on public.feed_posts (city);
create index if not exists feed_posts_tags_gin         on public.feed_posts using gin (tags);

alter table public.feed_posts enable row level security;

-- Two permissive policies, OR'd: the world sees published posts; the owning
-- tailor additionally sees and manages their hidden ones.
drop policy if exists feed_posts_public_read on public.feed_posts;
create policy feed_posts_public_read on public.feed_posts
  for select
  using (status = 'published');

drop policy if exists feed_posts_owner_all on public.feed_posts;
create policy feed_posts_owner_all on public.feed_posts
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));

-- ---------------------------------------------------------------------------
-- D.1.3 — conversations
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  client_user_id  uuid not null references public.users(id) on delete cascade,
  tailor_id       uuid not null references public.tailors(id) on delete cascade,
  origin          public.conversation_origin not null default 'inquiry',
  design_post_id  uuid references public.feed_posts(id) on delete set null,
  order_id        uuid references public.orders(id) on delete set null,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  client_unread   integer not null default 0,
  tailor_unread   integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists conversations_client_idx
  on public.conversations (client_user_id, last_message_at desc);
create index if not exists conversations_tailor_idx
  on public.conversations (tailor_id, last_message_at desc);

-- Re-inquiring about the same design reuses the thread rather than spawning a
-- second one. Partial, because design_post_id is nullable and NULLs don't
-- collide in a plain unique index.
create unique index if not exists conversations_client_tailor_design_uniq
  on public.conversations (client_user_id, tailor_id, design_post_id)
  where design_post_id is not null;

-- A client with no design in mind gets exactly one general thread per tailor.
create unique index if not exists conversations_client_tailor_general_uniq
  on public.conversations (client_user_id, tailor_id)
  where design_post_id is null;

alter table public.conversations enable row level security;

drop policy if exists conversations_participants_all on public.conversations;
create policy conversations_participants_all on public.conversations
  for all
  using (
    client_user_id = auth.uid()
    or tailor_id in (select public.current_tailor_ids())
  )
  with check (
    client_user_id = auth.uid()
    or tailor_id in (select public.current_tailor_ids())
  );

-- ---------------------------------------------------------------------------
-- D.1.4 — messages
--
-- `client_id` is a caller-supplied idempotency key. The offline send queue can
-- retry the same message after a timeout without risking a duplicate landing —
-- the unique index turns the second insert into a no-op the API can detect.
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type     public.message_sender_type not null,
  sender_user_id  uuid not null references public.users(id) on delete cascade,
  body            text,
  attachments     jsonb not null default '[]'::jsonb,
  client_id       text,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

-- Keyset pagination walks backwards through a thread.
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc, id desc);

create unique index if not exists messages_conversation_client_id_uniq
  on public.messages (conversation_id, client_id)
  where client_id is not null;

-- A message must have something in it.
do $$ begin
  alter table public.messages
    add constraint messages_body_or_attachments_chk
    check (
      (body is not null and length(btrim(body)) > 0)
      or jsonb_array_length(attachments) > 0
    );
exception when duplicate_object then null; end $$;

alter table public.messages enable row level security;

-- Participant-only, resolved through the parent conversation. This is what
-- makes Realtime safe: subscribers only receive rows this policy admits.
drop policy if exists messages_participants_all on public.messages;
create policy messages_participants_all on public.messages
  for all
  using (
    conversation_id in (
      select id from public.conversations
      where client_user_id = auth.uid()
         or tailor_id in (select public.current_tailor_ids())
    )
  )
  with check (
    conversation_id in (
      select id from public.conversations
      where client_user_id = auth.uid()
         or tailor_id in (select public.current_tailor_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime — live threads and live conversation-list reordering.
-- `add table` errors if already a member, so guard it.
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null; end $$;

-- Realtime sends old-record data for updates/deletes only with a replica
-- identity; needed so read-receipt updates carry enough to reconcile locally.
alter table public.messages replica identity full;

-- ---------------------------------------------------------------------------
-- D.5 — Storage buckets
--
-- The whole point: order photos stay PRIVATE. Publishing copies derivatives
-- into `feed`, which is public-read and CDN-fronted. The private original is
-- never exposed.
--
-- `chat-media` is private — chat attachments are between two people and are
-- served through short-lived signed URLs like order photos.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('feed', 'feed', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

-- feed bucket: world-readable; only the owning tailor may write, and only
-- under their own <tailorId>/ prefix.
drop policy if exists feed_public_read on storage.objects;
create policy feed_public_read on storage.objects
  for select
  using (bucket_id = 'feed');

drop policy if exists feed_tailor_write on storage.objects;
create policy feed_tailor_write on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'feed'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'feed'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailors where user_id = auth.uid()
    )
  );

-- chat-media: readable and writable only by the two participants of the
-- conversation the path is namespaced under (<conversationId>/<file>).
drop policy if exists chat_media_participants on storage.objects;
create policy chat_media_participants on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'chat-media'
    and ((storage.foldername(name))[1])::uuid in (
      select id from public.conversations
      where client_user_id = auth.uid()
         or tailor_id in (select public.current_tailor_ids())
    )
  )
  with check (
    bucket_id = 'chat-media'
    and ((storage.foldername(name))[1])::uuid in (
      select id from public.conversations
      where client_user_id = auth.uid()
         or tailor_id in (select public.current_tailor_ids())
    )
  );
