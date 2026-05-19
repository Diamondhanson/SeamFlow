-- Phase 1.1+ — measurement templates + group order owner.
-- Pulled forward from Phase 2.7. Templates define the SHAPE of a measurement
-- form (which fields, labels, units), not the values themselves. A tailor
-- owns a library of templates; picking one in the new-order flow drives the
-- measurement input form.

-- =========================================================================
-- measurement_templates
-- =========================================================================

create table public.measurement_templates (
  id            uuid primary key default gen_random_uuid(),
  tailor_id     uuid not null references public.tailors(id) on delete cascade,
  name          text not null,
  garment_type  text,
  description   text,
  fields        jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index measurement_templates_tailor_id_idx on public.measurement_templates(tailor_id);
create index measurement_templates_garment_type_idx on public.measurement_templates(garment_type);

create trigger measurement_templates_set_updated_at
  before update on public.measurement_templates
  for each row execute function public.set_updated_at();

alter table public.measurement_templates enable row level security;

create policy measurement_templates_tailor_all on public.measurement_templates
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));

-- =========================================================================
-- measurement_sets.template_id — which template the set was filled against
-- =========================================================================

alter table public.measurement_sets
  add column template_id uuid
  references public.measurement_templates(id) on delete set null;

create index measurement_sets_template_id_idx on public.measurement_sets(template_id);

-- =========================================================================
-- group_orders.owner_member_id — bride/groom/etc., one of the members
-- =========================================================================

alter table public.group_orders
  add column owner_member_id uuid
  references public.group_order_members(id) on delete set null;

create index group_orders_owner_member_id_idx on public.group_orders(owner_member_id);
