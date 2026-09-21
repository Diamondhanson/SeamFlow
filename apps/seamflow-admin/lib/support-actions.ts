'use server';

// ============================================================================
// Support replies and status changes — sent to the API AS the signed-in staff
// member. The API re-checks the staff table, writes the message, moves the
// ticket's status and pushes the user; this file only forwards.
// ============================================================================

import { revalidatePath } from 'next/cache';
import { requireStaff } from './auth';

// Mirrors of packages/schemas/src/support.ts (staff side). Kept local because
// this app deliberately has no build-time dependency on the workspace packages
// — Vercel would have to build them first. Only the fields the inbox renders.
export type SupportStatus = 'open' | 'waiting_on_user' | 'resolved';
export interface SupportAttachment {
  storagePath: string;
  url?: string;
  thumbnailUrl?: string;
}
export interface SupportStaffTicketDetail {
  ticket: {
    id: string;
    number: number;
    side: 'tailor' | 'client';
    category: string;
    status: SupportStatus;
    subject: string;
    orderId: string | null;
    orderName: string | null;
    createdAt: string;
    resolvedAt: string | null;
  };
  messages: {
    id: string;
    sender: 'user' | 'support';
    body: string;
    attachments: SupportAttachment[];
    createdAt: string;
  }[];
  requester: {
    userId: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    businessName: string | null;
    joinedAt: string;
  };
}

const API_URL = (process.env.SEAMFLOW_API_URL || 'https://seamflow-api.onrender.com').replace(/\/$/, '');

async function api<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
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

/** Called by the ticket page to load the conversation (signed screenshots). */
export async function loadTicket(id: string): Promise<SupportStaffTicketDetail> {
  const staff = await requireStaff();
  return api<SupportStaffTicketDetail>(staff.accessToken, 'GET', `/admin/support/tickets/${id}`);
}

export interface ReplyState {
  error: string | null;
  sentAt: number | null;
}

export async function replyToTicket(_prev: ReplyState, form: FormData): Promise<ReplyState> {
  const staff = await requireStaff();
  const id = String(form.get('ticketId') ?? '');
  const body = String(form.get('body') ?? '').trim();
  const status = String(form.get('status') ?? 'waiting_on_user') as SupportStatus;
  const clientId = String(form.get('clientId') ?? '');
  if (!body) return { error: 'Write a reply first.', sentAt: null };
  try {
    await api(staff.accessToken, 'POST', `/admin/support/tickets/${id}/messages`, { body, status, clientId });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err), sentAt: null };
  }
  revalidatePath(`/support/${id}`);
  revalidatePath('/support');
  return { error: null, sentAt: Date.now() };
}

export async function setTicketStatus(id: string, status: SupportStatus): Promise<void> {
  const staff = await requireStaff();
  await api(staff.accessToken, 'PATCH', `/admin/support/tickets/${id}`, { status });
  revalidatePath(`/support/${id}`);
  revalidatePath('/support');
}
