// ============================================================================
// Data health.
//
// Every check here maps to a defect that actually happened in this codebase or
// a rule the schema does not enforce. Generic hygiene ("nullable columns!")
// is deliberately absent: a checklist that always shows warnings is a
// checklist people stop reading.
//
// Severity is honest. A row whose own description says "this is expected" is
// marked `info`, not `warn` — flagging something for review while explaining
// that it needs none is how you train someone to ignore the column.
// ============================================================================

import { sql } from '../db';
import { n } from './shared';

export interface Check {
  id: string;
  label: string;
  count: number;
  detail: string;
  severity: 'ok' | 'warn' | 'info';
  /** The cleanup this check has a button for, if any. */
  fix?: 'clients.merge-duplicates' | 'clients.clear-placeholders' | 'invoices.delete-empty-drafts';
}

export interface HealthPage {
  checks: Check[];
  duplicates: { tailor: string; phone: string; copies: number; names: string; oldest: string }[];
  placeholders: { id: string; tailor: string; fullName: string; phone: string | null; address: string | null }[];
  emptyDrafts: { id: string; number: string; tailor: string; currency: string | null; createdAt: string }[];
  mismatched: { id: string; number: string; tailor: string; currency: string | null; total: number; computed: number }[];
}

/**
 * The sum a line-item list SHOULD produce: Σ quantity × unitPrice.
 *
 * Quantity is allowed to be fractional (2.5 metres of fabric is a real line),
 * which is exactly why this check exists — a rounding rule applied in the app
 * but not in the stored total shows up here as a mismatch rather than as a
 * customer noticing.
 */
const computedTotal = sql`
  coalesce((
    select sum((li->>'quantity')::numeric * (li->>'unitPrice')::numeric)
    from jsonb_array_elements(i.line_items) li
  ), 0)
`;

export async function getHealth(): Promise<HealthPage> {
  const [row] = await sql`
    select
      (select row_to_json(s) from (
        select
          -- Redundant ROWS, not groups: this is exactly what the merge
          -- deletes, and it is the number you can also count by eye on
          -- /clients. Reporting groups here would show "4" beside a list of
          -- eleven flagged rows, which reads as a bug in the dashboard.
          (select coalesce(sum(copies - 1), 0) from (
             select count(*) as copies from clients
             where phone is not null and phone <> '' and phone <> '—'
             group by tailor_id, phone having count(*) > 1
           ) d)                                                            as dupe_clients,
          (select count(*) from clients where phone = '—' or address = '—') as placeholder_clients,
          (select count(*) from users
             where role = 'client' and coalesce(full_name,'') = '')         as clients_no_name,
          (select count(*) from invoices where currency is null)            as invoices_no_currency,
          (select count(*) from invoices
             where status = 'draft' and total = 0)                          as empty_drafts,
          (select count(*) from invoices i where abs(i.total - ${computedTotal}) > 0.005)
                                                                            as mismatched,
          (select count(*) from orders where date_delivery is null)         as orders_no_due_date,
          (select count(*) from orders o
             where not exists (select 1 from order_claims c where c.order_id = o.id))
                                                                            as unclaimed_orders,
          (select count(*) from users u
             where u.role = 'client'
               and not exists (select 1 from device_tokens d where d.user_id = u.id))
                                                                            as clients_no_device
      ) s) as scalars,

      (select coalesce(json_agg(d), '[]'::json) from (
        select
          t.business_name                     as tailor,
          c.phone                             as phone,
          count(*)::int                       as copies,
          string_agg(distinct c.full_name, ', ') as names,
          min(c.created_at)                   as oldest
        from clients c join tailors t on t.id = c.tailor_id
        where c.phone is not null and c.phone <> '' and c.phone <> '—'
        group by t.business_name, c.tailor_id, c.phone
        having count(*) > 1
        order by count(*) desc
      ) d) as duplicates,

      (select coalesce(json_agg(p), '[]'::json) from (
        select c.id, t.business_name as tailor, c.full_name, c.phone, c.address
        from clients c join tailors t on t.id = c.tailor_id
        where c.phone = '—' or c.address = '—'
        order by c.created_at desc
      ) p) as placeholders,

      (select coalesce(json_agg(e), '[]'::json) from (
        select i.id, i.number, t.business_name as tailor, i.currency, i.created_at
        from invoices i join tailors t on t.id = i.tailor_id
        where i.status = 'draft' and i.total = 0
        order by i.created_at desc
      ) e) as empty_drafts,

      (select coalesce(json_agg(m), '[]'::json) from (
        select i.id, i.number, t.business_name as tailor, i.currency,
               i.total::float8 as total, ${computedTotal}::float8 as computed
        from invoices i join tailors t on t.id = i.tailor_id
        where abs(i.total - ${computedTotal}) > 0.005
        order by i.created_at desc
      ) m) as mismatched
  `;

  const s = (row?.scalars ?? {}) as Record<string, unknown>;

  const warn = (
    id: string,
    label: string,
    count: number,
    detail: string,
    fix?: Check['fix'],
  ): Check => ({ id, label, count, detail, severity: count === 0 ? 'ok' : 'warn', fix });

  const info = (id: string, label: string, count: number, detail: string): Check => ({
    id,
    label,
    count,
    detail,
    severity: 'info',
  });

  return {
    checks: [
      warn(
        'dupes',
        'Redundant duplicate clients',
        n(s.dupe_clients),
        'Rows that share a phone number with an older row under the same tailor. The enquiry→order path creates a fresh CRM row each time instead of matching the existing one; this is the count the merge would remove.',
        'clients.merge-duplicates',
      ),
      warn(
        'placeholders',
        'Placeholder contact details',
        n(s.placeholder_clients),
        "Phone or address stored as the literal character '—' because it was unknown at enquiry time. It renders as if it were a real value.",
        'clients.clear-placeholders',
      ),
      warn(
        'mismatch',
        'Invoice total disagrees with its line items',
        n(s.mismatched),
        'Stored total is not Σ quantity × unit price. This is what a rounding bug looks like from the outside.',
      ),
      warn(
        'no-currency',
        'Invoices with no currency',
        n(s.invoices_no_currency),
        'Amounts render unformatted and cannot be grouped or compared.',
      ),
      warn(
        'empty-drafts',
        'Draft invoices totalling zero',
        n(s.empty_drafts),
        'Created and never priced. Harmless but they inflate every invoice count.',
        'invoices.delete-empty-drafts',
      ),
      warn(
        'no-name',
        'Client accounts with no name',
        n(s.clients_no_name),
        "Shows in the tailor's inbox as a raw email address.",
      ),
      info(
        'no-due',
        'Orders with no delivery date',
        n(s.orders_no_due_date),
        'Excluded from reminders and from "due soon". Legitimate for open-ended work.',
      ),
      info(
        'unclaimed',
        'Orders not claimed by any client',
        n(s.unclaimed_orders),
        'Expected for walk-ins — only quoted orders auto-claim. Shown for context.',
      ),
      info(
        'no-device',
        'Client accounts that cannot receive push',
        n(s.clients_no_device),
        'No device token registered. The client app has a placeholder Firebase project, so this is currently every one of them.',
      ),
    ],
    duplicates: (row?.duplicates ?? []) as HealthPage['duplicates'],
    placeholders: ((row?.placeholders ?? []) as Record<string, unknown>[]).map((p) => ({
      id: p.id as string,
      tailor: p.tailor as string,
      fullName: p.full_name as string,
      phone: (p.phone as string) ?? null,
      address: (p.address as string) ?? null,
    })),
    emptyDrafts: ((row?.empty_drafts ?? []) as Record<string, unknown>[]).map((e) => ({
      id: e.id as string,
      number: e.number as string,
      tailor: e.tailor as string,
      currency: (e.currency as string) ?? null,
      createdAt: e.created_at as string,
    })),
    mismatched: (row?.mismatched ?? []) as HealthPage['mismatched'],
  };
}

/**
 * The sidebar badge: how many CHECKS are failing, not how many rows are bad.
 *
 * "6" meaning six distinct problems is actionable. "6" meaning four duplicate
 * clients plus two unpriced drafts is a number that goes up when one problem
 * gets slightly worse, which teaches you nothing and eventually gets ignored.
 *
 * `exists` rather than `count` throughout — Postgres can stop at the first
 * matching row, and this runs on every page load in the layout.
 */
export async function getIssueCount(): Promise<number> {
  const [r] = await sql`
    select (
      (exists (select 1 from (
         select tailor_id, phone from clients
         where phone is not null and phone <> '' and phone <> '—'
         group by tailor_id, phone having count(*) > 1) d))::int
    + (exists (select 1 from clients where phone = '—' or address = '—'))::int
    + (exists (select 1 from users where role = 'client' and coalesce(full_name,'') = ''))::int
    + (exists (select 1 from invoices where currency is null))::int
    + (exists (select 1 from invoices where status = 'draft' and total = 0))::int
    + (exists (select 1 from invoices i where abs(i.total - ${computedTotal}) > 0.005))::int
    ) as issues
  `;
  return n(r?.issues);
}
