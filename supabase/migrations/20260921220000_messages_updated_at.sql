-- ============================================================================
-- messages.updated_at — lets a phone ask "what changed since I last looked?"
--
-- Plan step 3 keeps a copy of each chat on the device and syncs only the
-- difference. New messages are easy (created_at), but a message also changes
-- after it is sent — a reaction, a read receipt, the account-deletion purge
-- blanking its text — and those have no timestamp of their own. This column
-- moves on ANY update, via a trigger, so no code path can forget to bump it.
--
-- Additive: a defaulted column, a backfill, a trigger and an index.
-- ============================================================================

alter table public.messages
  add column if not exists updated_at timestamptz not null default now();

-- Existing rows: the latest thing we know happened to each.
update public.messages
set updated_at = greatest(created_at, coalesce(read_at, created_at));

create or replace function public.messages_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists messages_touch_updated_at on public.messages;
create trigger messages_touch_updated_at
  before update on public.messages
  for each row execute function public.messages_touch_updated_at();

create index if not exists messages_conversation_updated_idx
  on public.messages (conversation_id, updated_at);
