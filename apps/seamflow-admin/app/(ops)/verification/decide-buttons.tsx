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
  social,
}: {
  requestId: string;
  businessName: string;
  /** Present when this request carries a social handle to check. */
  social?: { platform: string; handle: string; code: string } | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (approve: boolean, note: string | null, confirmSocial = false) =>
    start(async () => {
      setError(null);
      try {
        await decide(requestId, approve, note, confirmSocial);
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
            // Asked separately, because it is a separate question. Approving
            // the work photo says nothing about whether the code was in the
            // bio, and confirming a handle nobody found would put it on a
            // public storefront on our word alone.
            const confirmSocial = social
              ? confirm(
                  `Did you find ${social.code} in the bio of @${social.handle} on ${social.platform}?\n\nOK publishes the handle on their shop. Cancel leaves it off — everything else about this decision is unaffected.`,
                )
              : false;
            run(true, note?.trim() || null, confirmSocial);
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
              `Why can ${businessName} not be verified yet?\n\nThey see this sentence word for word and can send a new request, so tell them what to do differently.\n\nIf their social profile was private, say so — that is an instruction they can act on, not a verdict.`,
            );
            if (!note?.trim()) return;
            // A handle can be confirmed even on a decline: the two checks are
            // independent, and a tailor turned down over their photo should not
            // have to redo the bio code they already did.
            const confirmSocial = social
              ? confirm(
                  `Before declining: did you still find ${social.code} in the bio of @${social.handle}?\n\nOK publishes the handle anyway, so they need not redo it.`,
                )
              : false;
            run(false, note.trim(), confirmSocial);
          }}
        >
          Not yet
        </button>
      </div>
      {error ? <p className="mt-3 text-xs text-bad">{error}</p> : null}
    </div>
  );
}
