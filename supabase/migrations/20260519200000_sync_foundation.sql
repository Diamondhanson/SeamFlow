-- Phase 1.4.1 — sync foundation.
-- A single append-only `sync_tombstones` table records every delete from
-- the syncable tables. The sync pull endpoint returns:
--   - created/updated: rows from each table with created_at / updated_at > lastPulledAt
--   - deleted: ids from sync_tombstones with deleted_at > lastPulledAt
--
-- This way hard-deletes continue to work normally (CASCADE FK behaviour is
-- preserved), but offline clients can still learn what disappeared.

-- =========================================================================
-- sync_tombstones — append-only deletion ledger
-- =========================================================================

create table public.sync_tombstones (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid not null,
  tailor_id   uuid not null,
  deleted_at  timestamptz not null default now()
);

create index sync_tombstones_tailor_deleted_idx
  on public.sync_tombstones(tailor_id, deleted_at);
create index sync_tombstones_entity_idx
  on public.sync_tombstones(entity_type, entity_id);

-- RLS — same gating as the other tables.
alter table public.sync_tombstones enable row level security;

create policy sync_tombstones_tailor_select on public.sync_tombstones
  for select
  using (tailor_id in (select public.current_tailor_ids()));

-- No insert/update/delete policies on purpose — only triggers (running as
-- the table owner) can write here. Authenticated users can read their own
-- deletion ledger but cannot manipulate it.

-- =========================================================================
-- Generic trigger function — derives tailor_id per table from OLD.* and
-- writes one tombstone row.
-- =========================================================================

create or replace function public.record_sync_tombstone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tailor_id uuid;
begin
  case tg_table_name
    when 'clients' then
      v_tailor_id := (OLD).tailor_id;
    when 'measurement_sets' then
      select tailor_id into v_tailor_id from public.clients where id = (OLD).client_id;
    when 'measurement_templates' then
      v_tailor_id := (OLD).tailor_id;
    when 'group_orders' then
      v_tailor_id := (OLD).tailor_id;
    when 'group_order_members' then
      select tailor_id into v_tailor_id from public.group_orders where id = (OLD).group_order_id;
    when 'orders' then
      v_tailor_id := (OLD).tailor_id;
    when 'order_items' then
      select tailor_id into v_tailor_id from public.orders where id = (OLD).order_id;
    when 'order_photos' then
      select tailor_id into v_tailor_id from public.orders where id = (OLD).order_id;
    else
      v_tailor_id := null;
  end case;

  if v_tailor_id is not null then
    insert into public.sync_tombstones (entity_type, entity_id, tailor_id)
    values (tg_table_name, (OLD).id, v_tailor_id);
  end if;
  return OLD;
end;
$$;

-- =========================================================================
-- Triggers — AFTER DELETE, one per syncable table.
-- Child triggers fire before parent's CASCADE deletes the parent row, so
-- looking up tailor_id from the parent still works.
-- =========================================================================

create trigger clients_tombstone
  after delete on public.clients
  for each row execute function public.record_sync_tombstone();

create trigger measurement_sets_tombstone
  after delete on public.measurement_sets
  for each row execute function public.record_sync_tombstone();

create trigger measurement_templates_tombstone
  after delete on public.measurement_templates
  for each row execute function public.record_sync_tombstone();

create trigger group_orders_tombstone
  after delete on public.group_orders
  for each row execute function public.record_sync_tombstone();

create trigger group_order_members_tombstone
  after delete on public.group_order_members
  for each row execute function public.record_sync_tombstone();

create trigger orders_tombstone
  after delete on public.orders
  for each row execute function public.record_sync_tombstone();

create trigger order_items_tombstone
  after delete on public.order_items
  for each row execute function public.record_sync_tombstone();

create trigger order_photos_tombstone
  after delete on public.order_photos
  for each row execute function public.record_sync_tombstone();
