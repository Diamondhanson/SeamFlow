// ============================================================================
// Enquiries — conversations between a client account and a tailor.
//
// This is the demand side's only channel into the tailor app, so an empty
// table here is not a quiet page: it is the marketplace not running. The page
// says which of the two possible causes it is — nobody to talk to, or nothing
// to talk about — rather than rendering "no results" and leaving it there.
// ============================================================================

import { sql } from '../db';
import { n } from './shared';

export interface EnquiriesPage {
  counts: {
    conversations: number;
    withOrder: number;
    messages: number;
    unreadTailor: number;
    unreadClient: number;
    clientAccounts: number;
    published: number;
  };
  rows: {
    id: string;
    tailor: string;
    tailorId: string;
    client: string | null;
    origin: string;
    orderId: string | null;
    lastMessageAt: string | null;
    preview: string | null;
    messages: number;
    tailorUnread: number;
    clientUnread: number;
    createdAt: string;
  }[];
  byOrigin: { key: string; label: string; value: number }[];
}

export async function getEnquiries(): Promise<EnquiriesPage> {
  const [row] = await sql`
    select
      (select row_to_json(s) from (
        select
          (select count(*) from conversations)                            as conversations,
          (select count(*) from conversations where order_id is not null) as with_order,
          (select count(*) from messages)                                 as messages,
          (select coalesce(sum(tailor_unread),0) from conversations)      as unread_tailor,
          (select coalesce(sum(client_unread),0) from conversations)      as unread_client,
          (select count(*) from users where role = 'client')              as client_accounts,
          (select count(*) from feed_posts where status = 'published')    as published
      ) s) as scalars,

      (select coalesce(json_agg(r), '[]'::json) from (
        select
          v.id, t.business_name as tailor, t.id as tailor_id,
          coalesce(nullif(u.full_name,''), u.email) as client,
          v.origin::text as origin, v.order_id,
          v.last_message_at, v.last_message_preview as preview,
          v.tailor_unread, v.client_unread, v.created_at,
          (select count(*) from messages m where m.conversation_id = v.id)::int as messages
        from conversations v
          join tailors t on t.id = v.tailor_id
          left join users u on u.id = v.client_user_id
        order by coalesce(v.last_message_at, v.created_at) desc
        limit 60
      ) r) as rows,

      (select coalesce(json_agg(o), '[]'::json) from (
        select origin::text key, origin::text label, count(*)::int value
        from conversations group by origin order by count(*) desc
      ) o) as by_origin
  `;

  const s = (row?.scalars ?? {}) as Record<string, unknown>;

  return {
    counts: {
      conversations: n(s.conversations),
      withOrder: n(s.with_order),
      messages: n(s.messages),
      unreadTailor: n(s.unread_tailor),
      unreadClient: n(s.unread_client),
      clientAccounts: n(s.client_accounts),
      published: n(s.published),
    },
    rows: ((row?.rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      tailor: r.tailor as string,
      tailorId: r.tailor_id as string,
      client: (r.client as string) ?? null,
      origin: r.origin as string,
      orderId: (r.order_id as string) ?? null,
      lastMessageAt: (r.last_message_at as string) ?? null,
      preview: (r.preview as string) ?? null,
      messages: n(r.messages),
      tailorUnread: n(r.tailor_unread),
      clientUnread: n(r.client_unread),
      createdAt: r.created_at as string,
    })),
    byOrigin: (row?.by_origin ?? []) as EnquiriesPage['byOrigin'],
  };
}
