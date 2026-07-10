-- ============================================================================
-- share_links — short public codes for order & invoice links.
--
-- Replaces the long JWT that used to live in the URL with a short code stored
-- here. `kind` is 'order' | 'invoice'; `target_id` is the order/invoice id.
-- Rows are written by the API (service role); RLS is defensive (a tailor can
-- only see their own).
-- ============================================================================

create table public.share_links (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  kind        text not null check (kind in ('order', 'invoice')),
  target_id   uuid not null,
  tailor_id   uuid not null references public.tailors(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index share_links_code_idx on public.share_links(code);
create index share_links_tailor_idx on public.share_links(tailor_id);

alter table public.share_links enable row level security;

create policy share_links_tailor_all on public.share_links
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));
