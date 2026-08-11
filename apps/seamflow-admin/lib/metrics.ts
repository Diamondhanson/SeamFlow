// ============================================================================
// Every figure on the dashboard, fetched in ONE round trip.
//
// SeamFlow is a two-sided product and the interesting question is never "how
// many rows" — it is whether the two sides are meeting. So the shape is:
//
//   SUPPLY   what tailors have put in (accounts, published work)
//   DEMAND   what clients have done with it (accounts, enquiries, claims)
//   BRIDGE   the funnel between them, where the drop-off is visible
//
// A count of tailors is vanity. "Nine tailors, zero published designs, zero
// enquiries" is the actual state of the business, and the funnel is the only
// layout that makes that impossible to miss.
//
// WHY ONE QUERY. The database is a Supabase pooler in eu-west-1; opening a
// connection from here costs ~7.7s and individual queries then take 1–5s.
// Seven parallel queries over a 3-connection pool made the page take 40–60
// seconds, nearly all of it handshakes and latency rather than work. Postgres
// can assemble the whole payload as JSON in a single statement, so it does.
//
// One hard rule, inherited from the invoice work: MONEY IS NEVER SUMMED ACROSS
// CURRENCIES. Invoices are denominated per-invoice and a tailor may hold one in
// XAF and one in EUR; adding them produces a number that means nothing.
// ============================================================================

import { sql } from './db';

export interface Counts {
  tailors: number;
  clientAccounts: number;
  crmClients: number;
  orders: number;
  invoices: number;
  notifications: number;
}

export interface FunnelStep {
  label: string;
  value: number;
  note: string;
}

export interface MoneyRow {
  currency: string | null;
  invoices: number;
  billed: number;
  deposits: number;
  outstanding: number;
}

export interface StatusRow {
  status: string;
  count: number;
}

export interface TailorRow {
  id: string;
  businessName: string;
  city: string | null;
  countryCode: string;
  currency: string;
  createdAt: string;
  clients: number;
  orders: number;
  invoices: number;
  published: number;
  lastOrderAt: string | null;
}

export interface ActivityRow {
  kind: string;
  label: string;
  detail: string;
  at: string;
}

export interface HealthCheck {
  label: string;
  count: number;
  detail: string;
  severity: 'ok' | 'warn';
}

export interface Dashboard {
  counts: Counts;
  funnel: FunnelStep[];
  money: MoneyRow[];
  statuses: StatusRow[];
  tailors: TailorRow[];
  activity: ActivityRow[];
  health: HealthCheck[];
}

const n = (v: unknown): number => Number(v ?? 0);

export async function getDashboard(): Promise<Dashboard> {
  const [row] = await sql`
    select
      -- Scalars: headline counts, funnel steps and health checks together.
      (select row_to_json(s) from (
        select
          (select count(*) from tailors)                                    as tailors,
          (select count(*) from users where role = 'client')                as client_accounts,
          (select count(*) from clients)                                    as crm_clients,
          (select count(*) from orders)                                     as orders,
          (select count(*) from invoices)                                   as invoices,
          (select count(*) from notifications)                              as notifications,
          (select count(*) from feed_posts where status = 'published')      as published,
          (select count(*) from conversations)                              as enquiries,
          (select count(*) from conversations where order_id is not null)   as quoted,
          (select count(*) from order_claims)                               as claimed,
          (select count(*) from (
             select tailor_id, phone from clients
             group by tailor_id, phone having count(*) > 1
           ) d)                                                             as dupe_clients,
          (select count(*) from clients where phone = '—' or address = '—') as placeholder_clients,
          (select count(*) from users
             where role = 'client' and coalesce(full_name,'') = '')         as clients_no_name,
          (select count(*) from invoices where currency is null)            as invoices_no_currency,
          (select count(*) from invoices where total = 0)                   as invoices_zero,
          (select count(*) from orders where date_delivery is null)         as orders_no_due_date,
          (select count(*) from orders o
             where not exists (select 1 from order_claims c where c.order_id = o.id))
                                                                            as unclaimed_orders
      ) s) as scalars,

      -- Money, grouped by currency. Never summed across.
      (select coalesce(json_agg(m), '[]'::json) from (
        select
          currency,
          count(*)::int                             as invoices,
          coalesce(sum(total), 0)::float8           as billed,
          coalesce(sum(deposit), 0)::float8         as deposits,
          coalesce(sum(total - deposit), 0)::float8 as outstanding
        from invoices group by currency order by count(*) desc
      ) m) as money,

      (select coalesce(json_agg(x), '[]'::json) from (
        select status::text as status, count(*)::int as count
        from orders group by status order by count(*) desc
      ) x) as statuses,

      (select coalesce(json_agg(t), '[]'::json) from (
        select
          tl.id, tl.business_name, tl.city, tl.country_code, tl.currency, tl.created_at,
          (select count(*) from clients   c where c.tailor_id = tl.id)::int as clients,
          (select count(*) from orders    o where o.tailor_id = tl.id)::int as orders,
          (select count(*) from invoices  i where i.tailor_id = tl.id)::int as invoices,
          (select count(*) from feed_posts f
             where f.tailor_id = tl.id and f.status = 'published')::int     as published,
          (select max(o.created_at) from orders o where o.tailor_id = tl.id) as last_order_at
        from tailors tl order by tl.created_at desc
      ) t) as tailors,

      -- Merged timeline across both apps. The status column is an ENUM, so it
      -- needs an explicit ::text: Postgres will not find a common type for an
      -- enum and text in a UNION on its own.
      (select coalesce(json_agg(a), '[]'::json) from (
        (select 'tailor'  as kind, business_name as label,
                coalesce(city, country_code) as detail, created_at as at from tailors)
        union all
        (select 'order',   order_name, status::text, created_at from orders)
        union all
        (select 'invoice', number,
                coalesce(currency,'—') || ' ' || total::text, created_at from invoices)
        union all
        (select 'client',  coalesce(nullif(full_name,''), email, 'client'),
                'client account', created_at from users where role = 'client')
        order by at desc limit 18
      ) a) as activity
  `;

  const s = (row?.scalars ?? {}) as Record<string, unknown>;

  const mk = (label: string, count: number, detail: string): HealthCheck => ({
    label,
    count,
    detail,
    severity: count === 0 ? 'ok' : 'warn',
  });

  /**
   * Context, not a defect. Flagging a row for review while its own description
   * says the state is expected just teaches you to ignore the column.
   */
  const info = (label: string, count: number, detail: string): HealthCheck => ({
    label,
    count,
    detail,
    severity: 'ok',
  });

  return {
    counts: {
      tailors: n(s.tailors),
      clientAccounts: n(s.client_accounts),
      crmClients: n(s.crm_clients),
      orders: n(s.orders),
      invoices: n(s.invoices),
      notifications: n(s.notifications),
    },
    funnel: [
      { label: 'Tailors on the platform', value: n(s.tailors), note: 'supply side' },
      { label: 'Designs published to the feed', value: n(s.published), note: 'what clients can discover' },
      { label: 'Enquiries opened', value: n(s.enquiries), note: 'a client started a conversation' },
      { label: 'Turned into a commission', value: n(s.quoted), note: 'conversation has an order' },
      { label: 'Orders claimed in the client app', value: n(s.claimed), note: 'client can track it' },
    ],
    money: (row?.money ?? []) as MoneyRow[],
    statuses: (row?.statuses ?? []) as StatusRow[],
    tailors: ((row?.tailors ?? []) as Record<string, unknown>[]).map((t) => ({
      id: t.id as string,
      businessName: t.business_name as string,
      city: (t.city as string) ?? null,
      countryCode: t.country_code as string,
      currency: t.currency as string,
      createdAt: t.created_at as string,
      clients: n(t.clients),
      orders: n(t.orders),
      invoices: n(t.invoices),
      published: n(t.published),
      lastOrderAt: (t.last_order_at as string) ?? null,
    })),
    activity: (row?.activity ?? []) as ActivityRow[],
    health: [
      mk('Duplicate clients', n(s.dupe_clients),
         'Same phone twice for one tailor — the enquiry→order path creates a new CRM row each time.'),
      mk('Placeholder contact details', n(s.placeholder_clients),
         "Phone or address saved as '—' because it was unknown at enquiry time."),
      mk('Client accounts with no name', n(s.clients_no_name),
         "Shows in the tailor's inbox as a raw email address."),
      mk('Invoices with no currency', n(s.invoices_no_currency),
         'Amounts render unformatted and cannot be grouped.'),
      mk('Invoices totalling zero', n(s.invoices_zero),
         'Draft, or line items were never priced.'),
      mk('Orders with no delivery date', n(s.orders_no_due_date),
         'Excluded from reminders and from "due soon".'),
      info('Orders not claimed by any client', n(s.unclaimed_orders),
         'Expected for walk-ins — only quoted orders auto-claim. Shown for context.'),
    ],
  };
}
