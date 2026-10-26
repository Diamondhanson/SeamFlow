// ============================================================================
// Is the PIN screen showing right now?
//
// The tab bar (and the Ask pill) float above screen content at zIndex 20. The PIN
// screen has no way to outrank them: on the designer side it is an overlay with
// no zIndex, and on the customer side it replaces the hub's stack, which sits
// BELOW the bar's own layout. The result was a tab bar drawn straight over the
// keypad, hiding its bottom row and leaving navigation on show behind a lock.
//
// So whoever owns the PIN screen says so here, and the bars hide while it is up.
//
// A shared flag rather than reading the lock context directly, because the two
// sides each have their OWN lock provider, and the customer tab bar is mounted in
// a layout above the one that provides it — reading the context there throws.
// ============================================================================

import { useSyncExternalStore } from 'react';

let shown = false;
const listeners = new Set<() => void>();

/** Called by the layout that owns the PIN screen, whenever it appears or goes. */
export function setPinGateShown(next: boolean): void {
  if (shown === next) return;
  shown = next;
  listeners.forEach((l) => l());
}

export function subscribePinGate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPinGateShown(): boolean {
  return shown;
}

/** True while the PIN screen is up. Safe to call from any layout. */
export function usePinGateShown(): boolean {
  return useSyncExternalStore(subscribePinGate, getPinGateShown, () => false);
}
