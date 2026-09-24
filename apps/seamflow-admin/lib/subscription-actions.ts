'use server';

// ============================================================================
// The two levers, sent to the API as the signed-in staff member. The API
// re-checks the staff table and owns the date arithmetic; this only forwards.
// ============================================================================

import { revalidatePath } from 'next/cache';
import { requireStaff } from './auth';

const API_URL = (process.env.SEAMFLOW_API_URL || 'https://seamflow-api.onrender.com').replace(/\/$/, '');

async function get<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as T;
}

async function post(token: string, path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? text;
    } catch {
      /* not JSON */
    }
    throw new Error(`API ${res.status}: ${message}`);
  }
}

/**
 * Is the paywall live? Read from the API rather than the database directly,
 * so the dashboard shows exactly what the API is enforcing — including the
 * environment override, which the table alone would not reveal.
 */
export async function getEnforcement(): Promise<boolean> {
  const staff = await requireStaff();
  const { enforced } = await get<{ enforced: boolean }>(staff.accessToken, '/admin/subscriptions/enforcement');
  return enforced;
}

/** Turn the Free caps and premium gates on or off, platform-wide. */
export async function setEnforcement(enforced: boolean): Promise<void> {
  const staff = await requireStaff();
  await post(staff.accessToken, '/admin/subscriptions/enforcement', { enforced });
  revalidatePath('/subscriptions');
}

/** Add (or with a negative number, take back) paid days for one tailor. */
export async function grantDays(tailorId: string, days: number, reason?: string): Promise<void> {
  const staff = await requireStaff();
  await post(staff.accessToken, `/admin/subscriptions/${tailorId}/grant`, { days, reason });
  revalidatePath('/subscriptions');
}

/** Move one tailor's trial end date. */
export async function extendTrial(tailorId: string, days: number): Promise<void> {
  const staff = await requireStaff();
  await post(staff.accessToken, `/admin/subscriptions/${tailorId}/trial`, { days });
  revalidatePath('/subscriptions');
}

/** Move every trial at once — the launch safety net. */
export async function extendAllTrials(days: number): Promise<void> {
  const staff = await requireStaff();
  await post(staff.accessToken, '/admin/subscriptions/trials/extend-all', { days });
  revalidatePath('/subscriptions');
  revalidatePath('/', 'layout');
}

// ── Prices ──────────────────────────────────────────────────────────────────

export interface PriceTable {
  XAF: { monthly: number; quarterly: number; annual: number };
  USD: { monthly: number; quarterly: number; annual: number };
}

/**
 * What the platform charges, and what this build would charge without the
 * stored override. Read through the API rather than the settings table so the
 * dashboard shows exactly what a tailor would be quoted, including the
 * fallback when a stored value fails validation.
 */
export async function getPrices(): Promise<{ prices: PriceTable; defaults: PriceTable }> {
  const staff = await requireStaff();
  return get<{ prices: PriceTable; defaults: PriceTable }>(
    staff.accessToken,
    '/admin/subscriptions/prices',
  );
}

/** Change what everyone is charged, from now on. */
export async function setPrices(prices: PriceTable): Promise<void> {
  const staff = await requireStaff();
  await post(staff.accessToken, '/admin/subscriptions/prices', prices);
  revalidatePath('/subscriptions');
}

// ── Payments ────────────────────────────────────────────────────────────────

export interface PaymentRow {
  id: string;
  tailorId: string;
  businessName: string | null;
  plan: string | null;
  amount: number;
  currency: string;
  method: string | null;
  status: 'pending' | 'succeeded' | 'failed';
  provider: string | null;
  providerRef: string | null;
  daysAdded: number;
  createdAt: string;
  updatedAt: string;
}

export async function getPayments(): Promise<PaymentRow[]> {
  const staff = await requireStaff();
  const { items } = await get<{ items: PaymentRow[] }>(
    staff.accessToken,
    '/admin/subscriptions/payments',
  );
  return items;
}

/**
 * Ask the provider about one pending payment now. The background sweep runs
 * every ten minutes, which is far too slow when a tailor is on the phone
 * saying the money left their account.
 */
export async function recheckPayment(paymentId: string): Promise<void> {
  const staff = await requireStaff();
  await post(staff.accessToken, `/admin/subscriptions/payments/${paymentId}/recheck`, {});
  revalidatePath('/subscriptions');
}
