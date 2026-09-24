-- ============================================================================
-- Link a conversation to the tailor's own client record.
--
-- The person in a thread is a `users` row (their account). Everything the
-- tailor's order machinery touches — orders, measurement sets — hangs off
-- `clients`, which is the tailor's private book. Until now nothing joined the
-- two: `createQuote` worked out the client by phone, used it, and threw the
-- answer away.
--
-- Keeping it means the tailor answers "who is this?" once. Every later action
-- in that thread (save these measurements, start an order from them) is then a
-- single tap instead of a picker.
--
-- Nullable on purpose: a thread that has never become work has no client row,
-- and inventing one for every enquiry would fill the book with strangers.
-- ============================================================================

alter table public.conversations
  add column if not exists client_id uuid references public.clients(id) on delete set null;

comment on column public.conversations.client_id is
  'The tailor''s client-book record for this thread''s customer. Set on first quote or first measurement saved.';

-- Threads that already became orders know the answer — take it from the order
-- rather than making the tailor re-answer for work they already accepted.
update public.conversations c
   set client_id = o.client_id
  from public.orders o
 where c.order_id = o.id
   and c.client_id is null;
