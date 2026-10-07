'use client';

// ============================================================================
// What a reviewer can do with one report.
//
// Four buttons, and the two destructive ones ask for a sentence — because that
// sentence is what the tailor actually reads when their work disappears or
// their account stops working. "Policy violation" teaches nobody anything;
// "this photograph belongs to another shop" ends the argument.
// ============================================================================

import { useState, useTransition } from 'react';
import { decideReport, suspendAndClose, takedownAndClose } from '../../../lib/report-actions';

export function ReportActions({
  reportId,
  target,
  targetId,
  ownerUserId,
}: {
  reportId: string;
  target: 'design' | 'shop' | 'message';
  targetId: string;
  ownerUserId: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

  const ask = (question: string): string | null => {
    const reason = window.prompt(question);
    return reason && reason.trim() ? reason.trim() : null;
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {target === 'design' ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const reason = ask('What should the tailor be told? They read this word for word.');
            if (reason) run(() => takedownAndClose(reportId, targetId, reason));
          }}
          className="border border-ink bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-60"
        >
          Take it down &amp; close
        </button>
      ) : null}

      {ownerUserId ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const reason = ask('Why is this account being suspended? They read this word for word.');
            if (reason) run(() => suspendAndClose(reportId, ownerUserId, reason));
          }}
          className="border border-rule px-3 py-1.5 text-xs font-medium text-bad hover:border-bad disabled:opacity-60"
        >
          Suspend the account &amp; close
        </button>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => decideReport(reportId, 'actioned'))}
        className="border border-rule px-3 py-1.5 text-xs font-medium hover:border-ink disabled:opacity-60"
      >
        Handled elsewhere
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => decideReport(reportId, 'dismissed'))}
        className="border border-rule px-3 py-1.5 text-xs font-medium text-muted hover:border-ink disabled:opacity-60"
      >
        Leave it alone
      </button>

      {pending ? <span className="text-xs text-muted">Working…</span> : null}
      {error ? <p className="w-full text-xs text-bad">{error}</p> : null}
    </div>
  );
}
