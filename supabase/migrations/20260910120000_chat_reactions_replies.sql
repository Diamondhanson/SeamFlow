-- Rich messaging: emoji reactions + reply-to-message.
--
-- `attachments` stays JSONB, so the new 'order' and 'link' attachment kinds
-- need no schema change. Reactions live in a JSONB column on the message (not a
-- side table) so they ride the existing Realtime UPDATE stream — `messages`
-- already has REPLICA IDENTITY FULL, so a reaction/reply write reaches the
-- other device through the same subscription that carries read receipts.

alter table public.messages
  add column if not exists reactions jsonb not null default '[]'::jsonb;

alter table public.messages
  add column if not exists reply_to_id uuid
    references public.messages(id) on delete set null;

create index if not exists messages_reply_to_id_idx
  on public.messages(reply_to_id);
