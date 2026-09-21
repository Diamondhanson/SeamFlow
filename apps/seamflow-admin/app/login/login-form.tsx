'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useActionState, useState } from 'react';
import { signInWithPassword } from '../../lib/session-actions';

export function LoginForm({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) {
  const [state, action, pending] = useActionState(signInWithPassword, { error: null });
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const google = async () => {
    setGoogleBusy(true);
    setGoogleError(null);
    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setGoogleError(error.message);
      setGoogleBusy(false);
    }
  };

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => void google()}
        disabled={googleBusy}
        className="w-full border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {googleBusy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      {googleError ? <p className="mt-2 text-xs text-bad">{googleError}</p> : null}

      <div className="my-7 flex items-center gap-3 text-2xs uppercase tracking-widest text-faint">
        <span className="h-px flex-1 bg-rule" />
        or
        <span className="h-px flex-1 bg-rule" />
      </div>

      <form action={action} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-2xs uppercase tracking-widest text-faint">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full border border-rule bg-paper px-2.5 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-2xs uppercase tracking-widest text-faint">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full border border-rule bg-paper px-2.5 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        {state.error ? <p className="text-xs text-bad">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full border border-rule px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign in with password'}
        </button>
      </form>
    </div>
  );
}
