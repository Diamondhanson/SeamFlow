'use client';

import { useState, useTransition } from 'react';
import {
  extendAllTrials,
  extendTrial,
  grantDays,
  recheckPayment,
  setEnforcement,
  setPrices,
  type PriceTable,
} from '../../../lib/subscription-actions';

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


// ── Prices ──────────────────────────────────────────────────────────────────

const PLAN_KEYS = ['monthly', 'quarterly', 'annual'] as const;
const PLAN_LABEL: Record<(typeof PLAN_KEYS)[number], string> = {
  monthly: '1 month',
  quarterly: '3 months',
  annual: '12 months',
};

/**
 * What everyone is charged.
 *
 * Until this existed, changing a price was a commit and two deploys, which is
 * why the live numbers spent a day as test values. The build's own prices stay
 * as the fallback, and "Reset to the build defaults" puts them back.
 *
 * A tailor mid-payment is unaffected: their amount was decided and recorded
 * when the attempt was created, and that is what the provider collects.
 */
export function PriceEditor({ prices, defaults }: { prices: PriceTable; defaults: PriceTable }) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<PriceTable>(prices);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changed = JSON.stringify(draft) !== JSON.stringify(prices);
  const onDefaults = JSON.stringify(prices) === JSON.stringify(defaults);

  const set = (cur: 'XAF' | 'USD', plan: (typeof PLAN_KEYS)[number], value: number) =>
    setDraft((d) => ({ ...d, [cur]: { ...d[cur], [plan]: value } }));

  const save = (next: PriceTable, question: string) => {
    if (!confirm(question)) return;
    start(async () => {
      setError(null);
      setDone(null);
      try {
        await setPrices(next);
        setDraft(next);
        setDone('Saved. Every new checkout uses these prices from now on.');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const summary = (t: PriceTable) =>
    `Cameroon ${PLAN_KEYS.map((k) => t.XAF[k].toLocaleString('en-GB')).join(' / ')} FCFA, elsewhere ${PLAN_KEYS.map((k) => `$${t.USD[k]}`).join(' / ')}`;

  return (
    <div>
      <div className="text-2xs uppercase tracking-widest text-faint">What tailors are charged</div>
      <p className="mt-1 text-xs text-muted">
        Cameroon pays in FCFA by mobile money. Everywhere else sees the dollar price and cards only.
        Changes apply to the next checkout, within seconds, with no deploy.
      </p>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {(['XAF', 'USD'] as const).map((cur) => (
          <div key={cur}>
            <div className="text-xs font-medium text-ink">
              {cur === 'XAF' ? 'Cameroon (FCFA)' : 'Everywhere else (USD)'}
            </div>
            <div className="mt-2 space-y-2">
              {PLAN_KEYS.map((plan) => (
                <label key={plan} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted">{PLAN_LABEL[plan]}</span>
                  <input
                    type="number"
                    min={cur === 'XAF' ? 100 : 1}
                    step={cur === 'XAF' ? 100 : 1}
                    value={draft[cur][plan]}
                    onChange={(e) => set(cur, plan, Math.floor(Number(e.target.value)))}
                    className="w-32 border border-rule bg-paper px-2.5 py-1.5 text-right text-sm tnum outline-none focus:border-primary"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        A tailor will see: <span className="text-ink">{summary(draft)}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !changed}
          onClick={() =>
            save(
              draft,
              `Change what every tailor pays?\n\nNow: ${summary(prices)}\nAfter: ${summary(draft)}`,
            )
          }
          className="border border-ink bg-ink px-3 py-1.5 text-sm text-paper hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Working…' : 'Save prices'}
        </button>
        {changed ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setDraft(prices)}
            className="text-xs text-muted underline decoration-rule underline-offset-4 hover:text-ink"
          >
            Discard changes
          </button>
        ) : null}
        {!onDefaults ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              save(defaults, `Put the prices back to this build's defaults?\n\nAfter: ${summary(defaults)}`)
            }
            className="text-xs text-muted underline decoration-rule underline-offset-4 hover:text-ink"
          >
            Reset to the build defaults ({summary(defaults)})
          </button>
        ) : (
          <span className="text-xs text-faint">These are the build defaults.</span>
        )}
      </div>

      {done ? <p className="mt-3 text-xs text-good">{done}</p> : null}
      {error ? <p className="mt-3 text-xs text-bad">{error}</p> : null}
    </div>
  );
}

/** Ask the provider about one pending payment, instead of waiting ten minutes. */
export function RecheckPayment({ paymentId }: { paymentId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              await recheckPayment(paymentId);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          })
        }
        className="border border-rule px-2 py-1 text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-60"
        title="Ask the provider whether this has been paid"
      >
        {pending ? 'Checking…' : 'Check now'}
      </button>
      {error ? <span className="ml-2 text-2xs text-bad">{error}</span> : null}
    </>
  );
}
