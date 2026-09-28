import Link from 'next/link';
import { Empty, PageHeader, Tag } from '../../../components/primitives';
import { relative } from '../../../lib/format';
import { getQueue, QUEUE_TABS, type QueueRow, type QueueTab } from '../../../lib/queries/verification';
import { DecideButtons } from './decide-buttons';

export const dynamic = 'force-dynamic';

/**
 * The verification queue (appendix J.4).
 *
 * Each request opens to EVERYTHING at once — the photos full size, the phone
 * status, how long they have been on SeamFlow — because the decision is a
 * judgement about a person and a queue that makes you click three times to see
 * the evidence is a queue that gets rubber-stamped.
 *
 * Oldest first, deliberately: whoever has waited longest is owed an answer
 * first, and a newest-first queue quietly abandons the bottom of the list.
 */
export default async function VerificationQueue({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab: QueueTab = QUEUE_TABS.some((t) => t.key === sp.tab)
    ? (sp.tab as QueueTab)
    : 'pending';

  let rows: QueueRow[] = [];
  let error: string | null = null;
  try {
    rows = await getQueue(tab);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <>
      <PageHeader
        title="Verification"
        lede="Tailors asking us to confirm their shop is real. Oldest first: whoever has waited longest is owed an answer first."
        right={tab === 'pending' ? `${rows.length} waiting on us` : undefined}
      />

      <nav className="mb-5 flex flex-wrap border-b border-rule" aria-label="Request status">
        {QUEUE_TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={t.key === 'pending' ? '/verification' : `/verification?tab=${t.key}`}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                active
                  ? 'border-primary font-medium text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {error ? <p className="text-sm text-bad">{error}</p> : null}

      {!error && rows.length === 0 ? (
        <Empty>
          {tab === 'pending'
            ? 'Nothing waiting. Every request has been answered.'
            : 'Nothing here yet.'}
        </Empty>
      ) : null}

      <div className="space-y-5">
        {rows.map((r) => (
          <RequestCard key={r.id} row={r} />
        ))}
      </div>
    </>
  );
}

function RequestCard({ row }: { row: QueueRow }) {
  const t = row.tailor;
  return (
    <article className="border border-rule p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/tailors/${t.id}`}
            className="font-display text-lg text-ink hover:text-primary"
          >
            {t.businessName}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Asked {relative(row.submittedAt)}</span>
            {t.joinedAt ? <span>· On SeamFlow since {new Date(t.joinedAt).toLocaleDateString()}</span> : null}
            {t.city || t.countryCode ? (
              <span>· {[t.city, t.countryCode].filter(Boolean).join(', ')}</span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {/* The two requirements, stated rather than implied. A request can
                only exist with a confirmed phone, so a "not confirmed" here
                means something changed since and is worth seeing. */}
            <Tag>{t.phoneVerified ? 'Phone confirmed' : 'Phone NOT confirmed'}</Tag>
            {t.isVerified ? <Tag>Already verified</Tag> : null}
            {row.status !== 'pending' ? <Tag>{row.status}</Tag> : null}
          </div>
        </div>

        {row.status === 'pending' ? (
          <DecideButtons requestId={row.id} businessName={t.businessName} />
        ) : null}
      </div>

      {/* The evidence, full size and inline. This is the whole decision. */}
      {row.evidencePurged ? (
        <p className="mt-4 text-xs text-faint">
          The photos were deleted 90 days after this was decided. The decision and its note are
          kept.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {row.evidenceUrls.map((e) =>
            e.url ? (
              <a
                key={e.storagePath}
                href={e.url}
                target="_blank"
                rel="noreferrer"
                className="block"
                title="Open full size"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.url}
                  alt="Work submitted as evidence"
                  className="h-64 w-auto border border-rule object-cover"
                />
              </a>
            ) : (
              <p key={e.storagePath} className="text-xs text-bad">
                A photo could not be loaded.
              </p>
            ),
          )}
          {row.evidenceUrls.length === 0 ? (
            <p className="text-xs text-faint">No photos on this request.</p>
          ) : null}
        </div>
      )}

      {row.decisionNote ? (
        <p className="mt-4 text-xs text-muted">
          {row.status === 'approved' ? 'Noted on the badge' : 'They were told'}: “{row.decisionNote}”
        </p>
      ) : null}
    </article>
  );
}
