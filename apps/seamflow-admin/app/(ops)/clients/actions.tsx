'use client';

// ============================================================================
// The things staff can do to a client account.
//
// Fewer than for a tailor, because a client has less that can go wrong: there
// is no badge to give and nothing of theirs on the public feed. What is left
// is the account itself — a lost phone, and a deletion that is counting down.
// ============================================================================

import { useState, useTransition } from 'react';
import { cancelDeletion, purgeNow, setSuspended, signOutEverywhere } from '../../../lib/people-actions';

const BTN = 'border border-rule px-2 py-1 text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-60';

export function AccountActions({
  userId,
  name,
  deletionRequestedAt,
  suspendedAt,
}: {
  userId: string;
  name: string;
  deletionRequestedAt: string | null;
  suspendedAt: string | null;
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

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        className={BTN}
        title="End every session. They can sign in again immediately."
        onClick={() => {
          if (!confirm(`Sign ${name} out of every device?\n\nThey can sign in again straight away.`)) return;
          run(() => signOutEverywhere(userId, '/clients'));
        }}
      >
        Sign out
      </button>
      <button
        type="button"
        disabled={pending}
        className={BTN}
        title="Stop them making changes. They can still read everything and reach support."
        onClick={() => {
          if (suspendedAt) {
            if (!confirm(`Let ${name} use the app normally again?`)) return;
            run(() => setSuspended(userId, false, null, '/clients'));
            return;
          }
          const reason = prompt(`Why is ${name} being put on hold?\n\nThey will see this sentence.`);
          if (!reason?.trim()) return;
          run(() => setSuspended(userId, true, reason.trim(), '/clients'));
        }}
      >
        {suspendedAt ? 'Let them back' : 'Put on hold'}
      </button>
      {deletionRequestedAt ? (
        <>
          <button
            type="button"
            disabled={pending}
            className={BTN}
            onClick={() => {
              if (!confirm(`Stop the deletion of ${name}'s account?`)) return;
              run(() => cancelDeletion(userId, '/clients'));
            }}
          >
            Keep account
          </button>
          <button
            type="button"
            disabled={pending}
            className="border border-bad px-2 py-1 text-xs text-bad hover:bg-bad hover:text-paper disabled:opacity-60"
            onClick={() => {
              if (
                !confirm(
                  `Delete ${name}'s account NOW instead of waiting?\n\nPermanent, and cannot be undone.`,
                )
              )
                return;
              run(async () => {
                const out = await purgeNow(userId, '/clients');
                if (!out.purged) throw new Error(`Not purged: ${out.reason}`);
              });
            }}
          >
            Delete now
          </button>
        </>
      ) : null}
      {error ? <span className="text-2xs text-bad">{error}</span> : null}
    </div>
  );
}
