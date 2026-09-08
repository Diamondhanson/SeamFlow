// ============================================================================
// Role / mode resolution — which experience does this user get?
//
// The app carries two distinct experiences in one binary: the TAILOR interface
// (business CRM, midnight theme) and the CLIENT interface (discovery, rose
// theme). "Which one" is DERIVED, not a hard flag:
//   - you are a tailor if you have a shop profile (`me.tailor`);
//   - a user who is both keeps a remembered `preferred` choice so switching
//     modes sticks;
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
 * Decide the active mode from the loaded profile and the user's remembered
 * preference. `preferred` wins for dual users; otherwise presence of a tailor
 * shop decides; signed-out defaults to the client side.
 */
export function resolveMode(me: MeLike | null | undefined, preferred: Mode | null): Mode {
  if (!me) return 'client';
  if (preferred) return preferred;
  return me.tailor ? 'tailor' : 'client';
}
