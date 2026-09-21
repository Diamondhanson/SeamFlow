// ============================================================================
// Two guards, protecting two different things.
//
//   assertSignInConfigured() — the app must not run hosted without a login
//   assertSafeMutation()     — the app must not be able to perform an unsafe write
//
// Both are structural rather than advisory, because this dashboard talks to
// the production database. Advisory rules ("we agreed not to add delete
// endpoints") survive exactly until the day someone is in a hurry.
//
// History: until plan step 2 this refused to run in production at all,
// because there was no login. Now every page and action passes through
// requireStaff() (lib/auth) and the middleware, so hosting is allowed — but
// ONLY with sign-in configured. A deploy missing the Supabase settings would
// otherwise serve the whole platform to anyone with the URL.
// ============================================================================

export function assertSignInConfigured(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  throw new Error(
    [
      'seamflow-admin refuses to run in production without sign-in configured.',
      '',
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (the same',
      'values the app uses as EXPO_PUBLIC_SUPABASE_*). Every page is staff-only.',
    ].join('\n'),
  );
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * The complete list of things this dashboard may change. Nothing else.
 *
 * Each entry exists because a health check found real broken rows and someone
 * has to fix them; this is a cleanup tool, not an admin console. The scope was
 * chosen deliberately: no editing orders, no deleting tailors, no changing
 * anyone's status. A page with no login that can delete a tailor's order
 * history is one stray port-forward away from a very bad afternoon.
 *
 * Support replies are NOT here: they go through the API as the signed-in
 * staff member (lib/support-actions), which owns that logic and the push.
 */
export const SAFE_MUTATIONS = {
  'clients.merge-duplicates':
    'Merge clients that share a phone number under one tailor, keeping the oldest row and repointing everything at it.',
  'clients.clear-placeholders':
    "Replace literal '—' placeholder phone/address values with NULL so they stop rendering as real data.",
  'invoices.delete-empty-drafts':
    'Delete DRAFT invoices whose total is zero and which have no payments against them.',
} as const;

export type SafeMutation = keyof typeof SAFE_MUTATIONS;

/**
 * Called at the top of every write. An operation not on the list above cannot
 * run, even if someone wires a form to it — the allowlist is the authority,
 * not the presence of a function.
 */
export function assertSafeMutation(op: string): asserts op is SafeMutation {
  assertSignInConfigured();
  if (!(op in SAFE_MUTATIONS)) {
    throw new Error(
      `Refusing to run "${op}" — it is not in the safe-mutation allowlist.\n` +
        `Allowed: ${Object.keys(SAFE_MUTATIONS).join(', ')}`,
    );
  }
}
