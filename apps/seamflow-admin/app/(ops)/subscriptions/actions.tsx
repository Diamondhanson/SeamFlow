'use client';

import { useState, useTransition } from 'react';
import { extendAllTrials, extendTrial, grantDays, setEnforcement } from '../../../lib/subscription-actions';

/**
 * The paywall switch.
 *
 * Off means trials run, the countdown shows and the upgrade screen works, but
 * nothing is ever refused — which is how the platform ships, because blocking
 * a tailor from a feature they cannot yet buy back is how you lose them.
 * Turning it on is the last step of connecting payments, and it takes effect
 * within seconds, everywhere, with no deploy.
 */
export function EnforcementSwitch({ enforced }: { enforced: boolean }) {
  const [pending, start] = useTransition();
  const [on, setOn] = useState(enforced);
  const [error, setError] = useState<string | null>(null);

  const flip = (next: boolean) => {
    const question = next
      ? 'Turn the Free limits ON? Tailors whose trial has ended will immediately lose premium features until they pay.'
      : 'Turn the Free limits OFF? Nothing will be blocked for anyone.';
    if (!confirm(question)) return;
    start(async () => {
      setError(null);
      try {
        await setEnforcement(next);
        setOn(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="text-2xs uppercase tracking-widest text-faint">Free limits &amp; premium gates</div>
        <div className="mt-1 text-sm">
          <span className={on ? 'font-medium text-bad' : 'font-medium text-good'}>
            {on ? 'ON — tailors on Free are being blocked' : 'OFF — nothing is blocked'}
          </span>
          <span className="block text-xs text-muted">
            {on
              ? 'Premium features and the caps are enforced. Turn this off if payments break.'
              : 'Turn this on once tailors can actually pay. It applies within seconds, no deploy.'}
          </span>
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => flip(!on)}
        className={`border px-4 py-2 text-sm font-medium disabled:opacity-60 ${
          on ? 'border-rule text-ink hover:border-ink' : 'border-ink bg-ink text-paper hover:opacity-90'
        }`}
      >
        {pending ? 'Working…' : on ? 'Turn limits off' : 'Turn limits on'}
      </button>
      {error ? <p className="w-full text-xs text-bad">{error}</p> : null}
    </div>
  );
}

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
