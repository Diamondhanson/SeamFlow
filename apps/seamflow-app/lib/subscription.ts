// ============================================================================
// The tailor's subscription, as the app sees it (ROADMAP appendix I, part 3).
//
// The state arrives inside /me, which every screen already calls on open, so
// the trial countdown is right on first paint without another round trip. The
// server decides everything here — including which currency and payment
// methods this tailor may use. The app only renders the answer, so adding a
// market later changes no screen.
// ============================================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SubscriptionPlan, SubscriptionState } from '@seamflow/schemas';
import { api } from './api';
import { qk } from './query-keys';
import { useMe } from './queries';

/** Start nagging this close to the end of the trial, and not a day before. */
export const TRIAL_NAG_DAYS = 14;

export function useSubscription(): SubscriptionState | null {
  const me = useMe();
  return me.data?.subscription ?? null;
}

/** A standalone read, for screens that must be current after paying. */
export const useSubscriptionQuery = () =>
  useQuery({
    queryKey: [...qk.me(), 'subscription'],
    queryFn: () => api.me.subscription(),
    staleTime: 0,
  });

/**
 * Prices are shown in the currency the server picked: XAF for Cameroon, where
 * the amounts are whole francs, dollars everywhere else.
 *
 * XAF is formatted manually rather than through Intl's currency style, which
 * renders it as "FCFA 3,000" or "XAF 3,000" depending on the platform's ICU
 * data — inconsistent between a phone and the web build, and not how the
 * amount is written locally.
 */
export function formatPlanPrice(amount: number, currency: 'XAF' | 'USD'): string {
  if (currency === 'XAF') return `${amount.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
  return `$${amount.toLocaleString('en-US')}`;
}

export interface PlanRow {
  key: SubscriptionPlan;
  price: string;
  /** What it works out to per month — the honest way to compare the plans. */
  perMonth: string;
  savingsPercent: number;
}

/** The three plans, priced for this tailor, in the order they are offered. */
export function usePlanRows(sub: SubscriptionState | null): PlanRow[] {
  return useMemo(() => {
    if (!sub) return [];
    const { currency, prices } = sub.billing;
    const monthsIn: Record<SubscriptionPlan, number> = { monthly: 1, quarterly: 3, annual: 12 };
    return (['monthly', 'quarterly', 'annual'] as SubscriptionPlan[]).map((key) => {
      const price = prices[key];
      const months = monthsIn[key];
      const atMonthlyRate = prices.monthly * months;
      return {
        key,
        price: formatPlanPrice(price, currency),
        perMonth: formatPlanPrice(Math.round(price / months), currency),
        savingsPercent:
          atMonthlyRate > price ? Math.round((1 - price / atMonthlyRate) * 100) : 0,
      };
    });
  }, [sub]);
}

/**
 * Should the home screen show the trial banner?
 *
 * Only in the last two weeks, and never once they have paid. A countdown from
 * day one would train people to ignore it long before it matters.
 */
export function shouldNagAboutTrial(sub: SubscriptionState | null): boolean {
  if (!sub) return false;
  if (sub.status === 'trialing') return sub.daysLeft <= TRIAL_NAG_DAYS;
  // Out of trial and not paid: the banner becomes the way back.
  return sub.status === 'free';
}
