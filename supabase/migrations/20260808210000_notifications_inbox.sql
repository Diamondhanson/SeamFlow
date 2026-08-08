-- ============================================================================
-- Notification inbox — a durable record both apps can come back to.
--
-- Push is best-effort by design: it fails silently, arrives while the phone is
-- off, or gets swiped away, and then it is gone forever. That is survivable for
-- a nudge aimed at a tailor who opens the app daily. It is not survivable for
-- "your dress is ready for pickup" sent to a client who installed the app once.
-- This table is the record; push becomes the doorbell, not the message.
--
-- WHAT BELONGS HERE — a discrete thing that HAPPENED, has consequence, and is
-- not already visible on a surface the user visits anyway.
--
-- What deliberately does NOT belong here:
--   · chat messages after the first — the conversation list is already their
--     inbox, and duplicating them is what turns a notification screen into 90%
--     stale rows the user has already read
--   · due / overdue reminders — that is a STATE, already rendered as a chip on
--     the orders list. Snapshotting it here would go stale the moment the order
--     ships, and we'd be maintaining two sources of truth for one fact
--   · typing, presence, read receipts — Realtime only, worthless a second later
--
-- Rule of thumb: store EVENTS, not STATES.
-- ============================================================================

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),

  -- Recipient. Deliberately users.id and not tailors.id: one inbox serves both
  -- apps, and the row shouldn't care which role the person is wearing.
  user_id     uuid not null references public.users(id) on delete cascade,

  -- Dotted event key, e.g. 'quote.received'. Renders client-side as
  -- t('notifications.' || type, params).
  type        text not null,

  -- Interpolation values — NOT rendered text.
  --
  -- Storing a rendered title/body would freeze the notification in whatever
  -- language the server happened to pick at write time, and this repo enforces
  -- EN/FR parity with a lint guard. It would also go stale: rename an order and
  -- every past notification still shows the old name.
  --
  -- Params carry a DISPLAY SNAPSHOT (the order name as it read then) while
  -- entity_id below is what navigation uses. That split means a deleted order
  -- still reads sensibly — the row just stops being tappable.
  params      jsonb not null default '{}',

  -- Deep-link target. Null for notifications with nowhere to go.
  entity_type text,
  entity_id   uuid,

  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- The list query: newest first for one user.
create index notifications_user_idx
  on public.notifications (user_id, created_at desc, id desc);

-- The badge query. Partial, because unread is a small slice of a table that
-- only grows — a full index here would be mostly dead weight.
create index notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

-- Read-only to the owner. Every write goes through the service role, so the
-- API is the only thing that can mint a notification — a client that could
-- INSERT here could forge "payment received".
create policy notifications_select_own on public.notifications
  for select using (auth.uid() = user_id);

-- Marking read is the one thing the owner may change. Restricted by a WITH
-- CHECK that pins user_id, so a row can't be reassigned to someone else.
create policy notifications_update_own on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.notifications is
  'Durable notification inbox for both apps. Events, not states. Push is the doorbell; this is the record.';

-- ── Per-user mute ───────────────────────────────────────────────────────────
-- SEPARATE from notification_preferences on purpose.
--
-- notification_preferences is keyed by tailor_id and holds reminder SCHEDULING
-- config — lead_days, reminder_hour, timezone. Those are meaningless to a
-- client, who has no orders to be reminded about. Widening that table to
-- user_id would have handed every client a pile of settings that do nothing.
--
-- This table is the role-neutral half: which event types you don't want.
create table public.notification_settings (
  user_id     uuid primary key references public.users(id) on delete cascade,

  -- Opt-OUT list of `type` values. An empty array means everything is on, so a
  -- new notification type is live for existing users without a backfill, and
  -- someone who muted 'order.ready' stays muted when new types ship.
  muted_types text[] not null default '{}',

  updated_at  timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

create policy notification_settings_own on public.notification_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.notification_settings is
  'Role-neutral per-user notification mutes. Reminder scheduling stays in notification_preferences (tailor-only).';
