// ============================================================================
// Is the top status banner (offline / syncing) on screen — and who owns the
// status-bar inset while it is?
//
// The banner sits above the whole router. On iPhone it has to push its text
// below the clock and the Dynamic Island, so it takes the top inset for itself
// (components/OfflineBanner). But every <Screen> below it ALSO pads its top by
// that same inset, so with the banner up there was a dead strip, about the
// height of the status bar, between the banner and the page.
//
// So while the banner is visible the screens give their top inset up, and when
// it goes away they take it back. Nothing is ever padded twice, and nothing is
// ever left unpadded.
//
// iOS ONLY, deliberately. Android already lays this banner out the way it wants:
// edge-to-edge, text centred between the status-bar icons, content below it
// unchanged. Touching that was explicitly ruled out, so on Android none of this
// does anything — `BANNER_OWNS_TOP_INSET` is false and both consumers fall back
// to exactly the layout they had before.
// ============================================================================

import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/** Whether the banner pads for the status bar itself (and so screens must not). */
export const BANNER_OWNS_TOP_INSET = Platform.OS === 'ios';

let visible = false;
const listeners = new Set<() => void>();

/** Called by the banner whenever it appears or disappears. */
export function setStatusBannerVisible(next: boolean): void {
  if (visible === next) return;
  visible = next;
  listeners.forEach((l) => l());
}

export function subscribeStatusBanner(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStatusBannerVisible(): boolean {
  return visible;
}

/** True while the banner is showing — on any platform. */
export function useStatusBannerVisible(): boolean {
  return useSyncExternalStore(subscribeStatusBanner, getStatusBannerVisible, () => false);
}

/**
 * True when a <Screen> must NOT pad its own top, because the banner above it
 * already covers the status bar. Always false on Android.
 */
export function useBannerOwnsTopInset(): boolean {
  const shown = useStatusBannerVisible();
  return BANNER_OWNS_TOP_INSET && shown;
}
