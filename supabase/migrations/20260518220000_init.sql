-- SeamFlow Phase 0.3 — initial schema.
-- Mirrors @seamflow/schemas exactly. Zod schemas are the source of truth at the
-- application boundary; this file is the source of truth in the database.
-- Apply via `supabase db push`.

-- =========================================================================
-- Extensions
-- =========================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fuzzy search (Phase 1.10)

-- =========================================================================
-- Enums
-- =========================================================================

create type public.user_role           as enum ('tailor', 'tailor_staff', 'client', 'admin');
create type public.measurement_unit    as enum ('cm', 'in');
create type public.order_status        as enum ('registered', 'in_progress', 'testing', 'on_pause', 'delivered');
create type public.group_order_status  as enum ('planning', 'in_progress', 'completed', 'cancelled');
create type public.payment_status      as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.payment_provider    as enum ('stripe', 'paystack', 'flutterwave', 'razorpay');

-- =========================================================================
-- Shared helpers
-- =========================================================================

-- Touches updated_at on every row update. One function, many triggers.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- users — extends Supabase auth.users with app-level profile fields.
-- public.users.id is the same uuid as auth.users.id; one row per auth user.
-- =========================================================================

create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text,
  email       text,
  role        public.user_role not null default 'tailor',
  full_name   text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index users_role_idx on public.users(role);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Auto-create a public.users row when a new auth.users row is inserted.
-- Means signup → profile shell is ready immediately; the app fills full_name
-- in the profile setup screen (Phase 1.9).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone, email, full_name)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =========================================================================
-- tailors — a business profile owned by a user.
-- A user can own at most one tailor for now; enforced by unique on user_id.
-- =========================================================================

create table public.tailors (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  business_name  text not null,
  photo_url      text,
  location       text,
  country_code   char(2) not null,
  currency       char(3) not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id)
);

create trigger tailors_set_updated_at
  before update on public.tailors
  for each row execute function public.set_updated_at();

-- =========================================================================
-- clients — a tailor's customer.
-- =========================================================================

create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  tailor_id   uuid not null references public.tailors(id) on delete cascade,
  full_name   text not null,
  phone       text not null,
  email       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index clients_tailor_id_idx        on public.clients(tailor_id);
create index clients_full_name_trgm_idx   on public.clients using gin (full_name gin_trgm_ops);
create index clients_phone_trgm_idx       on public.clients using gin (phone     gin_trgm_ops);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- =========================================================================
-- measurement_sets — flexible per-client measurement collections.
-- `values` is jsonb keyed by anatomy field (chest, waist, ...), stored in cm.
-- unit_preference drives display only; storage is canonical.
-- =========================================================================

create table public.measurement_sets (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  label             text not null default 'default',
  values            jsonb not null default '{}'::jsonb,
  unit_preference   public.measurement_unit not null default 'cm',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index measurement_sets_client_id_idx on public.measurement_sets(client_id);

create trigger measurement_sets_set_updated_at
  before update on public.measurement_sets
  for each row execute function public.set_updated_at();

-- =========================================================================
-- fabrics — tailor's stock. Phase 2.3 fills this out; created here so
-- group_orders.shared_fabric_id can reference it from the start.
-- =========================================================================

create table public.fabrics (
  id              uuid primary key default gen_random_uuid(),
  tailor_id       uuid not null references public.tailors(id) on delete cascade,
  name            text not null,
  supplier        text,
  color           text,
  composition     text,
  yardage_meters  numeric(10,2),
  cost_per_meter  numeric(12,2),
  photo_key       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index fabrics_tailor_id_idx on public.fabrics(tailor_id);

create trigger fabrics_set_updated_at
  before update on public.fabrics
  for each row execute function public.set_updated_at();

-- =========================================================================
-- group_orders — bridal parties, family events, uniforms.
-- Holds the shared design + event-level fields. Individual outfits are
-- normal `orders` rows with group_order_id set.
-- =========================================================================

create table public.group_orders (
  id                   uuid primary key default gen_random_uuid(),
  tailor_id            uuid not null references public.tailors(id) on delete cascade,
  name                 text not null,
  description          text,
  shared_design_notes  text,
  shared_fabric_id     uuid references public.fabrics(id) on delete set null,
  event_date           timestamptz,
  date_delivery        timestamptz,
  status               public.group_order_status not null default 'planning',
  total_amount         numeric(12,2),
  currency             char(3),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index group_orders_tailor_id_idx on public.group_orders(tailor_id);
create index group_orders_status_idx    on public.group_orders(status);

create trigger group_orders_set_updated_at
  before update on public.group_orders
  for each row execute function public.set_updated_at();

-- =========================================================================
-- orders — the core unit of work. Solo by default; group_order_id links a
-- row into a parent group. All status/photo/payment machinery is the same
-- whether or not the order is part of a group.
-- =========================================================================

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  tailor_id       uuid not null references public.tailors(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete restrict,
  group_order_id  uuid references public.group_orders(id) on delete set null,
  order_name      text not null,
  date_ordered    timestamptz not null default now(),
  date_delivery   timestamptz,
  status          public.order_status not null default 'registered',
  notes           text,
  total_amount    numeric(12,2),
  currency        char(3),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index orders_tailor_id_idx       on public.orders(tailor_id);
create index orders_client_id_idx       on public.orders(client_id);
create index orders_group_order_id_idx  on public.orders(group_order_id);
create index orders_status_idx          on public.orders(status);
create index orders_date_delivery_idx   on public.orders(date_delivery);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- =========================================================================
-- order_items — per-garment line items within an order.
-- =========================================================================

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  garment_type  text not null,
  measurements  jsonb,
  notes         text,
  quantity      integer not null default 1 check (quantity > 0),
  unit_price    numeric(12,2)
);

create index order_items_order_id_idx on public.order_items(order_id);

-- =========================================================================
-- payments — deposit and balance payments per order.
-- =========================================================================

create table public.payments (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders(id) on delete cascade,
  amount                numeric(12,2) not null check (amount > 0),
  currency              char(3) not null,
  status                public.payment_status not null default 'pending',
  provider              public.payment_provider not null,
  provider_payment_id   text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index payments_order_id_idx              on public.payments(order_id);
create index payments_status_idx                on public.payments(status);
create index payments_provider_payment_id_idx   on public.payments(provider_payment_id);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- =========================================================================
-- order_events — append-only audit log of every status change and key event.
-- Drives the future timeline view and makes debugging cheap.
-- =========================================================================

create table public.order_events (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  actor_user_id   uuid references public.users(id) on delete set null,
  event_type      text not null,
  from_status     public.order_status,
  to_status       public.order_status,
  payload         jsonb,
  created_at      timestamptz not null default now()
);

create index order_events_order_id_idx    on public.order_events(order_id);
create index order_events_created_at_idx  on public.order_events(created_at desc);
