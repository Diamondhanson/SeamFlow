-- Customer-authored measurements (client app).
--
-- Distinct from `measurement_sets` (a tailor's record for one of their clients):
-- these belong to a consumer user account, so the customer can build their own
-- locker and forward it to a tailor in chat. Kept in its own table so the
-- tailor-side schema, queries and RLS are untouched.

create table if not exists public.user_measurement_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null default 'default',
  values jsonb not null default '{}'::jsonb,
  unit_preference measurement_unit not null default 'cm',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_measurement_sets_user_id_idx
  on public.user_measurement_sets(user_id);

alter table public.user_measurement_sets enable row level security;

drop policy if exists "own user measurements" on public.user_measurement_sets;
create policy "own user measurements" on public.user_measurement_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
