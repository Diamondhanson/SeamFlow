// ============================================================================
// Support inbox (plan step 2) — lists and counts, read straight from Postgres
// like every other page here. Opening a ticket, replying and changing its
// status go through the API instead (lib/support-actions), which signs the
// screenshots, keeps ticket state in one place and sends the user a push.
// ============================================================================

import { sql } from '../db';
import { like, n } from './shared';

export type InboxTab = 'open' | 'waiting_on_user' | 'resolved' | 'all';
export const INBOX_TABS: { key: InboxTab; label: string }[] = [
  { key: 'open', label: 'Needs reply' },
  { key: 'waiting_on_user', label: 'Waiting on user' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

export interface InboxRow {
  id: string;
  number: number;
  subject: string;
  status: string;
  category: string;
  side: string;
  preview: string | null;
  lastMessageAt: string;
  unread: number;
  createdAt: string;
  who: string;
  email: string | null;
  orderName: string | null;
}

export interface InboxPage {
  counts: Record<InboxTab, number>;
  rows: InboxRow[];
}

/** Sidebar badge: tickets waiting on US. */
export async function getSupportBadge(): Promise<number> {
  const [r] = await sql<{ c: string }[]>`select count(*) as c from support_tickets where status = 'open'`;
  return n(r?.c);
}

export async function getInbox(tab: InboxTab, q: string): Promise<InboxPage> {
  const term = q.trim();
  // "SF-1042", "sf1042" or "1042" all find ticket 1042.
  const num = /^(?:sf-?)?(\d{3,})$/i.exec(term)?.[1];

  const statusFilter = tab === 'all' ? sql`true` : sql`t.status = ${tab}`;
  const search = !term
    ? sql`true`
    : num
      ? sql`t.number = ${Number(num)}`
      : sql`(t.subject ilike ${like(term)} or u.email ilike ${like(term)} or u.full_name ilike ${like(term)}
             or tl.business_name ilike ${like(term)})`;

  const [rows, counts] = await Promise.all([
    sql<
      {
        id: string;
        number: number;
        subject: string;
        status: string;
        category: string;
        side: string;
        last_message_preview: string | null;
        last_message_at: Date;
        support_unread: number;
        created_at: Date;
        full_name: string | null;
        business_name: string | null;
        email: string | null;
        order_name: string | null;
      }[]
    >`
      select t.id, t.number, t.subject, t.status, t.category, t.side, t.last_message_preview,
             t.last_message_at, t.support_unread, t.created_at,
             u.full_name, u.email, tl.business_name, o.order_name
      from support_tickets t
      join users u on u.id = t.user_id
      left join tailors tl on tl.user_id = t.user_id
      left join orders o on o.id = t.order_id
      where ${statusFilter} and ${search}
      -- Needs-reply is a queue: oldest waiting first. Everything else: newest.
      order by ${tab === 'open' ? sql`t.last_message_at asc` : sql`t.last_message_at desc`}
      limit 200
    `,
    sql<{ status: string; c: string }[]>`
      select status, count(*) as c from support_tickets group by status
    `,
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, n(c.c)]));
  return {
    counts: {
      open: byStatus.open ?? 0,
      waiting_on_user: byStatus.waiting_on_user ?? 0,
      resolved: byStatus.resolved ?? 0,
      all: counts.reduce((a, c) => a + n(c.c), 0),
    },
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      subject: r.subject,
      status: r.status,
      category: r.category,
      side: r.side,
      preview: r.last_message_preview,
      lastMessageAt: r.last_message_at.toISOString(),
      unread: n(r.support_unread),
      createdAt: r.created_at.toISOString(),
      who: r.side === 'tailor' && r.business_name ? r.business_name : r.full_name || r.email || 'Unknown user',
      email: r.email,
      orderName: r.order_name,
    })),
  };
}

/** Other tickets from the same person — context for the one being read. */
export async function getOtherTickets(userId: string, exceptId: string) {
  return sql<{ id: string; number: number; subject: string; status: string; last_message_at: Date }[]>`
    select id, number, subject, status, last_message_at
    from support_tickets
    where user_id = ${userId} and id <> ${exceptId}
    order by last_message_at desc
    limit 10
  `;
}
