-- ============================================================================
-- Help & Support tickets (plan step 1).
--
-- A user — tailor or client — writing to SeamFlow. Separate from
-- conversations/messages on purpose: those always join exactly one client to
-- one tailor, and a ticket has neither shape. See packages/schemas/src/support.ts.
--
-- Additive and idempotent: new enums, tables, one bucket. Nothing existing is
-- touched.
-- ============================================================================

do $$ begin
  create type public.support_category as enum ('app_problem', 'payment', 'account', 'order', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_status as enum ('open', 'waiting_on_user', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_side as enum ('tailor', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_sender as enum ('user', 'support');
exception when duplicate_object then null; end $$;

-- Ticket numbers start at 1000 so the first real ticket doesn't read "SF-1" —
-- a number that small tells a user they're the first person with a problem.
create sequence if not exists public.support_ticket_number_seq start 1000;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique default nextval('public.support_ticket_number_seq'),
  user_id uuid not null references public.users(id) on delete cascade,
  side public.support_side not null,
  category public.support_category not null,
  status public.support_status not null default 'open',
  subject text not null,
  order_id uuid references public.orders(id) on delete set null,
  client_id text not null,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  user_unread integer not null default 0,
  support_unread integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- A retried "Send" from a flaky connection returns the first ticket.
  unique (user_id, client_id)
);

create index if not exists support_tickets_user_idx
  on public.support_tickets (user_id, last_message_at desc);
-- The support inbox (step 2) lists by status, newest activity first.
create index if not exists support_tickets_status_idx
  on public.support_tickets (status, last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender public.support_sender not null,
  -- Null for SeamFlow staff until the inbox has its own accounts (step 2).
  sender_user_id uuid references public.users(id) on delete set null,
  body text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  client_id text,
  created_at timestamptz not null default now(),
  unique (ticket_id, client_id)
);

create index if not exists support_messages_ticket_idx
  on public.support_messages (ticket_id, created_at);

-- Everything goes through the API (service role). RLS on with no policies
-- means the anon/authenticated keys in the apps can read nothing directly.
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Storage: private screenshots, foldered by the uploader's user id so a user
-- can only write under their own prefix. Reads are signed URLs from the API.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('support-media', 'support-media', false)
on conflict (id) do nothing;

drop policy if exists support_media_owner_write on storage.objects;
create policy support_media_owner_write on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'support-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
