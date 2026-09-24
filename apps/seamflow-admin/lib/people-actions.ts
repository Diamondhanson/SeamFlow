'use server';

// ============================================================================
// Actions on people, sent to the API as the signed-in staff member.
//
// The dashboard reads straight from Postgres because every read here is an
// aggregate. Writes are different: they need the staff check, the side effects
// (a notification, a Supabase session revoke) and the audit row, all of which
// live in the API. So nothing in this file touches the database.
// ============================================================================

import { revalidatePath } from 'next/cache';
import { requireStaff } from './auth';

const API_URL = (process.env.SEAMFLOW_API_URL || 'https://seamflow-api.onrender.com').replace(/\/$/, '');

async function call<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? text;
    } catch {
      /* not JSON */
    }
    throw new Error(`API ${res.status}: ${message}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

/** The verified badge on a shop. */
export async function setVerified(tailorId: string, verified: boolean): Promise<void> {
  const staff = await requireStaff();
  await call(staff.accessToken, 'POST', `/admin/tailors/${tailorId}/verified`, { verified });
  revalidatePath(`/tailors/${tailorId}`);
  revalidatePath('/tailors');
}

/** End every session this person has. They can sign in again immediately. */
export async function signOutEverywhere(userId: string, revalidate: string): Promise<void> {
  const staff = await requireStaff();
  await call(staff.accessToken, 'POST', `/admin/users/${userId}/sign-out`);
  revalidatePath(revalidate);
}

/** Stop a deletion that is counting down. */
export async function cancelDeletion(userId: string, revalidate: string): Promise<void> {
  const staff = await requireStaff();
  await call(staff.accessToken, 'POST', `/admin/users/${userId}/deletion/cancel`);
  revalidatePath(revalidate);
}

/**
 * Carry out a deletion the person already asked for. The API refuses if they
 * did not ask, which is the guard that matters: an account is not staff's to
 * take away.
 */
export async function purgeNow(userId: string, revalidate: string): Promise<{ purged: boolean; reason?: string }> {
  const staff = await requireStaff();
  const out = await call<{ purged: boolean; reason?: string }>(
    staff.accessToken,
    'POST',
    `/admin/users/${userId}/deletion/purge`,
  );
  revalidatePath(revalidate);
  return out;
}

/** Take a post out of the feed, or put it back. */
export async function takedownPost(
  postId: string,
  reason: string,
  restore = false,
): Promise<void> {
  const staff = await requireStaff();
  await call(staff.accessToken, 'POST', `/admin/feed-posts/${postId}/takedown`, { reason, restore });
  revalidatePath('/feed');
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  targetType: string;
  targetId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

/** What staff have done to one person or post. */
export async function getHistory(targetType: string, targetId: string): Promise<AuditEntry[]> {
  const staff = await requireStaff();
  const { items } = await call<{ items: AuditEntry[] }>(
    staff.accessToken,
    'GET',
    `/admin/audit/${targetType}/${targetId}`,
  );
  return items;
}
