// ============================================================================
// Native side of "share a photo INTO SeamFlow".
//
// Android only. The intent filters in app.json make us appear in the OS share
// sheet; expo-share-intent's native module reads Intent.EXTRA_STREAM, which is
// where the actual image lives and which expo-linking does not surface.
//
// iOS is deliberately not wired: a share extension is a separate sandboxed
// binary that needs an App Group entitlement, which needs the Apple Developer
// Program. See docs/ROADMAP.md.
//
// ---------------------------------------------------------------------------
// WHY THIS IS BUILT ON THE LIBRARY'S OWN HOOK
//
// The first version hand-rolled a listener and shipped broken in three
// independent ways, each enough on its own to make sharing do nothing at all:
//
//   1. IT NEVER ASKED. The native module holds the intent and emits `onChange`
//      only when you PULL it with `getShareIntent("")`. We only ever
//      subscribed. On a cold start — the normal case, since you are in the
//      gallery and the app is not running — nothing pulled, no event fired,
//      and the app simply opened on the home screen.
//   2. WRONG PAYLOAD SHAPE. The event is `{ value }`, not the intent itself.
//   3. WRONG FILE FIELD. Android files arrive as `filePath` (needing a
//      `file://` prefix) or `contentUri`. We filtered on `path`, which exists
//      only on iOS — so the list was always empty even when an event did fire.
//
// `useShareIntent` already handles the pull, the re-pull when the app returns
// to the foreground, the platform-specific file mapping, and clearing the
// intent so it is not replayed. Reimplementing that is exactly how the above
// happened, so this file no longer tries.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router, usePathname, useRootNavigationState } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { stashNativeShare, withDimensions } from './share-inbox';

/** Where a share lands. Compared against the router's pathname. */
const RECEIVE_ROUTE = '/(app)/share-receive';

/**
 * Give up after this many attempts rather than fight the router forever.
 *
 * Each attempt is triggered by the pathname actually changing, so this is a
 * ceiling on "something else keeps navigating", not a busy loop.
 */
const MAX_ROUTE_ATTEMPTS = 12;

/** Gap between retries. 12 × 500ms ≈ 6s, comfortably past the slowest boot. */
const RETRY_MS = 500;

/**
 * Watch for an incoming share and route to the receive screen.
 *
 * Mount once, inside the authed layout — sharing into an app you're signed out
 * of would land on the sign-in screen with photos stranded behind it.
 */
export function useShareListener(): void {
  const { shareIntent, resetShareIntent } = useShareIntent({
    // Android only. iOS needs a share extension (Apple Developer Program), and
    // the web PWA uses a completely different transport — the manifest's
    // share_target POSTs to the service worker, which stashes the files and
    // redirects. Both converge on the same receive screen.
    //
    // Passing an options object REPLACES the library's defaults rather than
    // merging with them, so `disabled` has to be stated explicitly here; the
    // default that switches web off does not apply once any option is passed.
    disabled: Platform.OS !== 'android',
    // The intent must survive the app going to the background. Android may
    // background us while the OS asks for a storage permission, and the
    // default behaviour would throw the shared photos away mid-prompt.
    resetOnBackground: false,
  });

  // Guards against routing one delivery twice — the effect can re-run between
  // handing the images over and the cleared state arriving.
  //
  // A flag rather than a key derived from the file paths: keying on contents
  // looks tidier and quietly breaks the case where a tailor shares the SAME
  // photo again on purpose. The flag releases when the intent goes empty,
  // which reset() guarantees, so a genuine second share always gets through.
  const routing = useRef(false);

  /** Set once the images are stashed; cleared once the receive screen is up. */
  const [wantsReceive, setWantsReceive] = useState(false);

  useEffect(() => {
    const files = shareIntent?.files ?? [];
    if (files.length === 0) {
      routing.current = false;
      return;
    }
    if (routing.current) return;
    routing.current = true;

    let cancelled = false;

    void (async () => {
      const images = await Promise.all(
        files
          .filter((f) => !!f.path)
          .map((f) => withDimensions(f.path, f.width ?? null, f.height ?? null)),
      );
      if (cancelled || images.length === 0) {
        routing.current = false;
        return;
      }

      console.log(`[share] received ${images.length} image(s) from the OS`);
      stashNativeShare(images);
      // Clear before navigating: the receive screen holds the images now, and
      // leaving the intent in place would re-deliver it on the next foreground.
      resetShareIntent();
      // Ask to be routed. The navigation itself is handled below, because on a
      // cold start it cannot simply be done here — see the note there.
      setWantsReceive(true);
    })();

    return () => {
      cancelled = true;
    };
    // `resetShareIntent` is recreated every render by the library; depending on
    // it would re-run this effect constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareIntent]);

  // -------------------------------------------------------------------------
  // Getting to the receive screen, which on a cold start is a race we lose.
  //
  // Sharing from the gallery launches the app from scratch, and THREE separate
  // gates stand between launch and a navigator that can accept a push:
  //
  //   1. the auth check in (app)/_layout renders a spinner while it resolves
  //   2. app/index.tsx then redirects to /(app) once a session is confirmed
  //   3. GatedStack holds back the <Stack> ITSELF until the PIN check is ready
  //
  // The third is the awkward one: this hook runs inside GatedStack, so it is
  // alive and pulling the intent while the navigator it wants to push onto does
  // not yet exist. A single router.push() in that window goes nowhere at all,
  // silently — which is precisely the reported symptom, an app that opens and
  // sits there.
  //
  // So the arrival is retried rather than assumed: on every route change, and
  // on a slow tick for the case where nothing changes because the navigator
  // simply was not mounted yet. It stops the instant it arrives, and it is
  // bounded, so the worst case is a few wasted no-ops rather than a loop.
  // -------------------------------------------------------------------------
  const pathname = usePathname();
  const navReady = !!useRootNavigationState()?.key;
  const attempts = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!wantsReceive || !navReady) return;

    if (pathname.endsWith('share-receive')) {
      console.log('[share] arrived on the receive screen');
      setWantsReceive(false);
      attempts.current = 0;
      routing.current = false;
      return;
    }

    if (attempts.current >= MAX_ROUTE_ATTEMPTS) {
      console.warn(`[share] gave up routing after ${MAX_ROUTE_ATTEMPTS} attempts`);
      setWantsReceive(false);
      routing.current = false;
      return;
    }

    attempts.current += 1;
    console.log(`[share] routing attempt ${attempts.current} from "${pathname}"`);
    router.push(RECEIVE_ROUTE);

    // Nudge this effect again shortly. A route change alone is not enough to
    // rely on: if the push landed on a navigator that was not mounted, nothing
    // changes and nothing would ever retry.
    const timer = setTimeout(() => setTick((n) => n + 1), RETRY_MS);
    return () => clearTimeout(timer);
  }, [wantsReceive, navReady, pathname, tick]);
}
