// ============================================================================
// The moderation queue.
//
// Reads through the API rather than straight from Postgres, for the same
// reason the verification queue does: resolving what a report is ABOUT means
// reaching into three different tables and signing nothing-but-public image
// paths, and that logic belongs next to the one that files reports, not
// duplicated in a dashboard query.
// ============================================================================

import { requireStaff } from '../auth';

const API_URL = (process.env.SEAMFLOW_API_URL || 'https://seamflow-api.onrender.com').replace(
  /\/$/,
  '',
);

export type ReportTab = 'open' | 'actioned' | 'dismissed';
export const REPORT_TABS: { key: ReportTab; label: string }[] = [
  { key: 'open', label: 'Waiting on us' },
  { key: 'actioned', label: 'Acted on' },
  { key: 'dismissed', label: 'Left alone' },
];

/** Must match ReportReason in @seamflow/schemas. */
export const REASON_LABELS: Record<string, string> = {
  stolen_work: 'Not their work',
  sexual_content: 'Sexual or nude',
  violence: 'Violent or graphic',
  harassment: 'Harassment',
  scam: 'Scam or fraud',
  spam: 'Spam',
  other: 'Something else',
};

export const TARGET_LABELS: Record<string, string> = {
  design: 'Design',
  shop: 'Shop',
  message: 'Message',
};

export interface ReportRow {
  id: string;
  target: 'design' | 'shop' | 'message';
  targetId: string;
  reason: string;
  note: string | null;
  status: ReportTab;
  createdAt: string;
  reviewedAt: string | null;
  decisionNote: string | null;
  reporter: { userId: string; name: string | null; email: string | null };
  subject: {
    label: string;
    detail: string | null;
    imagePath: string | null;
    tailorId: string | null;
    ownerUserId: string | null;
  } | null;
}

export async function getReports(tab: ReportTab): Promise<ReportRow[]> {
  const staff = await requireStaff();
  const res = await fetch(`${API_URL}/admin/reports?status=${tab}`, {
    headers: { Authorization: `Bearer ${staff.accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as ReportRow[];
}

/** Sidebar badge: reports waiting on US. Never throws the shell down. */
export async function getReportsBadge(): Promise<number> {
  try {
    const staff = await requireStaff();
    const res = await fetch(`${API_URL}/admin/reports/count`, {
      headers: { Authorization: `Bearer ${staff.accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const body = (await res.json()) as { open?: number };
    return body.open ?? 0;
  } catch {
    return 0;
  }
}
