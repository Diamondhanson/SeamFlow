-- Phase 1 architectural cleanup (pre-1.10).
--
-- Two changes:
--
-- 1. clients.address — single free-form string column. The mobile create-
--    client form drops to three required fields (name, phone, address);
--    email + notes stay on the table (nullable) for the edit flow but are
--    no longer collected at creation. Address is nullable in the DB so
--    historical rows (and bulk imports) don't need a backfill.
--
-- 2. group_orders.owner_client_id — direct foreign key from a group order
--    to the client who owns / commissioned it. Previously the only owner
--    link was group_orders.owner_member_id → group_order_members.id, which
--    required promoting a member to a client to capture contact details.
--    The new atomic create-group-order-with-members flow captures the
--    owner upfront (either by picking from the client list or by creating
--    a new client inline) so this column is the canonical owner pointer
--    going forward. owner_member_id stays for backward compatibility and
--    for the "measurements for the owner as a participant" case.
--
-- Backfill strategy: none. Existing groups have owner_client_id = NULL,
-- which the UI renders as "No owner set" with an inline "set owner" CTA.

alter table public.clients
  add column address text;

alter table public.group_orders
  add column owner_client_id uuid
  references public.clients(id) on delete set null;

create index group_orders_owner_client_id_idx
  on public.group_orders(owner_client_id);

comment on column public.clients.address is
  'Single free-form address string. Captured at client creation in mobile UI; nullable in DB.';

comment on column public.group_orders.owner_client_id is
  'The client who commissioned this group order. Canonical owner pointer (preferred over the legacy owner_member_id).';
