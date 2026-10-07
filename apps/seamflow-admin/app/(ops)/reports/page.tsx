import Link from 'next/link';
import { Empty, PageHeader, Tag } from '../../../components/primitives';
import { relative } from '../../../lib/format';
import {
  getReports,
  REASON_LABELS,
  REPORT_TABS,
  TARGET_LABELS,
  type ReportRow,
  type ReportTab,
} from '../../../lib/queries/reports';
import { ReportActions } from './actions';

export const dynamic = 'force-dynamic';

/**
 * The moderation queue.
 *
 * SeamFlow publishes photographs to a feed anyone can read and lets strangers
 * message each other. This is the page that makes that defensible: somebody
 * says a thing is wrong, a person reads it, and the content goes or it stays.
 *
 * Oldest first, like the verification queue and for the same reason — whoever
 * reported first has waited longest, and a newest-first queue quietly
 * abandons the bottom of the list.
 *
 * Everything needed to judge is on the card: the picture, the words, who
 * complained and what they said. A reviewer who has to open three tabs per
 * report is a reviewer who starts rubber-stamping.
 */
export default async function ReportsQueue({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab: ReportTab = REPORT_TABS.some((t) => t.key === sp.tab)
    ? (sp.tab as ReportTab)
    : 'open';

  let rows: ReportRow[] = [];
  let error: string | null = null;
  try {
    rows = await getReports(tab);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  // Oldest first within the tab: the API returns newest first because that is
  // the right default for a log, and this is a queue, not a log.
  rows = [...rows].reverse();

  return (
    <>
      <PageHeader
        title="Reports"
        lede="What people have told us is wrong. Acting on one and closing it are separate steps, so the audit trail says what actually happened."
        right={`${rows.length} ${tab}`}
      />

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-rule pb-3">
        {REPORT_TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'open' ? '/reports' : `/reports?tab=${t.key}`}
            aria-current={t.key === tab ? 'page' : undefined}
            className={`border px-3 py-1.5 text-xs font-medium ${
              t.key === tab ? 'border-ink bg-ink text-paper' : 'border-rule text-muted hover:border-ink'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-6 text-sm text-bad">Could not load the queue: {error}</p>
      ) : rows.length === 0 ? (
        <Empty>Nothing here.</Empty>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="border border-rule bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Tag>{TARGET_LABELS[r.target] ?? r.target}</Tag>
                <Tag>{REASON_LABELS[r.reason] ?? r.reason}</Tag>
                <span className="text-xs text-faint">{relative(r.createdAt)}</span>
              </div>

              <div className="mt-3 flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs, no loader configured */}
                {r.subject?.imagePath ? (
                  <img
                    src={r.subject.imagePath}
                    alt=""
                    className="h-24 w-24 shrink-0 border border-rule object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <div className="font-medium text-ink">
                    {r.subject ? r.subject.label : 'Already deleted'}
                  </div>
                  {r.subject?.detail ? (
                    <p className="mt-1 line-clamp-3 text-sm text-muted">{r.subject.detail}</p>
                  ) : null}
                  {r.subject?.tailorId ? (
                    <Link
                      href={`/tailors/${r.subject.tailorId}`}
                      className="mt-1 inline-block text-xs text-muted underline hover:text-ink"
                    >
                      Open the shop
                    </Link>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 text-xs text-faint">
                Reported by {r.reporter.name || r.reporter.email || 'someone'}
              </p>
              {r.note ? <p className="mt-1 text-sm text-ink">“{r.note}”</p> : null}

              {r.status === 'open' ? (
                <ReportActions
                  reportId={r.id}
                  target={r.target}
                  targetId={r.targetId}
                  ownerUserId={r.subject?.ownerUserId ?? null}
                />
              ) : (
                <p className="mt-3 text-xs text-muted">
                  {r.status === 'actioned' ? 'Acted on' : 'Left alone'}
                  {r.reviewedAt ? ` ${relative(r.reviewedAt)}` : ''}
                  {r.decisionNote ? ` — ${r.decisionNote}` : ''}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
