'use client';

import { useActionState } from 'react';
import { verifyMfa } from '../../lib/mfa-actions';

export function MfaForm({ factorId }: { factorId: string }) {
  const [state, action, pending] = useActionState(verifyMfa, { error: null });

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="factorId" value={factorId} />
      <label className="block">
        <span className="mb-1 block text-2xs uppercase tracking-widest text-faint">Code</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className="w-full border border-rule bg-paper px-2.5 py-2 text-lg tracking-[0.3em] outline-none focus:border-primary"
        />
      </label>
      {state.error ? <p className="text-xs text-bad">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Checking…' : 'Continue'}
      </button>
    </form>
  );
}
