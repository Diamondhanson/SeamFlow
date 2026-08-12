// ============================================================================
// Notifications — what the system sent, and whether it could have been
// delivered at all.
//
// Two separate questions, deliberately on one page, because answering either
// alone is misleading:
//
//   IN-APP    a row in `notifications` always lands — it is a database write
//             the inbox reads back, so it cannot fail
//   PUSH      requires a device token, which requires a native build with
//             working credentials
//
// A tailor with no device token still sees every notification in the app and
// receives nothing on their phone. Counting only sent notifications would hide
// that completely, so the delivery table below is the more important half.
// ============================================================================

import { sql } from '../db';
import { n } from './shared';

export interface NotificationsPage {
  counts: { total: number; unread: number; recipients: number; devices: number; muted: number };
  byType: { key: string; label: string; value: number }[];
  monthly: { key: string; label: string; value: number }[];
  recent: {
    id: string;
    type: string;
    recipient: string;
    role: string;
    entityType: string | null;
    read: boolean;
    createdAt: string;
    params: Record<string, unknown>;
  }[];
  delivery: {
    id: string;
    name: string;
    role: string;
    devices: number;
    platforms: string | null;
    notifications: number;
    unread: number;
    lastSeen: string | null;
  }[];
  prefs: {
    tailorId: string;
    tailor: string;
    dueReminders: boolean;
    overdue: boolean;
    statusChange: boolean;
    leadDays: number[];
    hour: number;
    timezone: string;
    language: string;
  }[];
}

export async function getNotifications(): Promise<NotificationsPage> {
  const [row] = await sql`
    select
      (select row_to_json(s) from (
        select
          (select count(*) from notifications)                          as total,
          (select count(*) from notifications where read_at is null)    as unread,
          (select count(distinct user_id) from notifications)           as recipients,
          (select count(*) from device_tokens)                          as devices,
          (select count(*) from notification_settings
             where array_length(muted_types, 1) > 0)                    as muted
      ) s) as scalars,

      (select coalesce(json_agg(t), '[]'::json) from (
        select type key, type label, count(*)::int value
        from notifications group by type order by count(*) desc
      ) t) as by_type,

      (select coalesce(json_agg(x), '[]'::json) from (
        select to_char(m,'YYYY-MM') key, to_char(m,'Mon') label,
               (select count(*) from notifications x
                  where date_trunc('month', x.created_at) = m)::int value
        from generate_series(date_trunc('month', now()) - interval '11 months',
                             date_trunc('month', now()), interval '1 month') m
      ) x) as monthly,

      (select coalesce(json_agg(r), '[]'::json) from (
        select nf.id, nf.type, nf.entity_type, nf.created_at,
               nf.read_at is not null as read, coalesce(nf.params,'{}'::jsonb) as params,
               coalesce(nullif(u.full_name,''), u.email, u.phone, 'unknown') as recipient,
               u.role::text as role
        from notifications nf left join users u on u.id = nf.user_id
        order by nf.created_at desc limit 40
      ) r) as recent,

      -- Every account that could receive something, with how many devices it
      -- has registered. Zero devices is the interesting row.
      (select coalesce(json_agg(d), '[]'::json) from (
        select
          u.id, coalesce(nullif(u.full_name,''), u.email, u.phone, 'unknown') as name,
          u.role::text as role,
          (select count(*) from device_tokens dt where dt.user_id = u.id)::int as devices,
          (select string_agg(distinct dt.platform, ', ') from device_tokens dt where dt.user_id = u.id) as platforms,
          (select count(*) from notifications nf where nf.user_id = u.id)::int as notifications,
          (select count(*) from notifications nf where nf.user_id = u.id and nf.read_at is null)::int as unread,
          (select max(dt.last_seen_at) from device_tokens dt where dt.user_id = u.id) as last_seen
        from users u
        order by (select count(*) from device_tokens dt where dt.user_id = u.id) desc, u.created_at desc
      ) d) as delivery,

      (select coalesce(json_agg(p), '[]'::json) from (
        select p.tailor_id, t.business_name as tailor,
               p.due_reminders_enabled as due_reminders, p.overdue_enabled as overdue,
               p.status_change_enabled as status_change, p.lead_days, p.reminder_hour as hour,
               p.timezone, p.language
        from notification_preferences p join tailors t on t.id = p.tailor_id
        order by t.business_name
      ) p) as prefs
  `;

  const s = (row?.scalars ?? {}) as Record<string, unknown>;

  return {
    counts: {
      total: n(s.total),
      unread: n(s.unread),
      recipients: n(s.recipients),
      devices: n(s.devices),
      muted: n(s.muted),
    },
    byType: (row?.by_type ?? []) as NotificationsPage['byType'],
    monthly: (row?.monthly ?? []) as NotificationsPage['monthly'],
    recent: ((row?.recent ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      type: r.type as string,
      recipient: r.recipient as string,
      role: (r.role as string) ?? '—',
      entityType: (r.entity_type as string) ?? null,
      read: Boolean(r.read),
      createdAt: r.created_at as string,
      params: (r.params as Record<string, unknown>) ?? {},
    })),
    delivery: ((row?.delivery ?? []) as Record<string, unknown>[]).map((d) => ({
      id: d.id as string,
      name: d.name as string,
      role: d.role as string,
      devices: n(d.devices),
      platforms: (d.platforms as string) ?? null,
      notifications: n(d.notifications),
      unread: n(d.unread),
      lastSeen: (d.last_seen as string) ?? null,
    })),
    prefs: ((row?.prefs ?? []) as Record<string, unknown>[]).map((p) => ({
      tailorId: p.tailor_id as string,
      tailor: p.tailor as string,
      dueReminders: Boolean(p.due_reminders),
      overdue: Boolean(p.overdue),
      statusChange: Boolean(p.status_change),
      leadDays: (p.lead_days as number[]) ?? [],
      hour: n(p.hour),
      timezone: (p.timezone as string) ?? 'UTC',
      language: (p.language as string) ?? 'en',
    })),
  };
}
