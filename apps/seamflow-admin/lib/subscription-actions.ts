'use server';

// ============================================================================
// The two levers, sent to the API as the signed-in staff member. The API
// re-checks the staff table and owns the date arithmetic; this only forwards.
// ============================================================================

import { revalidatePath } from 'next/cache';
import { requireStaff } from './auth';

const API_URL = (process.env.SEAMFLOW_API_URL || 'https://seamflow-api.onrender.com').replace(/\/$/, '');

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
