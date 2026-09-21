// ============================================================================
// Supabase auth for the dashboard — sign-in ONLY.
//
// The dashboard still reads data through its own Postgres connection (lib/db).
// Supabase here answers one question: who is this browser? The answer is then
// checked against the `staff` table (lib/auth) before anything renders.
//
// Uses the anon key: it can do nothing but sign a person in. Nothing with
// the service role ever reaches this app.
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — the same values the app uses as EXPO_PUBLIC_SUPABASE_*.',
    );
  }
  return { url, anonKey };
}

/** Server-side client bound to this request's cookies. */
export async function supabaseServer() {
  const { url, anonKey } = supabaseEnv();
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Server components may not set cookies; middleware refreshes them, so
        // a failed write here is harmless and expected.
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* read-only context */
        }
      },
    },
  });
}
