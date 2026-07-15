// ============================================================================
// Permission denial — shared handling.
//
// iOS and Android diverge sharply here: on iOS, once a user denies camera /
// photos / contacts, the OS never re-prompts — `requestPermissionsAsync()`
// just returns `denied` with `canAskAgain: false`. Without a route to Settings
// the user is permanently stuck. This module carries `canAskAgain` out of the
// native flow (via `PermissionDeniedError`) and turns it into a localized
// alert that offers "Open Settings" when re-prompting is no longer possible.
// `Linking.openSettings()` opens the app's settings page on both platforms.
// ============================================================================

import { Linking } from 'react-native';
import type { DialogApi } from './dialog';

/** What the app was trying to access when permission was denied. */
export type PermissionKind = 'camera' | 'photos' | 'contacts';

// Matches the shape of the app's `t()` — kept local so this module doesn't
// depend on the i18n provider types.
type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Thrown by the photo/permission flows when the OS denies access. Carries
 * `canAskAgain` so the UI can route the user to Settings instead of silently
 * failing (iOS never re-prompts once this is false).
 */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly kind: PermissionKind,
    public readonly canAskAgain: boolean,
  ) {
    super(`permission-denied:${kind}`);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Thrown by the photo flows when the device is offline. Photo uploads go
 * straight to storage (not through the offline mutation queue), so they can't
 * be deferred — we stop before opening the picker and tell the user to retry
 * when they're back online, rather than hanging on a failed upload.
 */
export class PhotoOfflineError extends Error {
  constructor() {
    super('photo-offline');
    this.name = 'PhotoOfflineError';
  }
}

/**
 * If `err` is a PhotoOfflineError, show a localized "you're offline" dialog and
 * return `true` (handled). Otherwise return `false`.
 */
export async function alertIfOffline(
  err: unknown,
  dialog: DialogApi,
  t: Translate,
): Promise<boolean> {
  if (err instanceof PhotoOfflineError) {
    await dialog.alert({
      title: t('misc.photosOfflineTitle'),
      message: t('misc.photosOfflineBody'),
      tone: 'warning',
    });
    return true;
  }
  return false;
}

const MESSAGE_KEY: Record<PermissionKind, string> = {
  camera: 'misc.cameraAccessOff',
  photos: 'misc.photosAccessOff',
  contacts: 'misc.contactsAccessOff',
};

/**
 * Show a localized "permission needed" dialog. When the OS won't let us ask
 * again, offer an "Open Settings" action so the user can recover.
 */
export async function alertPermissionDenied(
  kind: PermissionKind,
  canAskAgain: boolean,
  dialog: DialogApi,
  t: Translate,
): Promise<void> {
  const title = t('misc.permissionNeededTitle');
  const message = t(MESSAGE_KEY[kind]);
  if (canAskAgain) {
    await dialog.alert({ title, message, tone: 'warning' });
    return;
  }
  const go = await dialog.confirm({
    title,
    message,
    tone: 'warning',
    confirmLabel: t('misc.openSettings'),
  });
  if (go) void Linking.openSettings();
}

/**
 * If `err` is a PermissionDeniedError, show the localized dialog and return
 * `true` (handled). Otherwise return `false` so the caller falls back to its
 * generic error dialog.
 */
export async function alertIfPermissionDenied(
  err: unknown,
  dialog: DialogApi,
  t: Translate,
): Promise<boolean> {
  if (err instanceof PermissionDeniedError) {
    await alertPermissionDenied(err.kind, err.canAskAgain, dialog, t);
    return true;
  }
  return false;
}
