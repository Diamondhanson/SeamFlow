// ============================================================================
// The Overview page.
//
// SeamFlow is a two-sided product, so the interesting question is never "how
// many rows" — it is whether the two sides are meeting. A count of tailors is
// vanity. "Nine tailors, zero published designs, zero enquiries" is the actual
// state of the business, and the funnel is the only layout that makes that
// impossible to miss.
//
// One query. See ./shared.ts for why.
// ============================================================================

import { sql } from '../db';
import { n, type Bucket } from './shared';

export interface MoneyRow {
  currency: string | null;
  invoices: number;
  billed: number;
  deposits: number;
  outstanding: number;
}

export interface Overview {
  counts: {
    tailors: number;
    clientAccounts: number;
    crmClients: number;
    orders: number;
    invoices: number;
    enquiries: number;
  };
  funnel: { key: string; label: string; value: number; note: string }[];
  money: MoneyRow[];
  statuses: Bucket[];
  signups: { tailors: Bucket[]; clients: Bucket[] };
  orders: Bucket[];
  activity: { kind: string; label: string; detail: string; at: string; href: string | null }[];
}

export async function getOverview(): Promise<Overview> {
  const [row] = await sql`
    select
      (select row_to_json(s) from (
        select
          (select count(*) from tailors)                                  as tailors,
          (select count(*) from users where role = 'client')              as client_accounts,
          (select count(*) from clients)                                  as crm_clients,
          (select count(*) from orders)                                   as orders,
          (select count(*) from invoices)                                 as invoices,
          (select count(*) from feed_posts where status = 'published')    as published,
          (select count(*) from conversations)                            as enquiries,
          (select count(*) from conversations where order_id is not null) as quoted,
          (select count(*) from order_claims)                             as claimed
      ) s) as scalars,

      -- Money, grouped by currency and NEVER summed across. Invoices are
      -- denominated per-invoice; a tailor may hold one in XAF and one in NGN,
      -- and there is no exchange-rate source in this system, so a grand total
      -- would be a confident lie.
      (select coalesce(json_agg(m), '[]'::json) from (
        select
          currency,
          count(*)::int                             as invoices,
          coalesce(sum(total), 0)::float8           as billed,
          coalesce(sum(deposit), 0)::float8         as deposits,
          coalesce(sum(total - deposit), 0)::float8 as outstanding
        from invoices group by currency order by count(*) desc
      ) m) as money,

      -- Ordered by the ENUM's own declared sequence (registered → delivered),
      -- NOT by count. The chart colours these rows from an ordinal ramp, and
      -- an ordinal colour has to follow the status, not its rank — sorted by
      -- count, a filter that changed the numbers would repaint every bar and
      -- "dark" would silently stop meaning "early in the pipeline".
      --
      -- The ::text is required regardless: the UNION further down cannot find
      -- a common type between an enum and a plain text column.
      (select coalesce(json_agg(x), '[]'::json) from (
        select status::text as key, status::text as label, count(*)::int as value
        from orders group by status order by status
      ) x) as statuses,

      (select coalesce(json_agg(x), '[]'::json) from (
        select to_char(m,'YYYY-MM') key, to_char(m,'Mon') label,
               (select count(*) from tailors t where date_trunc('month', t.created_at) = m)::int value
        from generate_series(date_trunc('month', now()) - interval '11 months',
                             date_trunc('month', now()), interval '1 month') m
      ) x) as tailor_signups,

      (select coalesce(json_agg(x), '[]'::json) from (
        select to_char(m,'YYYY-MM') key, to_char(m,'Mon') label,
               (select count(*) from users u
                  where u.role = 'client' and date_trunc('month', u.created_at) = m)::int value
        from generate_series(date_trunc('month', now()) - interval '11 months',
                             date_trunc('month', now()), interval '1 month') m
      ) x) as client_signups,

      (select coalesce(json_agg(x), '[]'::json) from (
        select to_char(m,'YYYY-MM') key, to_char(m,'Mon') label,
               (select count(*) from orders o where date_trunc('month', o.created_at) = m)::int value
        from generate_series(date_trunc('month', now()) - interval '11 months',
                             date_trunc('month', now()), interval '1 month') m
      ) x) as orders_monthly,

      -- One timeline across both apps, so "what just happened" does not
      -- require checking four screens.
      (select coalesce(json_agg(a), '[]'::json) from (
        (select 'tailor' as kind, business_name as label,
                coalesce(city, country_code) as detail, created_at as at,
                '/tailors/' || id as href from tailors)
        union all
        (select 'order', order_name, status::text, created_at, '/orders/' || id from orders)
        union all
        (select 'invoice', number, coalesce(currency,'no currency') || ' ' || total::text,
                created_at, '/invoices/' || id from invoices)
        union all
        (select 'client', coalesce(nullif(full_name,''), email, 'client account'),
                'signed up in the client app', created_at, null
         from users where role = 'client')
        order by at desc limit 12
      ) a) as activity
  `;

  const s = (row?.scalars ?? {}) as Record<string, unknown>;
  const buckets = (v: unknown): Bucket[] => (v ?? []) as Bucket[];

  return {
    counts: {
      tailors: n(s.tailors),
      clientAccounts: n(s.client_accounts),
      crmClients: n(s.crm_clients),
      orders: n(s.orders),
      invoices: n(s.invoices),
      enquiries: n(s.enquiries),
    },
    funnel: [
      { key: 'tailors', label: 'Tailors on the platform', value: n(s.tailors), note: 'supply side' },
      { key: 'published', label: 'Designs published to the feed', value: n(s.published), note: 'what a client can discover' },
      { key: 'enquiries', label: 'Enquiries opened', value: n(s.enquiries), note: 'a client started a conversation' },
      { key: 'quoted', label: 'Turned into a commission', value: n(s.quoted), note: 'the conversation has an order' },
      { key: 'claimed', label: 'Orders claimed in the client app', value: n(s.claimed), note: 'the client can track it' },
    ],
    money: (row?.money ?? []) as MoneyRow[],
    statuses: buckets(row?.statuses),
    signups: { tailors: buckets(row?.tailor_signups), clients: buckets(row?.client_signups) },
    orders: buckets(row?.orders_monthly),
    activity: (row?.activity ?? []) as Overview['activity'],
  };
}
