// ============================================================================
// Clients — and there are two entirely separate populations of them.
//
//   clients            a row in a tailor's address book, typed in by the tailor
//   users role=client  a person who signed up in the consumer app
//
// NOTHING JOINS THESE TWO TABLES. Not a foreign key, not a phone match, not a
// nullable link column. The same human being can exist in both with no
// relationship between the rows, which is why this page shows them side by
// side rather than pretending they are one list: any merged view would have to
// invent a join that the schema does not have.
// ============================================================================

import { sql } from '../db';
import { like, n } from './shared';

export interface CrmClient {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  tailorId: string;
  tailor: string;
  orders: number;
  measurementSets: number;
  createdAt: string;
  duplicate: boolean;
  placeholder: boolean;
}

export interface AccountClient {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  claims: number;
  conversations: number;
  devices: number;
}

export interface ClientsPage {
  crm: CrmClient[];
  crmTotal: number;
  accounts: AccountClient[];
  accountsTotal: number;
  tailors: { value: string; label: string }[];
  overlap: { phone: string; crmName: string; accountName: string | null; accountEmail: string | null }[];
}

export async function getClients(opts: { q?: string; tailor?: string; page?: number }): Promise<ClientsPage> {
  const page = opts.page ?? 1;
  const q = opts.q?.trim() ?? '';
  const tailor = opts.tailor ?? '';
  const PAGE = 40;

  const where = sql`
    (${!q} or c.full_name ilike ${q ? like(q) : ''} or coalesce(c.phone,'') ilike ${q ? like(q) : ''}
       or coalesce(c.email,'') ilike ${q ? like(q) : ''})
    and (${!tailor} or c.tailor_id = ${tailor || null}::uuid)
  `;

  const [row] = await sql`
    select
      (select count(*) from clients c where ${where})::int as crm_total,
      (select count(*) from users where role = 'client')::int as accounts_total,

      (select coalesce(json_agg(r), '[]'::json) from (
        select
          c.id, c.full_name, c.phone, c.email, c.address, c.created_at,
          c.tailor_id, t.business_name as tailor,
          (select count(*) from orders o where o.client_id = c.id)::int as orders,
          (select count(*) from measurement_sets m where m.client_id = c.id)::int as measurement_sets,
          (c.phone is not null and c.phone <> '' and c.phone <> '—'
            and exists (select 1 from clients d
                        where d.tailor_id = c.tailor_id and d.phone = c.phone and d.id <> c.id)) as duplicate,
          (c.phone = '—' or c.address = '—') as placeholder
        from clients c join tailors t on t.id = c.tailor_id
        where ${where}
        order by c.created_at desc
        limit ${PAGE} offset ${(page - 1) * PAGE}
      ) r) as crm,

      (select coalesce(json_agg(a), '[]'::json) from (
        select
          u.id, u.full_name, u.email, u.phone, u.phone_verified_at, u.created_at,
          (select count(*) from order_claims k where k.user_id = u.id)::int   as claims,
          (select count(*) from conversations v where v.client_user_id = u.id)::int as conversations,
          (select count(*) from device_tokens d where d.user_id = u.id)::int  as devices
        from users u where u.role = 'client'
        order by u.created_at desc limit 100
      ) a) as accounts,

      -- The one place the two populations can be compared at all: an exact
      -- phone match. Not a join the app can rely on — phones are free text on
      -- the CRM side — but it is the only evidence available that the same
      -- person exists twice, so it is shown as evidence, not as a link.
      (select coalesce(json_agg(o), '[]'::json) from (
        select c.phone, c.full_name as crm_name, u.full_name as account_name, u.email as account_email
        from clients c
        join users u on u.role = 'client' and u.phone is not null and u.phone = c.phone
        where c.phone is not null and c.phone <> '' and c.phone <> '—'
      ) o) as overlap,

      (select coalesce(json_agg(t), '[]'::json) from (
        select t.id as value, t.business_name as label
        from tailors t where exists (select 1 from clients c where c.tailor_id = t.id)
        order by t.business_name
      ) t) as tailors
  `;

  return {
    crmTotal: n(row?.crm_total),
    accountsTotal: n(row?.accounts_total),
    crm: ((row?.crm ?? []) as Record<string, unknown>[]).map((c) => ({
      id: c.id as string,
      fullName: c.full_name as string,
      phone: (c.phone as string) ?? null,
      email: (c.email as string) ?? null,
      address: (c.address as string) ?? null,
      tailorId: c.tailor_id as string,
      tailor: c.tailor as string,
      orders: n(c.orders),
      measurementSets: n(c.measurement_sets),
      createdAt: c.created_at as string,
      duplicate: Boolean(c.duplicate),
      placeholder: Boolean(c.placeholder),
    })),
    accounts: ((row?.accounts ?? []) as Record<string, unknown>[]).map((a) => ({
      id: a.id as string,
      fullName: (a.full_name as string) ?? null,
      email: (a.email as string) ?? null,
      phone: (a.phone as string) ?? null,
      phoneVerifiedAt: (a.phone_verified_at as string) ?? null,
      createdAt: a.created_at as string,
      claims: n(a.claims),
      conversations: n(a.conversations),
      devices: n(a.devices),
    })),
    overlap: ((row?.overlap ?? []) as Record<string, unknown>[]).map((o) => ({
      phone: o.phone as string,
      crmName: o.crm_name as string,
      accountName: (o.account_name as string) ?? null,
      accountEmail: (o.account_email as string) ?? null,
    })),
    tailors: (row?.tailors ?? []) as { value: string; label: string }[],
  };
}
