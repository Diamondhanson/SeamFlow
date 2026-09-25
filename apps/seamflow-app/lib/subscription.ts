// ============================================================================
// The tailor's subscription, as the app sees it (ROADMAP appendix I, part 3).
//
// The state arrives inside /me, which every screen already calls on open, so
// the trial countdown is right on first paint without another round trip. The
// server decides everything here — including which currency and payment
// methods this tailor may use. The app only renders the answer, so adding a
// market later changes no screen.
// ============================================================================

import { useCallback, useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';
import { billingFor, FREE_CAPS } from '@seamflow/schemas';
import type {
  BillingOptions,
  CheckoutInput,
  PaymentAttempt,
  SubscriptionPlan,
  SubscriptionState,
} from '@seamflow/schemas';
import { api } from './api';
import { qk } from './query-keys';
import { useMe } from './queries';
import { haptics } from './haptics';
import { canSellSubscriptions } from './platform-capabilities';

/** Start nagging this close to the end of the trial, and not a day before. */
export const TRIAL_NAG_DAYS = 14;

/**
 * How often the app re-checks where it stands. Fifteen minutes because two
 * things can change without the tailor doing anything: their trial can run
 * out while the app is open, and the caps can be switched on platform-wide
 * from the ops dashboard the moment payments go live. Neither should need a
 * restart to be noticed.
 */
const WATCH_INTERVAL_MS = 15 * 60 * 1000;

export function useSubscription(): SubscriptionState | null {
  const me = useMe();
  return me.data?.subscription ?? null;
}

/**
 * Billing options, safe against an older cached copy.
 *
 * The app keeps /me on the device for up to a week, so a phone can hold a
 * subscription saved BEFORE prices were added to it — and a screen that
 * destructured `sub.billing` straight from that rendered blank. Anything the
 * server has not told us yet falls back to the conservative default (dollars,
 * cards), and the background refresh replaces it within seconds.
 */
export function billingOf(sub: SubscriptionState | null): BillingOptions {
  return sub?.billing ?? billingFor(undefined);
}

/** Caps, likewise tolerant of a cached copy that predates them. */
export function capsOf(sub: SubscriptionState | null) {
  return sub?.caps ?? FREE_CAPS;
}

export function usageOf(sub: SubscriptionState | null) {
  return sub?.usage ?? { clients: 0, activeOrders: 0, photos: 0 };
}

/** A standalone read, for screens that must be current after paying. */
export const useSubscriptionQuery = () =>
  useQuery({
    queryKey: [...qk.me(), 'subscription'],
    queryFn: () => api.me.subscription(),
    staleTime: 0,
  });

/**
 * Mounted once, in the tailor layout: keeps the entitlement fresh in the
 * background and feeds the answer back into /me, which is what the banner and
 * every premium affordance read. Refetches on an interval and whenever the app
 * comes back to the foreground (react-query's focus manager is already wired
 * to AppState), so flipping the switch on the dashboard reaches open apps
 * without anyone reopening anything.
 */
export function useSubscriptionWatch(): void {
  const qc = useQueryClient();
  const enabled = !!qc.getQueryData(qk.me());
  const { data } = useQuery({
    queryKey: [...qk.me(), 'subscription', 'watch'],
    queryFn: () => api.me.subscription(),
    enabled,
    refetchInterval: WATCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    // A tailor with no shop yet has no subscription; a 404 there is expected
    // and must not retry in a loop.
    retry: false,
    staleTime: WATCH_INTERVAL_MS / 2,
  });

  useEffect(() => {
    if (!data) return;
    qc.setQueryData(qk.me(), (cur: unknown) =>
      cur && typeof cur === 'object' ? { ...(cur as object), subscription: data } : cur,
    );
  }, [data, qc]);
}

/**
 * For a premium affordance that should not pretend to work.
 *
 * `locked` is only true when the caps are actually live AND this tailor is on
 * Free — during the trial, and while the switch is off, everything behaves
 * normally. `prompt()` opens the same upgrade conversation a blocked request
 * would, so a locked button and a refused request say the same thing.
 */
export function usePremiumGate(): { locked: boolean; prompt: () => void } {
  const sub = useSubscription();
  const dialog = useDialog();
  const { t } = useTranslation();
  const locked = !!sub && sub.enforced && !sub.premium;
  const prompt = useCallback(() => {
    // On the web, take them to the plans. In a store build there is nowhere
    // to send them: say what the feature is and stop, with no suggestion
    // about where to buy it.
    if (canSellSubscriptions) {
      router.push('/(app)/upgrade' as never);
      return;
    }
    void dialog.alert({ title: t('billing.blockedTitle'), message: t('billing.blockedKeepData'), tone: 'info' });
  }, [dialog, t]);
  return { locked, prompt };
}

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
    const { currency, prices } = billingOf(sub);
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

// ── Buying ──────────────────────────────────────────────────────────────────

/**
 * Start a payment. The result tells the screen what to do next: send the
 * browser somewhere, or wait while the tailor approves a prompt on their
 * phone. Success is never decided here — only the provider's confirmation,
 * verified on the server, moves anyone's subscription.
 */
export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) => api.me.checkout(input),
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

/**
 * Turn subscription emails on or off. Its own endpoint rather than part of
 * notification preferences: those govern pushes about orders, this is consent
 * to be written to about money, which has to be revocable on its own.
 */
export function useSetEmailConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (on: boolean) => api.me.setEmailConsent(on),
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

/** True when the API says no provider is connected yet. */
export function isPaymentsUnavailable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  if ((err as { status?: number }).status !== 503) return false;
  const body = (err as { body?: { error?: string } }).body;
  return body?.error === 'payments_unavailable' || body?.error === 'method_unavailable';
}

/**
 * Watch one payment while it settles. Mobile money is confirmed out of band —
 * the tailor approves on their handset and the provider tells our server — so
 * the app polls rather than pretending to know.
 */
export function usePaymentAttempt(paymentId: string | null) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['subscription', 'payment', paymentId],
    queryFn: () => api.me.payment(paymentId!),
    enabled: !!paymentId,
    // Stop the moment it is decided; a settled payment never changes again.
    refetchInterval: (query) =>
      (query.state.data as PaymentAttempt | undefined)?.status === 'pending' ? 5000 : false,
  });

  useEffect(() => {
    // A payment that succeeded changes what this tailor may do, everywhere.
    if (q.data?.status === 'succeeded') {
      haptics.success();
      void qc.invalidateQueries({ queryKey: qk.me() });
    } else if (q.data?.status === 'failed') {
      haptics.error();
    }
  }, [q.data?.status, qc]);

  return q;
}
