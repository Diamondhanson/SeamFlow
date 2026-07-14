-- ============================================================================
-- group_order_photos — shared reference/inspiration images for a group order
-- ("one pattern, many measurements"). Mirrors order_photos, keyed to a group
-- order. RLS is gated by the parent group order's tailor ownership. Images
-- live in the existing `order-photos` storage bucket under the path
-- <tailorId>/groups/<groupId>/...
-- ============================================================================

create table public.group_order_photos (
  id                  uuid primary key default gen_random_uuid(),
  group_order_id      uuid not null references public.group_orders(id) on delete cascade,
  storage_path        text not null,
  thumbnail_path      text,
  content_type        text,
  role                text not null default 'reference',
  caption             text,
  uploaded_by_user_id uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index group_order_photos_group_id_idx on public.group_order_photos(group_order_id);

alter table public.group_order_photos enable row level security;

create policy group_order_photos_tailor_all on public.group_order_photos
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
