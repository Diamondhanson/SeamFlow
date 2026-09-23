'use client';

import { useState, useTransition } from 'react';
import { extendAllTrials, extendTrial, grantDays } from '../../../lib/subscription-actions';

/**
 * The launch safety net: move every trial together. Behind a confirm, because
 * it touches every tailor on the platform at once.
 */
export function ExtendAllTrials() {
  const [pending, start] = useTransition();
  const [days, setDays] = useState(14);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label>
        <span className="mb-1 block text-2xs uppercase tracking-widest text-faint">Extend everyone&apos;s trial</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-20 border border-rule bg-paper px-2.5 py-1.5 text-sm tnum outline-none focus:border-primary"
          />
          <span className="text-sm text-muted">days</span>
          <button
            type="button"
            disabled={pending || days < 1}
            onClick={() => {
              if (!confirm(`Give every tailor ${days} more days of trial?`)) return;
              start(async () => {
                setError(null);
                setDone(null);
                try {
                  await extendAllTrials(days);
                  setDone(`Every trial moved by ${days} days.`);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              });
            }}
            className="border border-ink bg-ink px-3 py-1.5 text-sm text-paper hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Working…' : 'Apply to all'}
          </button>
        </div>
      </label>
      {done ? <p className="text-xs text-good">{done}</p> : null}
      {error ? <p className="text-xs text-bad">{error}</p> : null}
    </div>
  );
}

/** Per-tailor: a month of premium, or two more weeks of trial. */
export function RowActions({ tailorId, state }: { tailorId: string; state: string }) {
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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => grantDays(tailorId, 30, 'admin grant'))}
        className="border border-rule px-2 py-1 text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-60"
        title="Give 30 days of premium"
      >
        +30d premium
      </button>
      {state === 'trialing' ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => extendTrial(tailorId, 14))}
          className="border border-rule px-2 py-1 text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-60"
          title="Give 14 more days of trial"
        >
          +14d trial
        </button>
      ) : null}
      {error ? <span className="text-2xs text-bad">{error}</span> : null}
    </div>
  );
}
