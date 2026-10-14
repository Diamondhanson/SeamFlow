// ============================================================================
// Role / mode resolution — which experience does this user get?
//
// The app carries two distinct experiences in one binary: the TAILOR interface
// (business CRM, midnight theme) and the CLIENT interface (discovery, rose
// theme). "Which one" is DERIVED, not a hard flag:
//   - you are a tailor if you have a shop profile (`me.tailor`);
//   - a user who is both can switch, and that switch holds for the session;
//   - signed out → the public client/discovery side.
//
// This mirrors the backend, which already lets one account act as both (it
// scopes by data ownership, not by a role column). See docs/single-app-merge-plan.md.
// ============================================================================

export type Mode = 'tailor' | 'client';

/** Minimal shape of the `/me` response this resolver needs. */
interface MeLike {
  tailor?: unknown | null;
}

/**
 * Decide the active mode from the loaded profile and any switch made during
 * this session.
 *
 * `preferred` is a choice made since the app opened, not a remembered one — see
 * the note in lib/mode.tsx. So on a cold start it is always null and the
 * question reduces to "do they have a shop?": someone who set one up came here
 * to run it, and that is where the app opens. Signed out, and anyone with no
 * shop, gets the customer side exactly as before.
 */
export function resolveMode(me: MeLike | null | undefined, preferred: Mode | null): Mode {
  if (!me) return 'client';
  if (preferred) return preferred;
  return me.tailor ? 'tailor' : 'client';
}
