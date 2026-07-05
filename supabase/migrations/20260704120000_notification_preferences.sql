-- ============================================================================
-- notification_preferences — one row per tailor.
--
-- Controls order-due reminders (whether / how close to due / at what local
-- hour), the overdue reminder, and the existing status-change push. `language`
-- lets the server localize push copy. Rows are created lazily with defaults by
-- the API on first read.
-- ============================================================================

create table public.notification_preferences (
  tailor_id              uuid primary key references public.tailors(id) on delete cascade,
  due_reminders_enabled  boolean not null default true,
  lead_days              int[]   not null default '{3}',
  overdue_enabled        boolean not null default true,
  status_change_enabled  boolean not null default true,
  reminder_hour          int     not null default 8,
  timezone               text,
  language               text    not null default 'en',
  updated_at             timestamptz not null default now()
);

-- RLS: a tailor owns their own preferences row.
alter table public.notification_preferences enable row level security;

create policy notification_preferences_tailor_all on public.notification_preferences
  for all
  using (tailor_id in (select public.current_tailor_ids()))
  with check (tailor_id in (select public.current_tailor_ids()));
