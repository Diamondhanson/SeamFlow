// ============================================================================
// Inbound sharing — "share a photo INTO SeamFlow".
//
// The OS share sheet hands us images from anywhere on the device: the gallery,
// WhatsApp, a browser's long-press → share. This module normalises the two very
// different delivery mechanisms into one shape the receive screen can render.
//
//   native (Android)  expo-share-intent reads Intent.EXTRA_STREAM. The intent
//                     filter in app.json only makes us APPEAR in the sheet —
//                     the payload lives in an extra that expo-linking does not
//                     surface, so the native module is what actually delivers
//                     it. Requires a native build; not Expo Go, not OTA.
//
//   web (PWA)         the manifest's `share_target` POSTs a multipart form to
//                     /share-target. A static SPA can't receive a POST, so the
//                     service worker intercepts it, stashes the files, and
//                     redirects. See public/sw.js.
//
// NOT wired for iOS. A share extension is a separate sandboxed binary that
// hands data over through an App Group entitlement, and that needs the Apple
// Developer Program. See docs/ROADMAP.md.
// ============================================================================

import { Image, Platform } from 'react-native';

/** One shared image, in the shape the upload pipeline already expects. */
export interface SharedImage {
  uri: string;
  width: number;
  height: number;
}

/** Where a shared image can land. Mirrors the upload functions we already have. */
export type ShareDestination = 'design' | 'work' | 'fabric' | 'order';

const LAST_DESTINATION_KEY = 'seamflow.share.lastDestination';

/**
 * Resolve missing dimensions.
 *
 * Android's ACTION_SEND often carries no width/height — the sender isn't
 * obliged to provide them — and the compression step needs both to decide
 * whether to resize. Measuring the image ourselves is cheaper than shipping a
 * wrong guess into the resize maths.
 */
export async function withDimensions(
  uri: string,
  width: number | null,
  height: number | null,
): Promise<SharedImage> {
  if (width && height) return { uri, width, height };
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (w, h) => resolve({ uri, width: w, height: h }),
      // A failure here shouldn't drop the photo. 0x0 simply means "never
      // resize", so the original goes up untouched.
      () => resolve({ uri, width: 0, height: 0 }),
    );
  });
}

/** Remember the last destination, so the common case is one tap next time. */
export async function rememberDestination(d: ShareDestination): Promise<void> {
  try {
    const AsyncStorage = (
      await import('@react-native-async-storage/async-storage')
    ).default;
    await AsyncStorage.setItem(LAST_DESTINATION_KEY, d);
  } catch {
    // A preference that fails to save is not worth failing an upload over.
  }
}

export async function lastDestination(): Promise<ShareDestination | null> {
  try {
    const AsyncStorage = (
      await import('@react-native-async-storage/async-storage')
    ).default;
    const v = await AsyncStorage.getItem(LAST_DESTINATION_KEY);
    return v === 'design' || v === 'work' || v === 'fabric' || v === 'order'
      ? v
      : null;
  } catch {
    return null;
  }
}

// ── The handoff ─────────────────────────────────────────────────────────────
//
// Both transports are DESTRUCTIVE reads: taking the payload clears it. A share
// is a one-shot event, and a tailor who reopens the app later must not find the
// same photos queued again.

/** Filled by the native listener at the app root before it routes here. */
let pendingNative: SharedImage[] = [];

/** Hand the native payload over to the receive screen. */
export function stashNativeShare(images: SharedImage[]): void {
  pendingNative = images;
}

/**
 * Ask the service worker for whatever the OS share sheet just POSTed.
 *
 * The manifest points at POST /share-target, which a static SPA cannot answer,
 * so sw.js intercepts it, keeps the files and redirects here. This is the app
 * collecting them. Blobs become object URLs, which the upload pipeline reads
 * exactly like a picked file.
 */
async function takeWebShare(): Promise<SharedImage[]> {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return [];

  const files: File[] = await new Promise((resolve) => {
    const channel = new MessageChannel();
    // Don't hang the screen if the worker is wedged or a stale version is
    // controlling the page and doesn't know this message.
    const timer = setTimeout(() => resolve([]), 3000);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      resolve(e.data?.files ?? []);
    };
    sw.postMessage({ type: 'seamflow:take-shared-images' }, [channel.port2]);
  });

  return Promise.all(
    files.map((f) => withDimensions(URL.createObjectURL(f), null, null)),
  );
}

/** Collect and clear whatever was shared, whichever transport delivered it. */
export async function takeSharedImages(): Promise<SharedImage[]> {
  if (Platform.OS === 'web') return takeWebShare();
  const taken = pendingNative;
  pendingNative = [];
  return taken;
}
