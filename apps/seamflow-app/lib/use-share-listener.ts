// ============================================================================
// Native side of "share a photo INTO SeamFlow".
//
// Android only. The intent filters in app.json make us appear in the OS share
// sheet; expo-share-intent's native module reads Intent.EXTRA_STREAM, which is
// where the actual image lives and which expo-linking does not surface.
//
// Requires a native build. In Expo Go, or on the web build, the module simply
// isn't there — the require fails, this becomes a no-op, and the web transport
// in share-inbox.ts takes over instead.
//
// iOS is deliberately not wired: a share extension is a separate sandboxed
// binary that needs an App Group entitlement, which needs the Apple Developer
// Program. See docs/ROADMAP.md.
// ============================================================================

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { stashNativeShare, withDimensions } from './share-inbox';

/**
 * Lazy require, mirroring lib/notifications.ts.
 *
 * A dev client built before this package was added would otherwise crash at
 * module init — the whole app, not just this feature — because the native side
 * simply isn't in the binary.
 */
function getShareIntent(): typeof import('expo-share-intent') | null {
  if (Platform.OS !== 'android') return null;
  try {
    return require('expo-share-intent') as typeof import('expo-share-intent');
  } catch {
    return null;
  }
}

/**
 * Watch for an incoming share and route to the receive screen.
 *
 * Mount once, inside the authed layout — sharing into an app you're signed out
 * of would land on the sign-in screen with photos stranded behind it.
 */
export function useShareListener(): void {
  useEffect(() => {
    const native = getShareIntent()?.ShareIntentModule;
    if (!native) return;

    let cancelled = false;

    const handle = async (payload: unknown) => {
      const files =
        (payload as { files?: { path?: string; width?: number | null; height?: number | null }[] })
          ?.files ?? [];
      const images = await Promise.all(
        files
          .filter((f) => !!f.path)
          .map((f) => withDimensions(f.path!, f.width ?? null, f.height ?? null)),
      );
      if (cancelled || images.length === 0) return;
      stashNativeShare(images);
      router.push('/(app)/share-receive');
    };

    const sub = native.addListener('onChange', (event) => {
      void handle(event);
    });

    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, []);
}
