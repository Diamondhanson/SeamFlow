-- ============================================================================
-- Group orders learn what garment they are for.
--
-- A group order previously recorded who was in it, when the event was, and
-- which fabric was shared — but never WHAT WAS BEING SEWN. That gap was not
-- cosmetic. `copy-measurements-from-client` had nothing to match a client's
-- saved sets against, so it took whichever set was newest: a tailor making
-- gowns for a wedding party could get a client's trouser measurements copied
-- in, under a green "Copied!" confirmation.
--
-- The shape is group default + per-member override:
--
--   group_orders.garment_type / template_id          the default for everyone
--   group_order_members.garment_type / template_id   NULL = inherit
--
-- NULL-means-inherit is what keeps this cheap in the app. Twelve bridesmaids
-- in matching aso-ebi are configured once on the group; only the odd one out
-- (the groomsmen in a mixed wedding party) carries an override.
--
-- All four columns are nullable with no default, so every existing group order
-- stays valid and simply reads as "no garment set yet".
-- ============================================================================

alter table public.group_orders
  add column if not exists garment_type text,
  add column if not exists template_id  uuid
    references public.measurement_templates (id) on delete set null;

alter table public.group_order_members
  add column if not exists garment_type text,
  add column if not exists template_id  uuid
    references public.measurement_templates (id) on delete set null;

-- Resolving a member's template walks member → group, so both sides of that
-- lookup are indexed. Partial: the overwhelming majority of members inherit,
-- and indexing eleven thousand NULLs to find the one override is wasted space.
create index if not exists group_orders_template_id_idx
  on public.group_orders (template_id)
  where template_id is not null;

create index if not exists group_order_members_template_id_idx
  on public.group_order_members (template_id)
  where template_id is not null;

comment on column public.group_orders.garment_type is
  'What is being sewn for this group. Members inherit unless they override.';
comment on column public.group_orders.template_id is
  'Measurement template every member is measured against by default.';
comment on column public.group_order_members.garment_type is
  'Per-member override. NULL means inherit from the group order.';
comment on column public.group_order_members.template_id is
  'Per-member override. NULL means inherit from the group order.';
