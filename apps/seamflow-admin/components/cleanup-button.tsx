'use client';

// ============================================================================
// The one interactive control in the app that changes anything.
//
// Two-step by design. A dashboard with no login should never destroy data on a
// single click, and the intermediate step is not a modal that says "Are you
// sure?" — it spells out the exact operation, and the rows it will touch are
// already listed on the page beside it. A confirmation you can answer without
// reading is not a confirmation.
// ============================================================================

import { useState, useTransition } from 'react';
import { runCleanup, type ActionResult } from '../lib/actions';

export function CleanupButton({
  op,
  label,
  description,
  affected,
}: {
  op: string;
  label: string;
  description: string;
  affected: number;
}) {
  const [armed, setArmed] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  if (affected === 0 && !result) {
    return <span className="text-2xs uppercase tracking-widest text-faint">nothing to do</span>;
  }

  if (result) {
    return (
      <div className={`text-xs ${result.ok ? 'text-good' : 'text-bad'}`}>
        <div>{result.message}</div>
        {result.details?.length ? (
          <ul className="mt-1 space-y-0.5 text-faint">
            {result.details.map((d) => (
              <li key={d}>· {d}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setArmed(false);
          }}
          className="mt-1 text-copper underline underline-offset-4"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="border border-rule bg-paper px-2.5 py-1 text-xs text-ink transition-colors hover:border-primary hover:text-primary"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="max-w-xs">
      <p className="mb-2 text-xs leading-snug text-muted">{description}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => setResult(await runCleanup(op)))}
          className="bg-primary px-2.5 py-1 text-xs text-white disabled:opacity-60"
        >
          {pending ? 'Working…' : `Yes, ${label.toLowerCase()}`}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="text-xs text-muted underline underline-offset-4 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
