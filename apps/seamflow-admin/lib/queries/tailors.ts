// ============================================================================
// Tailors — the supply side. List and detail.
// ============================================================================

import { sql } from '../db';
import { like, n, PAGE_SIZE, type Bucket } from './shared';

export interface TailorRow {
  id: string;
  businessName: string;
  city: string | null;
  countryCode: string;
  currency: string;
  isVerified: boolean;
  createdAt: string;
  clients: number;
  orders: number;
  invoices: number;
  published: number;
  billed: number;
  lastOrderAt: string | null;
}

export interface TailorsPage {
  rows: TailorRow[];
  total: number;
  signups: Bucket[];
  countries: { value: string; label: string }[];
}

export type TailorSort = 'recent' | 'orders' | 'clients' | 'billed' | 'name';

export async function getTailors(opts: {
  q?: string;
  country?: string;
  sort?: TailorSort;
  page?: number;
}): Promise<TailorsPage> {
  const page = opts.page ?? 1;
  const q = opts.q?.trim() ?? '';
  const country = opts.country ?? '';

  const where = sql`
    (${!q} or t.business_name ilike ${q ? like(q) : ''} or coalesce(t.city,'') ilike ${q ? like(q) : ''})
    and (${!country} or t.country_code = ${country || null})
  `;

  // Sort is an allowlisted enum, never interpolated user text — the ORDER BY
  // clause is the one place a "just template it in" shortcut becomes an
  // injection.
  const order = {
    recent: sql`t.created_at desc`,
    name: sql`t.business_name asc`,
    orders: sql`orders desc, t.created_at desc`,
    clients: sql`clients desc, t.created_at desc`,
    billed: sql`billed desc, t.created_at desc`,
  }[opts.sort ?? 'recent'];

  const [row] = await sql`
    select
      (select count(*) from tailors t where ${where})::int as total,

      (select coalesce(json_agg(r), '[]'::json) from (
        select
          t.id, t.business_name, t.city, t.country_code, t.currency,
          t.is_verified, t.created_at,
          (select count(*) from clients  c where c.tailor_id = t.id)::int as clients,
          (select count(*) from orders   o where o.tailor_id = t.id)::int as orders,
          (select count(*) from invoices i where i.tailor_id = t.id)::int as invoices,
          (select count(*) from feed_posts f
             where f.tailor_id = t.id and f.status = 'published')::int    as published,
          -- Safe to sum: every invoice a tailor holds is in that tailor's own
          -- currency, so this total never crosses a currency boundary.
          (select coalesce(sum(i.total),0)::float8 from invoices i where i.tailor_id = t.id) as billed,
          (select max(o.created_at) from orders o where o.tailor_id = t.id) as last_order_at
        from tailors t
        where ${where}
        order by ${order}
        limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}
      ) r) as rows,

      (select coalesce(json_agg(x), '[]'::json) from (
        select to_char(m,'YYYY-MM') key, to_char(m,'Mon') label,
               (select count(*) from tailors t where date_trunc('month', t.created_at) = m)::int value
        from generate_series(date_trunc('month', now()) - interval '11 months',
                             date_trunc('month', now()), interval '1 month') m
      ) x) as signups,

      (select coalesce(json_agg(c), '[]'::json) from (
        select country_code as value, country_code || ' · ' || count(*) as label
        from tailors group by country_code order by count(*) desc
      ) c) as countries
  `;

  return {
    total: n(row?.total),
    rows: ((row?.rows ?? []) as Record<string, unknown>[]).map(mapTailor),
    signups: (row?.signups ?? []) as Bucket[],
    countries: (row?.countries ?? []) as { value: string; label: string }[],
  };
}

function mapTailor(t: Record<string, unknown>): TailorRow {
  return {
    id: t.id as string,
    businessName: t.business_name as string,
    city: (t.city as string) ?? null,
    countryCode: t.country_code as string,
    currency: t.currency as string,
    isVerified: Boolean(t.is_verified),
    createdAt: t.created_at as string,
    clients: n(t.clients),
    orders: n(t.orders),
    invoices: n(t.invoices),
    published: n(t.published),
    billed: n(t.billed),
    lastOrderAt: (t.last_order_at as string) ?? null,
  };
}

// ---------------------------------------------------------------------------

export interface TailorDetail {
  tailor: {
    id: string;
    businessName: string;
    bio: string | null;
    city: string | null;
    location: string | null;
    countryCode: string;
    currency: string;
    isVerified: boolean;
    acceptsRemote: boolean;
    followerCount: number;
    specialties: string[];
    languages: string[];
    createdAt: string;
    email: string | null;
    phone: string | null;
    fullName: string | null;
  };
  stats: {
    clients: number;
    orders: number;
    invoices: number;
    billed: number;
    outstanding: number;
    works: number;
    published: number;
    templates: number;
    fabrics: number;
    designs: number;
  };
  ordersMonthly: Bucket[];
  statuses: Bucket[];
  orders: { id: string; name: string; status: string; client: string | null; delivery: string | null; createdAt: string }[];
  invoices: { id: string; number: string; status: string; currency: string | null; total: number; deposit: number; issuedAt: string | null }[];
  clients: { id: string; fullName: string; phone: string | null; email: string | null; orders: number; createdAt: string }[];
}

export async function getTailor(id: string): Promise<TailorDetail | null> {
  const [row] = await sql`
    select
      (select row_to_json(t) from (
        select tl.*, u.email, u.phone, u.full_name
        from tailors tl left join users u on u.id = tl.user_id
        where tl.id = ${id}
      ) t) as tailor,

      (select row_to_json(s) from (
        select
          (select count(*) from clients c where c.tailor_id = ${id})::int  as clients,
          (select count(*) from orders o where o.tailor_id = ${id})::int   as orders,
          (select count(*) from invoices i where i.tailor_id = ${id})::int as invoices,
          (select coalesce(sum(i.total),0)::float8 from invoices i where i.tailor_id = ${id}) as billed,
          (select coalesce(sum(i.total - i.deposit),0)::float8 from invoices i where i.tailor_id = ${id}) as outstanding,
          (select count(*) from tailor_works w where w.tailor_id = ${id})::int as works,
          (select count(*) from feed_posts f where f.tailor_id = ${id} and f.status='published')::int as published,
          (select count(*) from measurement_templates m where m.tailor_id = ${id})::int as templates,
          (select count(*) from fabrics f where f.tailor_id = ${id})::int  as fabrics,
          (select count(*) from designs d where d.tailor_id = ${id})::int  as designs
      ) s) as stats,

      (select coalesce(json_agg(x), '[]'::json) from (
        select to_char(m,'YYYY-MM') key, to_char(m,'Mon') label,
               (select count(*) from orders o
                  where o.tailor_id = ${id} and date_trunc('month', o.created_at) = m)::int value
        from generate_series(date_trunc('month', now()) - interval '11 months',
                             date_trunc('month', now()), interval '1 month') m
      ) x) as orders_monthly,

      (select coalesce(json_agg(x), '[]'::json) from (
        -- Enum order, not count order: the ordinal colour ramp has to mean
        -- "where in the pipeline", the same on every tailor's page.
        select status::text key, status::text label, count(*)::int value
        from orders where tailor_id = ${id} group by status order by status
      ) x) as statuses,

      (select coalesce(json_agg(o), '[]'::json) from (
        select o.id, o.order_name as name, o.status::text as status,
               c.full_name as client, o.date_delivery as delivery, o.created_at
        from orders o left join clients c on c.id = o.client_id
        where o.tailor_id = ${id} order by o.created_at desc limit 25
      ) o) as orders,

      (select coalesce(json_agg(i), '[]'::json) from (
        select id, number, status::text as status, currency,
               total::float8 as total, deposit::float8 as deposit, issued_at
        from invoices where tailor_id = ${id} order by created_at desc limit 25
      ) i) as invoices,

      (select coalesce(json_agg(c), '[]'::json) from (
        select c.id, c.full_name, c.phone, c.email, c.created_at,
               (select count(*) from orders o where o.client_id = c.id)::int as orders
        from clients c where c.tailor_id = ${id} order by c.created_at desc limit 25
      ) c) as clients
  `;

  if (!row?.tailor) return null;
  const t = row.tailor as Record<string, unknown>;

  return {
    tailor: {
      id: t.id as string,
      businessName: t.business_name as string,
      bio: (t.bio as string) ?? null,
      city: (t.city as string) ?? null,
      location: (t.location as string) ?? null,
      countryCode: t.country_code as string,
      currency: t.currency as string,
      isVerified: Boolean(t.is_verified),
      acceptsRemote: Boolean(t.accepts_remote),
      followerCount: n(t.follower_count),
      specialties: (t.specialties as string[]) ?? [],
      languages: (t.languages as string[]) ?? [],
      createdAt: t.created_at as string,
      email: (t.email as string) ?? null,
      phone: (t.phone as string) ?? null,
      fullName: (t.full_name as string) ?? null,
    },
    stats: row.stats as TailorDetail['stats'],
    ordersMonthly: (row.orders_monthly ?? []) as Bucket[],
    statuses: (row.statuses ?? []) as Bucket[],
    orders: ((row.orders ?? []) as Record<string, unknown>[]).map((o) => ({
      id: o.id as string,
      name: o.name as string,
      status: o.status as string,
      client: (o.client as string) ?? null,
      delivery: (o.delivery as string) ?? null,
      createdAt: o.created_at as string,
    })),
    invoices: ((row.invoices ?? []) as Record<string, unknown>[]).map((i) => ({
      id: i.id as string,
      number: i.number as string,
      status: i.status as string,
      currency: (i.currency as string) ?? null,
      total: n(i.total),
      deposit: n(i.deposit),
      issuedAt: (i.issued_at as string) ?? null,
    })),
    clients: ((row.clients ?? []) as Record<string, unknown>[]).map((c) => ({
      id: c.id as string,
      fullName: c.full_name as string,
      phone: (c.phone as string) ?? null,
      email: (c.email as string) ?? null,
      orders: n(c.orders),
      createdAt: c.created_at as string,
    })),
  };
}
