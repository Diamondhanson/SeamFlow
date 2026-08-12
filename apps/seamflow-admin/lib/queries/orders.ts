// ============================================================================
// Orders — list with filters, and detail.
// ============================================================================

import { sql } from '../db';
import { like, n, PAGE_SIZE, type Bucket } from './shared';

export interface OrderRow {
  id: string;
  name: string;
  status: string;
  tailorId: string;
  tailor: string;
  client: string | null;
  clientId: string | null;
  dateDelivery: string | null;
  createdAt: string;
  items: number;
  photos: number;
  claimed: boolean;
  invoiceId: string | null;
  invoiceNumber: string | null;
}

export interface OrdersPage {
  rows: OrderRow[];
  total: number;
  monthly: Bucket[];
  statuses: Bucket[];
  tailors: { value: string; label: string }[];
}

export async function getOrders(opts: {
  q?: string;
  status?: string;
  tailor?: string;
  range?: number | null;
  page?: number;
}): Promise<OrdersPage> {
  const page = opts.page ?? 1;
  const q = opts.q?.trim() ?? '';
  const status = opts.status ?? '';
  const tailor = opts.tailor ?? '';
  const days = opts.range ?? null;

  // status is an enum: comparing it to a text parameter needs the cast on the
  // COLUMN, not the parameter, or Postgres refuses with "operator does not
  // exist: order_status = text".
  const where = sql`
    (${!q} or o.order_name ilike ${q ? like(q) : ''})
    and (${!status} or o.status::text = ${status || null})
    and (${!tailor} or o.tailor_id = ${tailor || null}::uuid)
    and (${days === null} or o.created_at >= now() - make_interval(days => ${days ?? 0}))
  `;

  const [row] = await sql`
    select
      (select count(*) from orders o where ${where})::int as total,

      (select coalesce(json_agg(r), '[]'::json) from (
        select
          o.id, o.order_name as name, o.status::text as status,
          o.tailor_id, t.business_name as tailor,
          c.full_name as client, o.client_id,
          o.date_delivery, o.created_at,
          (select count(*) from order_items  x where x.order_id = o.id)::int as items,
          (select count(*) from order_photos p where p.order_id = o.id)::int as photos,
          exists (select 1 from order_claims k where k.order_id = o.id)      as claimed,
          (select i.id     from invoices i where i.order_id = o.id limit 1)  as invoice_id,
          (select i.number from invoices i where i.order_id = o.id limit 1)  as invoice_number
        from orders o
          join tailors t on t.id = o.tailor_id
          left join clients c on c.id = o.client_id
        where ${where}
        order by o.created_at desc
        limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}
      ) r) as rows,

      (select coalesce(json_agg(x), '[]'::json) from (
        select to_char(m,'YYYY-MM') key, to_char(m,'Mon') label,
               (select count(*) from orders o
                  where date_trunc('month', o.created_at) = m and ${where})::int value
        from generate_series(date_trunc('month', now()) - interval '11 months',
                             date_trunc('month', now()), interval '1 month') m
      ) x) as monthly,

      -- Status distribution over the FILTERED set, so it answers "of what I am
      -- looking at" rather than "of everything", which would silently
      -- contradict the table beside it.
      --
      -- Ordered by the enum's declared sequence, never by count: these rows are
      -- coloured from an ordinal ramp, and since the set here is filtered, a
      -- count-based sort would reorder and repaint the bars every time you
      -- touched a filter. Colour follows the status, not its rank.
      (select coalesce(json_agg(x), '[]'::json) from (
        select o.status::text key, o.status::text label, count(*)::int value
        from orders o where ${where} group by o.status order by o.status
      ) x) as statuses,

      (select coalesce(json_agg(t), '[]'::json) from (
        select t.id as value, t.business_name as label
        from tailors t where exists (select 1 from orders o where o.tailor_id = t.id)
        order by t.business_name
      ) t) as tailors
  `;

  return {
    total: n(row?.total),
    rows: ((row?.rows ?? []) as Record<string, unknown>[]).map((o) => ({
      id: o.id as string,
      name: o.name as string,
      status: o.status as string,
      tailorId: o.tailor_id as string,
      tailor: o.tailor as string,
      client: (o.client as string) ?? null,
      clientId: (o.client_id as string) ?? null,
      dateDelivery: (o.date_delivery as string) ?? null,
      createdAt: o.created_at as string,
      items: n(o.items),
      photos: n(o.photos),
      claimed: Boolean(o.claimed),
      invoiceId: (o.invoice_id as string) ?? null,
      invoiceNumber: (o.invoice_number as string) ?? null,
    })),
    monthly: (row?.monthly ?? []) as Bucket[],
    statuses: (row?.statuses ?? []) as Bucket[],
    tailors: (row?.tailors ?? []) as { value: string; label: string }[],
  };
}

// ---------------------------------------------------------------------------

export interface OrderDetail {
  order: {
    id: string;
    name: string;
    status: string;
    notes: string | null;
    dateOrdered: string | null;
    dateDelivery: string | null;
    createdAt: string;
    updatedAt: string;
    tailorId: string;
    tailor: string;
    currency: string;
    clientId: string | null;
    client: string | null;
    clientPhone: string | null;
    fabric: string | null;
    yardage: number | null;
    claimedBy: string | null;
  };
  items: { id: string; garmentType: string; quantity: number; unitPrice: number | null; notes: string | null; measurements: Record<string, unknown> }[];
  photos: { id: string; role: string | null; caption: string | null; createdAt: string; published: boolean }[];
  events: { id: string; eventType: string; fromStatus: string | null; toStatus: string | null; createdAt: string; actor: string | null }[];
  invoice: { id: string; number: string; status: string; currency: string | null; total: number; deposit: number } | null;
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
  const [row] = await sql`
    select
      (select row_to_json(o) from (
        select
          o.id, o.order_name as name, o.status::text as status, o.notes,
          o.date_ordered, o.date_delivery, o.created_at, o.updated_at,
          o.tailor_id, t.business_name as tailor,
          -- Orders carry no currency of their own any more (pricing lives on
          -- the invoice), so fall back to the tailor's.
          coalesce(o.currency, t.currency) as currency,
          o.client_id, c.full_name as client, c.phone as client_phone,
          f.name as fabric, o.fabric_yardage_used::float8 as yardage,
          (select coalesce(nullif(u.full_name,''), u.email)
             from order_claims k join users u on u.id = k.user_id
             where k.order_id = o.id limit 1) as claimed_by
        from orders o
          join tailors t on t.id = o.tailor_id
          left join clients c on c.id = o.client_id
          left join fabrics f on f.id = o.fabric_id
        where o.id = ${id}
      ) o) as "order",

      (select coalesce(json_agg(i), '[]'::json) from (
        select id, garment_type, quantity, unit_price::float8 as unit_price, notes,
               coalesce(measurements, '{}'::jsonb) as measurements
        from order_items where order_id = ${id}
      ) i) as items,

      (select coalesce(json_agg(p), '[]'::json) from (
        select p.id, p.role, p.caption, p.created_at,
               exists (select 1 from feed_posts f
                         where f.order_photo_id = p.id and f.status = 'published') as published
        from order_photos p where p.order_id = ${id} order by p.created_at
      ) p) as photos,

      (select coalesce(json_agg(e), '[]'::json) from (
        select e.id, e.event_type, e.from_status::text, e.to_status::text, e.created_at,
               coalesce(nullif(u.full_name,''), u.email) as actor
        from order_events e left join users u on u.id = e.actor_user_id
        where e.order_id = ${id} order by e.created_at desc
      ) e) as events,

      (select row_to_json(v) from (
        select id, number, status::text as status, currency,
               total::float8 as total, deposit::float8 as deposit
        from invoices where order_id = ${id} limit 1
      ) v) as invoice
  `;

  if (!row?.order) return null;
  const o = row.order as Record<string, unknown>;

  return {
    order: {
      id: o.id as string,
      name: o.name as string,
      status: o.status as string,
      notes: (o.notes as string) ?? null,
      dateOrdered: (o.date_ordered as string) ?? null,
      dateDelivery: (o.date_delivery as string) ?? null,
      createdAt: o.created_at as string,
      updatedAt: o.updated_at as string,
      tailorId: o.tailor_id as string,
      tailor: o.tailor as string,
      currency: o.currency as string,
      clientId: (o.client_id as string) ?? null,
      client: (o.client as string) ?? null,
      clientPhone: (o.client_phone as string) ?? null,
      fabric: (o.fabric as string) ?? null,
      yardage: (o.yardage as number) ?? null,
      claimedBy: (o.claimed_by as string) ?? null,
    },
    items: ((row.items ?? []) as Record<string, unknown>[]).map((i) => ({
      id: i.id as string,
      garmentType: i.garment_type as string,
      quantity: n(i.quantity),
      unitPrice: i.unit_price === null ? null : n(i.unit_price),
      notes: (i.notes as string) ?? null,
      measurements: (i.measurements as Record<string, unknown>) ?? {},
    })),
    photos: ((row.photos ?? []) as Record<string, unknown>[]).map((p) => ({
      id: p.id as string,
      role: (p.role as string) ?? null,
      caption: (p.caption as string) ?? null,
      createdAt: p.created_at as string,
      published: Boolean(p.published),
    })),
    events: ((row.events ?? []) as Record<string, unknown>[]).map((e) => ({
      id: e.id as string,
      eventType: e.event_type as string,
      fromStatus: (e.from_status as string) ?? null,
      toStatus: (e.to_status as string) ?? null,
      createdAt: e.created_at as string,
      actor: (e.actor as string) ?? null,
    })),
    invoice: (row.invoice as OrderDetail['invoice']) ?? null,
  };
}
