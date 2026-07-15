-- ============================================================================
-- order_claims — links a consumer (end-customer) account to an order they own.
--
-- The consumer app (seamflow-client) lets a signed-in customer "claim" an order
-- by presenting its share-link token. A claim maps their auth user id to the
-- order, so they can see it in a unified inbox across every tailor — and read
-- the measurements + photos attached to it — without the tailor doing anything.
--
-- RLS is keyed to the auth user directly (user_id = auth.uid()), NOT to a
-- tailor. The API also filters by user_id explicitly (service-role), so this is
-- belt-and-suspenders for any direct client access.
-- ============================================================================

create table public.order_claims (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  tailor_id   uuid not null references public.tailors(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, order_id)
);

create index order_claims_user_id_idx on public.order_claims(user_id);

alter table public.order_claims enable row level security;

create policy order_claims_self_all on public.order_claims
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
