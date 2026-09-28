'use client';

// ============================================================================
// Approve / decline, on one request.
//
// The decline prompt asks for the sentence the tailor will read, not a reason
// code — because that is literally what happens to it. A tailor turned down
// with "insufficient evidence" learns nothing and submits the same thing again;
// one told "we could not tell this photo was taken in your workshop, try one at
// the machine" fixes it in five minutes.
// ============================================================================

import { useState, useTransition } from 'react';
import { decide } from '../../../lib/verification-actions';

export function DecideButtons({
  requestId,
  businessName,
}: {
  requestId: string;
  businessName: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (approve: boolean, note: string | null) =>
    start(async () => {
      setError(null);
      try {
        await decide(requestId, approve, note);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          className="border border-good px-3 py-1.5 text-sm text-good hover:bg-good hover:text-paper disabled:opacity-60"
          onClick={() => {
            if (
              !confirm(
                `Verify ${businessName}?\n\nClients browsing Discover will see the mark, and tapping it will say SeamFlow confirmed their work.`,
              )
            )
              return;
            const note = prompt(
              `What did you check? (optional)\n\nThis shows on the mark clients can tap, so write it for them: "Photo at the machine, shop name on the note."`,
            );
            run(true, note?.trim() || null);
          }}
        >
          Verify
        </button>

        <button
          type="button"
          disabled={pending}
          className="border border-bad px-3 py-1.5 text-sm text-bad hover:bg-bad hover:text-paper disabled:opacity-60"
          onClick={() => {
            const note = prompt(
              `Why can ${businessName} not be verified yet?\n\nThey see this sentence word for word and can send a new request, so tell them what to do differently.`,
            );
            if (!note?.trim()) return;
            run(false, note.trim());
          }}
        >
          Not yet
        </button>
      </div>
      {error ? <p className="mt-3 text-xs text-bad">{error}</p> : null}
    </div>
  );
}
