// ============================================================================
// Crossing between the two sides of SeamFlow.
//
// `(app)` (the designer) and `(client)` (the customer) are siblings in ONE
// root stack — see app/_layout.tsx. Nothing in the router separates them, so
// how you cross decides whether they stay separate afterwards.
//
// WHY `replace` ON ITS OWN WAS NOT ENOUGH
//
// `router.replace` swaps the TOP entry and leaves everything beneath it. Going
// client → designer from the hub replaced `/hub` with `/(app)` and left
// `/discover` sitting underneath, so a swipe back from the designer's home
// landed on the customer feed. It looked like a glitch; it was deterministic.
//
// So both directions pop the stack to its root FIRST, then replace what is
// left. The destination ends up as the only thing in the history, which is
// what makes "the only way back is through Settings" true rather than merely
// intended — and it is also what stops Android's Back button, which is a
// different input from the swipe and ignores `gestureEnabled`.
//
// The customer side always lands on Discover. It is the only screen there that
// means anything without context, and arriving anywhere else is how someone
// ends up on an empty Messages list wondering what happened.
// ============================================================================

import { router } from 'expo-router';

/** Clear the history, then land. */
function resetTo(href: string): void {
  // popToTop on the closest stack. Guarded because calling it with nothing to
  // dismiss warns, and crossing sides from a root screen is the common case.
  if (router.canDismiss()) router.dismissAll();
  router.replace(href as never);
}

/**
 * Go to the customer side.
 *
 * Always Discover — never the hub, never a remembered screen.
 */
export function goToClientSide(): void {
  resetTo('/(client)/discover');
}

/**
 * Go to the designer side.
 *
 * `hasShop` false means they have never set a shop up, so the home screen
 * would be a dashboard of nothing; send them to make one instead.
 */
export function goToDesignerSide(hasShop: boolean): void {
  resetTo(hasShop ? '/(app)' : '/(app)/profile-edit?onboarding=1');
}
