# Notifications: order-due reminders + preferences — build plan

Status: proposed · Owner: —  · Last updated: 2026-07-04

## TL;DR

Push notifications **already work** end-to-end (Expo push, device tokens with RLS,
registration on launch, sign-out cleanup, a live status-change push, foreground
handler). What's missing is entirely the *reminder* layer: a scheduler, a
preferences table + API + Settings UI, localized message templates, de-dup
tracking, and a notification-tap deep link. This plan builds those.

## Decisions locked (from product review)

- **Lead time ("how close to due")** is user-configurable in Settings. **Default
  is a single "X days before"** (X = 3), but the tailor can select multiple
  reminder points (e.g. 7, 3, 1, and due-day).
- **Cadence** = **once per reminder point** (no daily nagging). De-dup guarantees
  each point fires at most once per order.
- **Overdue reminders** are a **preference toggle** (tailor chooses). Same for
  the existing status-change pushes.
- Proceeding via this plan doc before any code.

## Current state (verified)

Works today:
- `notifications.service.ts` sends via Expo push (batched, prunes dead tokens).
- `device_tokens` table + RLS; `/me/device-tokens` register/delete; `/me/push-test`.
- Mobile `lib/notifications.ts`: `ensurePushRegistered()`, foreground handler,
  sign-out unregister.
- Order **status change** already fires a push to the owner.

Missing (all greenfield):
- **No scheduler / cron / worker** anywhere. BullMQ is wired but dormant; the API
  is a single process; no `@nestjs/schedule`.
- **No notification preferences** (no table, API, or UI).
- **No reminder templates** and no server-side localization of push copy.
- **No de-dup** of repeated reminders.
- **No tap-to-open** handler (pushes already carry `orderId`, but nothing routes on tap).

## Data model

### `notification_preferences` (one row per tailor)

```
notification_preferences
  tailor_id            uuid pk → tailors(id) on delete cascade
  due_reminders_enabled boolean   not null default true
  lead_days            int[]      not null default '{3}'   -- reminder points, days before due
  overdue_enabled      boolean    not null default true
  status_change_enabled boolean   not null default true    -- toggles the existing status pushes
  reminder_hour        int        not null default 8        -- 0–23, local send hour
  timezone             text                                  -- IANA, e.g. 'Africa/Douala'; fallback from country
  language             text       not null default 'en'      -- so server can localize the push
  updated_at           timestamptz not null default now()
```

RLS: tailor owns their own row (`tailor_id in (select current_tailor_ids())`). A
row is lazily created with defaults on first GET if absent.

### `order_reminder_log` (de-dup)

```
order_reminder_log
  id         uuid pk
  order_id   uuid → orders(id) on delete cascade
  bucket     text        -- 'lead_3', 'lead_1', 'lead_0', 'overdue'
  sent_at    timestamptz not null default now()
  unique (order_id, bucket)
```

The `unique(order_id, bucket)` constraint is what enforces "once per reminder
point" — the sender inserts a log row and skips if it already exists.

## Scheduler

- Add **`@nestjs/schedule`**; run an **hourly cron** (`@Cron('0 * * * *')`) in-process.
- Each run, for every tailor whose **local time == `reminder_hour`** (computed
  from `timezone`), scan their open orders and send any due reminders. Running
  hourly (not daily) is how we honor each tailor's chosen local send-hour.

**Scan per tailor (when their local hour matches):**
1. Skip if `due_reminders_enabled` is false.
2. Load open orders (`status != 'delivered'`, `date_delivery` not null).
3. `d = daysUntil(date_delivery)` in the tailor's timezone.
4. For each `lead` in `lead_days`: if `d == lead` and no `order_reminder_log`
   row for `('lead_' + lead)` → send a localized "due in N days / due today"
   push and insert the log row.
5. If `overdue_enabled` and `d < 0` and no `overdue` log row → send a localized
   "overdue" push, insert log.
6. Localize every message with the tailor's `language`.

**Caveats to note in code:**
- In-process cron **double-fires if you run multiple API instances**. Fine for a
  single instance now; add a DB advisory lock or move to BullMQ repeatable jobs
  when scaling.
- The cron needs a **long-running process**. It won't fire on a serverless/
  sleep-on-idle host — the API must stay up (or use an external cron pinging an
  endpoint / BullMQ worker).

## Message templates (server-side, localized)

Push is sent from the server, so copy is localized there (not via the app's
`t()`). A small server-side map keyed by type + language:

| key | en | fr |
| --- | --- | --- |
| dueInDays | `{order} is due in {n} day(s)` | `{order} est à livrer dans {n} jour(s)` |
| dueToday | `{order} is due today` | `{order} est à livrer aujourd'hui` |
| overdue | `{order} is overdue` | `{order} est en retard` |

Title = order name; body = the message; `data = { type: 'order_due', orderId }`.

**Localization requires the tailor's language on the server** — hence the
`language` column. The app writes it to the preferences whenever the in-app
language changes (see mobile below).

## API

- `GET  /me/notification-preferences` → returns the row (creates defaults if none).
- `PATCH /me/notification-preferences` → partial update (all fields optional).
- Zod schemas in `packages/schemas` (`NotificationPreferences`, `…UpdateInput`),
  DTOs via `createZodDto`, resource in `packages/api-client`, hooks in the app.
- Validation: `lead_days` each 0–60; `reminder_hour` 0–23; `language` in the
  supported set.

## Mobile

**Settings → new "Notifications" section** (all strings via `t()`, guard-clean):
- Toggle **Order due reminders** (`due_reminders_enabled`).
- **Lead time** — default a single "Remind me `[3]` days before"; a set of
  day chips (due day / 1 / 2 / 3 / 7) that can be multi-selected to add points.
- Toggle **Overdue reminders** (`overdue_enabled`).
- Toggle **Order status updates** (`status_change_enabled`).
- **Reminder time** — hour picker (send around this local time).
- Language is synced automatically (below), not shown here.

**Language sync:** when the user changes the app language, also `PATCH
notification-preferences { language }` so server-sent pushes match. (Also set it
once after first load.)

**Tap-to-open:** add `Notifications.addNotificationResponseReceivedListener` →
`router.push('/(app)/orders/' + data.orderId)` for `order_due` / status pushes.

**Honor `status_change_enabled`:** the server checks the flag before firing the
existing status-change push.

## Milestones

**M1 — Preferences (no sending yet).**
- `notification_preferences` table + RLS migration.
- Schemas + API (GET/PATCH) + api-client + hooks.
- Settings "Notifications" UI (translated) + language sync.
- Ships visible, savable controls immediately; nothing sends yet.

**M2 — Scheduler + reminders.**
- `@nestjs/schedule`; hourly cron + scan algorithm.
- `order_reminder_log` table + de-dup.
- Localized templates; due-soon / due-today / overdue sending.
- Gate status-change push on `status_change_enabled`.

**M3 — Polish.**
- Tap-to-open deep link.
- Optional: quiet hours, per-order snooze, a "reminders paused" summary.

## New deps / ops

- `@nestjs/schedule` in `apps/seamflow-api`.
- Two Supabase migrations (`notification_preferences`, `order_reminder_log`).
- The API must run as a persistent process for the cron to fire.
- No native rebuild on mobile (expo-notifications already in the build).

## Open decisions before M2

1. **Timezone source** — store IANA `timezone` explicitly (asked on setup), or
   derive from `country_code` via a small map with a fixed fallback (e.g.
   `Africa/Douala`)? Affects when reminders land.
2. **Default reminder hour** — proposing **08:00** local.
3. **Overdue repeat** — proposing a **single** overdue reminder (once). If you
   want daily-until-delivered for overdue specifically, that's a small change to
   the `overdue` bucket logic.
4. **Reminder-time granularity** — a whole hour is simplest; do you want finer?
