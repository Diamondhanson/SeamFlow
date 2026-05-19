-- Phase 1.1 prep — adds the group_order_members table.
-- A group order (bridal party, family event, uniform) now carries a list of
-- members. Each member may or may not be a real client row. Per-member
-- measurements live on the member row directly, independent of any linked
-- client's general measurement set.
--
-- Also adds an optional orders.group_order_member_id so that when a tailor
-- starts a formal order for a specific member, the order knows which one.

-- =========================================================================
-- group_order_members
-- =========================================================================

create table public.group_order_members (
  id              uuid primary key default gen_random_uuid(),
  group_order_id  uuid not null references public.group_orders(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  full_name       text not null,
  role_label      text,
  measurements    jsonb not null default '{}'::jsonb,
  notes           text,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index group_order_members_group_order_id_idx on public.group_order_members(group_order_id);
create index group_order_members_client_id_idx     on public.group_order_members(client_id);
create index group_order_members_position_idx      on public.group_order_members(group_order_id, position);

create trigger group_order_members_set_updated_at
  before update on public.group_order_members
  for each row execute function public.set_updated_at();

-- RLS: gated by parent group_order's tailor ownership.
alter table public.group_order_members enable row level security;

create policy group_order_members_tailor_all on public.group_order_members
  for all
  using (
    group_order_id in (
      select id from public.group_orders
      where tailor_id in (select public.current_tailor_ids())
    )
  )
  with check (
    group_order_id in (
      select id from public.group_orders
      where tailor_id in (select public.current_tailor_ids())
    )
  );

-- =========================================================================
-- orders — link an order to a specific group member (optional).
-- =========================================================================

alter table public.orders
  add column group_order_member_id uuid
  references public.group_order_members(id) on delete set null;

create index orders_group_order_member_id_idx on public.orders(group_order_member_id);
