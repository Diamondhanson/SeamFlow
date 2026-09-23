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
