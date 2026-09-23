// ============================================================================
// Subscriptions, for the ops dashboard (ROADMAP appendix I).
//
// Read straight from Postgres like every other page here. Anything that WRITES
// goes through the API as the signed-in staff member (lib/subscription-actions),
// so the one date and its history are only ever moved in one place.
// ============================================================================

import { sql } from '../db';
import { like, n } from './shared';

export type SubsTab = 'trialing' | 'active' | 'free' | 'all';
export const SUBS_TABS: { key: SubsTab; label: string }[] = [
  { key: 'trialing', label: 'On trial' },
  { key: 'active', label: 'Paying' },
  { key: 'free', label: 'Free' },
  { key: 'all', label: 'All' },
];

export interface SubsRow {
  tailorId: string;
  businessName: string;
  country: string | null;
  email: string | null;
  /** Computed from the dates, exactly as the API computes it. */
  state: 'trialing' | 'active' | 'grace' | 'free';
  daysLeft: number;
  trialEndsAt: string;
  premiumUntil: string | null;
  clients: number;
  activeOrders: number;
  lastPaymentAt: string | null;
}

export interface SubsPage {
  counts: Record<SubsTab, number>;
  rows: SubsRow[];
  /** Whether the caps and gates are live. Mirrors the API's env switch. */
  enforced: boolean;
}

/**
 * State is derived in SQL from the dates rather than read from the stored
 * `status` column, for the same reason the API derives it: a status column is
 * only as fresh as the last nightly run, and a dashboard that says "trialing"
 * about someone whose trial ended last night is worse than no dashboard.
 */
const STATE = sql`
  case
    when s.premium_until is not null and s.premium_until > now() then 'active'
    when s.grace_until is not null and s.grace_until > now() then 'grace'
    when s.trial_ends_at > now() then 'trialing'
    else 'free'
  end`;

export async function getSubscriptions(tab: SubsTab, q: string): Promise<SubsPage> {
  const term = q.trim();
  const search = term
    ? sql`(t.business_name ilike ${like(term)} or u.email ilike ${like(term)})`
    : sql`true`;
  const tabFilter = tab === 'all' ? sql`true` : sql`${STATE} = ${tab}`;

  const [rows, counts] = await Promise.all([
    sql<
      {
        tailor_id: string;
        business_name: string;
        country_code: string | null;
        email: string | null;
        state: SubsRow['state'];
        days_left: number;
        trial_ends_at: Date;
        premium_until: Date | null;
        clients: string;
        active_orders: string;
        last_payment_at: Date | null;
      }[]
    >`
      select s.tailor_id, t.business_name, t.country_code, u.email,
             ${STATE} as state,
             greatest(0, ceil(extract(epoch from (
               greatest(s.trial_ends_at, coalesce(s.premium_until, s.trial_ends_at)) - now()
             )) / 86400))::int as days_left,
             s.trial_ends_at, s.premium_until, s.last_payment_at,
             (select count(*) from public.clients c where c.tailor_id = t.id) as clients,
             (select count(*) from public.orders o
               where o.tailor_id = t.id and o.status <> 'delivered') as active_orders
      from public.subscriptions s
      join public.tailors t on t.id = s.tailor_id
      left join public.users u on u.id = t.user_id
      where ${tabFilter} and ${search}
      -- Soonest to run out first: that is the list you act on.
      order by days_left asc, t.business_name asc
      limit 200
    `,
    sql<{ state: string; c: string }[]>`
      select ${STATE} as state, count(*) as c
      from public.subscriptions s
      group by 1
    `,
  ]);

  const by = Object.fromEntries(counts.map((c) => [c.state, n(c.c)]));
  return {
    counts: {
      trialing: by.trialing ?? 0,
      active: (by.active ?? 0) + (by.grace ?? 0),
      free: by.free ?? 0,
      all: counts.reduce((a, c) => a + n(c.c), 0),
    },
    rows: rows.map((r) => ({
      tailorId: r.tailor_id,
      businessName: r.business_name,
      country: r.country_code,
      email: r.email,
      state: r.state,
      daysLeft: n(r.days_left),
      trialEndsAt: r.trial_ends_at.toISOString(),
      premiumUntil: r.premium_until?.toISOString() ?? null,
      clients: n(r.clients),
      activeOrders: n(r.active_orders),
      lastPaymentAt: r.last_payment_at?.toISOString() ?? null,
    })),
    enforced: false,
  };
}

/** Money taken so far, per currency. Empty until a provider is plugged in. */
export async function getSubscriptionRevenue() {
  return sql<{ currency: string; total: string; payments: string }[]>`
    select currency, sum(amount) as total, count(*) as payments
    from public.subscription_payments
    where status = 'succeeded'
    group by currency
  `;
}
