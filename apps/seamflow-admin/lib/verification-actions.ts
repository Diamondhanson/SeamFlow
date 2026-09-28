'use server';

// ============================================================================
// Deciding a verification request, as the signed-in staff member.
//
// This is the one lever in the dashboard that lends SeamFlow's credibility to a
// stranger, so it goes through the API like every other write: the staff check,
// the badge update, the notification to the tailor and the audit row all happen
// in one place and cannot be half-done.
// ============================================================================

import { revalidatePath } from 'next/cache';
import { requireStaff } from './auth';

const API_URL = (process.env.SEAMFLOW_API_URL || 'https://seamflow-api.onrender.com').replace(
  /\/$/,
  '',
);

/**
 * Approve, or decline with a reason.
 *
 * The API refuses a decline with no note, and the note reaches the tailor word
 * for word — so whatever is typed here is read by a person who has to act on
 * it, not filed as a code.
 */
export async function decide(
  requestId: string,
  approve: boolean,
  note: string | null,
): Promise<void> {
  const staff = await requireStaff();
  const res = await fetch(`${API_URL}/admin/verification/${requestId}/decide`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${staff.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ approve, note }),
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
  revalidatePath('/verification');
  revalidatePath('/tailors');
}
