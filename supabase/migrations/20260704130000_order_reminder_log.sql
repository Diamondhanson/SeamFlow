-- ============================================================================
-- order_reminder_log — de-dup ledger for order-due reminders.
--
-- One row per (order, bucket). The unique constraint guarantees each reminder
-- point fires at most once ("once per reminder point"). Buckets: 'lead_<n>'
-- (n days before due) and 'overdue'. Written by the server (service role); RLS
-- is defensive only.
-- ============================================================================

create table public.order_reminder_log (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references public.orders(id) on delete cascade,
  bucket    text not null,
  sent_at   timestamptz not null default now(),
  unique (order_id, bucket)
);

create index order_reminder_log_order_idx on public.order_reminder_log(order_id);

alter table public.order_reminder_log enable row level security;

create policy order_reminder_log_tailor_all on public.order_reminder_log
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
