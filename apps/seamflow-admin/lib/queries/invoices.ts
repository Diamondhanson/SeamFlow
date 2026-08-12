// ============================================================================
// Invoices — list with filters, and detail.
//
// The rule that shapes this whole file: MONEY IS NEVER SUMMED ACROSS
// CURRENCIES. Totals are always grouped by currency, and the monthly series is
// faceted — one chart per currency — rather than one chart with a series per
// currency. There is no exchange-rate source in this system, so a combined
// figure would be a number that looks authoritative and means nothing.
// ============================================================================

import { sql } from '../db';
import { like, n } from './shared';

export interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  currency: string | null;
  total: number;
  deposit: number;
  outstanding: number;
  lines: number;
  computed: number;
  tailorId: string;
  tailor: string;
  orderId: string | null;
  orderName: string | null;
  issuedAt: string | null;
  createdAt: string;
}

export interface CurrencyFacet {
  currency: string | null;
  invoices: number;
  billed: number;
  deposits: number;
  outstanding: number;
  monthly: { key: string; label: string; value: number }[];
}

export interface InvoicesPage {
  rows: InvoiceRow[];
  total: number;
  facets: CurrencyFacet[];
  currencies: { value: string; label: string }[];
  tailors: { value: string; label: string }[];
}

const computed = sql`
  coalesce((
    select sum((li->>'quantity')::numeric * (li->>'unitPrice')::numeric)
    from jsonb_array_elements(i.line_items) li
  ), 0)
`;

export async function getInvoices(opts: {
  q?: string;
  currency?: string;
  status?: string;
  tailor?: string;
  page?: number;
}): Promise<InvoicesPage> {
  const page = opts.page ?? 1;
  const q = opts.q?.trim() ?? '';
  const currency = opts.currency ?? '';
  const status = opts.status ?? '';
  const tailor = opts.tailor ?? '';
  const PAGE = 40;

  const where = sql`
    (${!q} or i.number ilike ${q ? like(q) : ''})
    and (${!currency} or i.currency = ${currency || null})
    and (${!status} or i.status::text = ${status || null})
    and (${!tailor} or i.tailor_id = ${tailor || null}::uuid)
  `;

  const [row] = await sql`
    select
      (select count(*) from invoices i where ${where})::int as total,

      (select coalesce(json_agg(r), '[]'::json) from (
        select
          i.id, i.number, i.status::text as status, i.currency,
          i.total::float8 as total, i.deposit::float8 as deposit,
          (i.total - i.deposit)::float8 as outstanding,
          jsonb_array_length(coalesce(i.line_items,'[]'::jsonb)) as lines,
          ${computed}::float8 as computed,
          i.tailor_id, t.business_name as tailor,
          i.order_id, o.order_name,
          i.issued_at, i.created_at
        from invoices i
          join tailors t on t.id = i.tailor_id
          left join orders o on o.id = i.order_id
        where ${where}
        order by i.created_at desc
        limit ${PAGE} offset ${(page - 1) * PAGE}
      ) r) as rows,

      -- One facet per currency, each carrying its own 12-month series.
      (select coalesce(json_agg(f), '[]'::json) from (
        select
          i.currency,
          count(*)::int                             as invoices,
          coalesce(sum(i.total),0)::float8          as billed,
          coalesce(sum(i.deposit),0)::float8        as deposits,
          coalesce(sum(i.total - i.deposit),0)::float8 as outstanding,
          (select json_agg(x) from (
             select to_char(m,'YYYY-MM') key, to_char(m,'Mon') label,
                    (select coalesce(sum(j.total),0)::float8 from invoices j
                       where j.currency is not distinct from i.currency
                         and date_trunc('month', j.created_at) = m) value
             from generate_series(date_trunc('month', now()) - interval '11 months',
                                  date_trunc('month', now()), interval '1 month') m
           ) x) as monthly
        from invoices i
        group by i.currency
        order by count(*) desc
      ) f) as facets,

      (select coalesce(json_agg(c), '[]'::json) from (
        select coalesce(currency,'') as value,
               coalesce(currency,'(not set)') || ' · ' || count(*) as label
        from invoices group by currency order by count(*) desc
      ) c) as currencies,

      (select coalesce(json_agg(t), '[]'::json) from (
        select t.id as value, t.business_name as label
        from tailors t where exists (select 1 from invoices i where i.tailor_id = t.id)
        order by t.business_name
      ) t) as tailors
  `;

  return {
    total: n(row?.total),
    rows: ((row?.rows ?? []) as Record<string, unknown>[]).map((i) => ({
      id: i.id as string,
      number: i.number as string,
      status: i.status as string,
      currency: (i.currency as string) ?? null,
      total: n(i.total),
      deposit: n(i.deposit),
      outstanding: n(i.outstanding),
      lines: n(i.lines),
      computed: n(i.computed),
      tailorId: i.tailor_id as string,
      tailor: i.tailor as string,
      orderId: (i.order_id as string) ?? null,
      orderName: (i.order_name as string) ?? null,
      issuedAt: (i.issued_at as string) ?? null,
      createdAt: i.created_at as string,
    })),
    facets: (row?.facets ?? []) as CurrencyFacet[],
    currencies: (row?.currencies ?? []) as { value: string; label: string }[],
    tailors: (row?.tailors ?? []) as { value: string; label: string }[],
  };
}

// ---------------------------------------------------------------------------

export interface LineItem {
  id: string;
  description: string;
  category: string | null;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceDetail {
  invoice: {
    id: string;
    number: string;
    status: string;
    currency: string | null;
    total: number;
    deposit: number;
    notes: string | null;
    issuedAt: string | null;
    createdAt: string;
    updatedAt: string;
    tailorId: string;
    tailor: string;
    orderId: string | null;
    orderName: string | null;
    client: string | null;
  };
  lineItems: LineItem[];
  payments: { id: string; amount: number; currency: string | null; status: string; provider: string | null; createdAt: string }[];
}

export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  const [row] = await sql`
    select
      (select row_to_json(v) from (
        select
          i.id, i.number, i.status::text as status, i.currency,
          i.total::float8 as total, i.deposit::float8 as deposit,
          i.notes, i.issued_at, i.created_at, i.updated_at,
          i.tailor_id, t.business_name as tailor,
          i.order_id, o.order_name, c.full_name as client,
          coalesce(i.line_items, '[]'::jsonb) as line_items
        from invoices i
          join tailors t on t.id = i.tailor_id
          left join orders o on o.id = i.order_id
          left join clients c on c.id = o.client_id
        where i.id = ${id}
      ) v) as invoice,

      (select coalesce(json_agg(p), '[]'::json) from (
        select id, amount::float8 as amount, currency, status::text as status,
               provider::text as provider, created_at
        from payments where order_id = (select order_id from invoices where id = ${id})
        order by created_at desc
      ) p) as payments
  `;

  if (!row?.invoice) return null;
  const v = row.invoice as Record<string, unknown>;
  const raw = (v.line_items as Record<string, unknown>[]) ?? [];

  return {
    invoice: {
      id: v.id as string,
      number: v.number as string,
      status: v.status as string,
      currency: (v.currency as string) ?? null,
      total: n(v.total),
      deposit: n(v.deposit),
      notes: (v.notes as string) ?? null,
      issuedAt: (v.issued_at as string) ?? null,
      createdAt: v.created_at as string,
      updatedAt: v.updated_at as string,
      tailorId: v.tailor_id as string,
      tailor: v.tailor as string,
      orderId: (v.order_id as string) ?? null,
      orderName: (v.order_name as string) ?? null,
      client: (v.client as string) ?? null,
    },
    lineItems: raw.map((li, idx) => ({
      id: (li.id as string) ?? String(idx),
      description: (li.description as string) ?? '',
      category: (li.category as string) ?? null,
      quantity: n(li.quantity),
      unitPrice: n(li.unitPrice),
    })),
    payments: ((row.payments ?? []) as Record<string, unknown>[]).map((p) => ({
      id: p.id as string,
      amount: n(p.amount),
      currency: (p.currency as string) ?? null,
      status: p.status as string,
      provider: (p.provider as string) ?? null,
      createdAt: p.created_at as string,
    })),
  };
}
