'use client';

// ============================================================================
// The things staff can do to one tailor.
//
// Every button here is reversible or is carrying out a decision the person
// already made. Nothing deletes their work, and nothing starts a deletion they
// did not ask for — the API refuses that, and the UI does not offer it.
//
// Each action confirms first, in words that say what will actually happen to a
// person, not "are you sure?".
// ============================================================================

import { useState, useTransition } from 'react';
import {
  cancelDeletion,
  purgeNow,
  setVerified,
  signOutEverywhere,
} from '../../../../lib/people-actions';

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const run = (fn: () => Promise<void>, success?: string) =>
    start(async () => {
      setError(null);
      setDone(null);
      try {
        await fn();
        if (success) setDone(success);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  return { pending, error, done, run };
}

const BTN = 'border border-rule px-3 py-1.5 text-sm text-muted hover:border-ink hover:text-ink disabled:opacity-60';

export function TailorActions({
  tailorId,
  userId,
  businessName,
  isVerified,
  deletionRequestedAt,
  deletionScheduledFor,
}: {
  tailorId: string;
  userId: string;
  businessName: string;
  isVerified: boolean;
  deletionRequestedAt: string | null;
  deletionScheduledFor: string | null;
}) {
  const { pending, error, done, run } = useAction();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          className={BTN}
          onClick={() => {
            const next = !isVerified;
            if (
              !confirm(
                next
                  ? `Give ${businessName} the verified badge? Clients browsing the feed will see it.`
                  : `Take the verified badge away from ${businessName}?`,
              )
            )
              return;
            run(() => setVerified(tailorId, next));
          }}
        >
          {isVerified ? 'Remove verified badge' : 'Mark as verified'}
        </button>

        <button
          type="button"
          disabled={pending}
          className={BTN}
          onClick={() => {
            if (
              !confirm(
                `Sign ${businessName} out of every device?\n\nThey are not locked out — they can sign in again straight away. Use this for a lost or stolen phone.`,
              )
            )
              return;
            run(() => signOutEverywhere(userId, `/tailors/${tailorId}`), 'Signed out everywhere.');
          }}
        >
          Sign out everywhere
        </button>

        {deletionRequestedAt ? (
          <>
            <button
              type="button"
              disabled={pending}
              className={BTN}
              onClick={() => {
                if (!confirm(`Stop the deletion of ${businessName}'s account? Everything stays as it is.`)) return;
                run(
                  () => cancelDeletion(userId, `/tailors/${tailorId}`),
                  'Deletion cancelled. The account stays.',
                );
              }}
            >
              Cancel their deletion
            </button>
            <button
              type="button"
              disabled={pending}
              className="border border-bad px-3 py-1.5 text-sm text-bad hover:bg-bad hover:text-paper disabled:opacity-60"
              onClick={() => {
                if (
                  !confirm(
                    `Delete ${businessName}'s account NOW instead of waiting?\n\nThis is permanent and cannot be undone. Only do this because they asked for it to be done sooner.`,
                  )
                )
                  return;
                run(async () => {
                  const out = await purgeNow(userId, `/tailors/${tailorId}`);
                  if (!out.purged) throw new Error(`Not purged: ${out.reason}`);
                }, 'Account purged.');
              }}
            >
              Delete now
            </button>
          </>
        ) : null}
      </div>

      {deletionRequestedAt ? (
        <p className="mt-3 text-xs text-bad">
          This person asked to be deleted
          {deletionScheduledFor
            ? `, and it happens on ${new Date(deletionScheduledFor).toLocaleDateString()}`
            : ''}
          .
        </p>
      ) : null}
      {done ? <p className="mt-3 text-xs text-good">{done}</p> : null}
      {error ? <p className="mt-3 text-xs text-bad">{error}</p> : null}
    </div>
  );
}
