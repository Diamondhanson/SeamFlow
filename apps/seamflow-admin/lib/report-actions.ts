'use server';

// ============================================================================
// Acting on a report.
//
// Deciding and remedying are separate calls on purpose. `decideReport` only
// records what a reviewer concluded; taking a post down and suspending an
// account are their own endpoints with their own audit entries, and binding
// them together would mean every report had exactly one possible response.
//
// The reviewer therefore does the thing, then closes the report — which is
// also the order that keeps the audit trail readable afterwards.
// ============================================================================

import { revalidatePath } from 'next/cache';
import { requireStaff } from './auth';

const API_URL = (process.env.SEAMFLOW_API_URL || 'https://seamflow-api.onrender.com').replace(
  /\/$/,
  '',
);

async function post(token: string, path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
}

/** Close a report: we acted, or we looked and it stays. */
export async function decideReport(
  reportId: string,
  status: 'actioned' | 'dismissed',
  note?: string,
): Promise<void> {
  const staff = await requireStaff();
  await post(staff.accessToken, `/admin/reports/${reportId}/decide`, { status, note });
  revalidatePath('/reports');
}

/**
 * Take the design down AND close the report, in that order.
 *
 * Offered as one button because it is overwhelmingly the common outcome for a
 * stolen-work report, and making a reviewer do it in two places is how the
 * second half gets forgotten.
 */
export async function takedownAndClose(
  reportId: string,
  postId: string,
  reason: string,
): Promise<void> {
  const staff = await requireStaff();
  await post(staff.accessToken, `/admin/feed-posts/${postId}/takedown`, { reason, restore: false });
  await post(staff.accessToken, `/admin/reports/${reportId}/decide`, {
    status: 'actioned',
    note: reason,
  });
  revalidatePath('/reports');
  revalidatePath('/feed');
}

/** Suspend the account behind the content AND close the report. */
export async function suspendAndClose(
  reportId: string,
  userId: string,
  reason: string,
): Promise<void> {
  const staff = await requireStaff();
  await post(staff.accessToken, `/admin/users/${userId}/suspended`, { suspended: true, reason });
  await post(staff.accessToken, `/admin/reports/${reportId}/decide`, {
    status: 'actioned',
    note: reason,
  });
  revalidatePath('/reports');
  revalidatePath('/tailors');
}
