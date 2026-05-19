-- SeamFlow Phase 0.3 — Row-Level Security policies.
-- Pattern: every multi-tenant row is gated by a "do you own the tailor?" check
-- against auth.uid(). Helper function below makes the policies readable.
-- The API still enforces its own guards (belt + suspenders per Appendix B.3).

-- =========================================================================
-- Helper: current_tailor_ids()
-- Returns the set of tailor ids the calling user owns. Marked STABLE so the
-- planner can inline it. Used by every policy below.
-- =========================================================================

create or replace function public.current_tailor_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.tailors where user_id = auth.uid();
$$;

-- =========================================================================
-- users
-- Self-only: each user sees and edits exactly their own row.
-- =========================================================================

alter table public.users enable row level security;

create policy users_self_select on public.users
  for select using (id = auth.uid());

create policy users_self_update on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy users_self_insert on public.users
  for insert with check (id = auth.uid());

-- =========================================================================
-- tailors
-- Owner-only: the user owning the tailor can do everything.
-- =========================================================================

alter table public.tailors enable row level security;

create policy tailors_owner_all on public.tailors
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================================
-- clients
-- Visible to the owning tailor only.
-- =========================================================================

alter table public.clients enable row level security;

create policy clients_tailor_all on public.clients
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));

-- =========================================================================
-- measurement_sets
-- Derived: row is visible if its client belongs to one of my tailors.
-- =========================================================================

alter table public.measurement_sets enable row level security;

create policy measurement_sets_tailor_all on public.measurement_sets
  for all
  using (
    client_id in (
      select id from public.clients
      where tailor_id in (select public.current_tailor_ids())
    )
  )
  with check (
    client_id in (
      select id from public.clients
      where tailor_id in (select public.current_tailor_ids())
    )
  );

-- =========================================================================
-- fabrics
-- =========================================================================

alter table public.fabrics enable row level security;

create policy fabrics_tailor_all on public.fabrics
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));

-- =========================================================================
-- group_orders
-- =========================================================================

alter table public.group_orders enable row level security;

create policy group_orders_tailor_all on public.group_orders
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));

-- =========================================================================
-- orders
-- =========================================================================

alter table public.orders enable row level security;

create policy orders_tailor_all on public.orders
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));

-- =========================================================================
-- order_items
-- Derived from parent order.
-- =========================================================================

alter table public.order_items enable row level security;

create policy order_items_tailor_all on public.order_items
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
-- payments
-- Derived from parent order. Note: payment webhooks run with the service role
-- key and bypass RLS, so payment inserts from /webhooks/* are unaffected.
-- =========================================================================

alter table public.payments enable row level security;

create policy payments_tailor_all on public.payments
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
-- order_events
-- Read + insert only. No update/delete policies on purpose: events are
-- append-only. Service role can still rewrite history if absolutely needed.
-- =========================================================================

alter table public.order_events enable row level security;

create policy order_events_tailor_select on public.order_events
  for select
  using (
    order_id in (
      select id from public.orders
      where tailor_id in (select public.current_tailor_ids())
    )
  );

create policy order_events_tailor_insert on public.order_events
  for insert
  with check (
    order_id in (
      select id from public.orders
      where tailor_id in (select public.current_tailor_ids())
    )
  );
