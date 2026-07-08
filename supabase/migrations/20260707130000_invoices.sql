-- ============================================================================
-- invoices — turn an order into a client-ready, editable invoice.
--
-- One invoice per order (unique order_id). Line items are free-form and
-- categorised (garment / workmanship / fabric / extra / custom) so a tailor
-- can price each garment plus labour, fabric and extras (beads, stones…).
-- `total` is the denormalised subtotal (Σ qty·unitPrice), recomputed by the
-- API on every write for cheap list display; `deposit` is the amount already
-- paid, and balance-due is derived (total − deposit) at render time.
--
-- Delivered to the client as a magic-link web page (see the share-links flow),
-- reusing SHARE_LINK_JWT_SECRET. No payment-rail integration here — that stays
-- in the paused Phase 1.7.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('draft', 'sent');
  end if;
end $$;

create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  tailor_id   uuid not null references public.tailors(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  number      text not null,
  status      invoice_status not null default 'draft',
  currency    char(3),
  line_items  jsonb not null default '[]'::jsonb,
  deposit     numeric(12,2) not null default 0,
  notes       text,
  total       numeric(12,2) not null default 0,
  issued_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (order_id)
);

create index if not exists invoices_tailor_id_idx on public.invoices(tailor_id);
create index if not exists invoices_order_id_idx on public.invoices(order_id);
create index if not exists invoices_status_idx on public.invoices(status);

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;

drop policy if exists invoices_tailor_all on public.invoices;
create policy invoices_tailor_all on public.invoices
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));

comment on table public.invoices is
  'Client-ready invoices, one per order. line_items jsonb: [{id, category, description, quantity, unitPrice}]. total = denormalised subtotal; balance = total - deposit (derived).';
