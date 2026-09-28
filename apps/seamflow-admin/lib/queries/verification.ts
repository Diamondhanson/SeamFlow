// ============================================================================
// The verification queue (appendix J.4).
//
// Unlike most pages here this reads through the API rather than straight from
// Postgres. The reason is the evidence: the photos live in a PRIVATE bucket and
// have to be signed with the service role, and signing belongs next to the
// bucket's rules, not in a dashboard query. So the whole row comes from
// /admin/verification as the signed-in staff member.
// ============================================================================

import { requireStaff } from '../auth';

const API_URL = (process.env.SEAMFLOW_API_URL || 'https://seamflow-api.onrender.com').replace(
  /\/$/,
  '',
);

export type QueueTab = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export const QUEUE_TABS: { key: QueueTab; label: string }[] = [
  { key: 'pending', label: 'Waiting on us' },
  { key: 'approved', label: 'Verified' },
  { key: 'rejected', label: 'Declined' },
  { key: 'withdrawn', label: 'Taken back' },
];

export interface EvidencePhoto {
  storagePath: string;
  /** Null once the photos are past retention, or if signing failed. */
  url: string | null;
}

export interface QueueRow {
  id: string;
  tailorId: string;
  status: QueueTab;
  submittedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  evidencePurged: boolean;
  evidenceUrls: EvidencePhoto[];
  tailor: {
    id: string;
    userId: string;
    businessName: string;
    isVerified: boolean;
    city: string | null;
    countryCode: string | null;
    joinedAt: string | null;
    phone: string | null;
    phoneVerified: boolean;
  };
}

export async function getQueue(tab: QueueTab): Promise<QueueRow[]> {
  const staff = await requireStaff();
  const res = await fetch(`${API_URL}/admin/verification?status=${tab}`, {
    headers: { Authorization: `Bearer ${staff.accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as QueueRow[];
}

/** Sidebar badge: requests waiting on US. Never throws the shell down. */
export async function getVerificationBadge(): Promise<number> {
  try {
    const staff = await requireStaff();
    const res = await fetch(`${API_URL}/admin/verification/count`, {
      headers: { Authorization: `Bearer ${staff.accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const body = (await res.json()) as { pending?: number };
    return body.pending ?? 0;
  } catch {
    return 0;
  }
}
