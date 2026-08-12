// ============================================================================
// Two guards, protecting two different things.
//
//   assertLocalOnly()     — the app must not be reachable from the internet
//   assertSafeMutation()  — the app must not be able to perform an unsafe write
//
// Both are structural rather than advisory, because this dashboard has NO
// AUTHENTICATION and talks to the production database. Advisory rules ("we
// agreed not to add delete endpoints") survive exactly until the day someone is
// in a hurry.
// ============================================================================

/** Escape hatch for a deliberately-hosted internal deploy behind a VPN. */
const OVERRIDE = 'SEAMFLOW_ADMIN_ALLOW_UNSAFE_HOSTING';

export function assertLocalOnly(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env[OVERRIDE] === 'i-understand-this-exposes-everything') return;

  throw new Error(
    [
      'seamflow-admin refuses to run in production.',
      '',
      "It has no authentication and exposes every tailor's client list,",
      'phone numbers and revenue. Run it locally (npm run dev) instead.',
      '',
      `To host it anyway, set ${OVERRIDE}=i-understand-this-exposes-everything`,
      'AND put it behind a VPN or an authenticating proxy first.',
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
 * Adding a case here is the moment to stop and ask whether the dashboard has
 * outgrown "no authentication for now" — see ROADMAP 3.9 (role-gated admin,
 * 2FA, audited actions), which is what this becomes when it grows up.
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
  assertLocalOnly();
  if (!(op in SAFE_MUTATIONS)) {
    throw new Error(
      `Refusing to run "${op}" — it is not in the safe-mutation allowlist.\n` +
        `Allowed: ${Object.keys(SAFE_MUTATIONS).join(', ')}`,
    );
  }
}
