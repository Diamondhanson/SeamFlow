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

import { Alert, Linking } from 'react-native';

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

const MESSAGE_KEY: Record<PermissionKind, string> = {
  camera: 'misc.cameraAccessOff',
  photos: 'misc.photosAccessOff',
  contacts: 'misc.contactsAccessOff',
};

/**
 * Show a localized "permission needed" alert. When the OS won't let us ask
 * again, offer an "Open Settings" action so the user can recover.
 */
export function alertPermissionDenied(
  kind: PermissionKind,
  canAskAgain: boolean,
  t: Translate,
): void {
  const title = t('misc.permissionNeededTitle');
  const message = t(MESSAGE_KEY[kind]);
  if (canAskAgain) {
    Alert.alert(title, message, [{ text: t('common.ok') }]);
    return;
  }
  Alert.alert(title, message, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('misc.openSettings'), onPress: () => void Linking.openSettings() },
  ]);
}

/**
 * If `err` is a PermissionDeniedError, show the localized alert and return
 * `true` (handled). Otherwise return `false` so the caller falls back to its
 * generic error alert.
 */
export function alertIfPermissionDenied(err: unknown, t: Translate): boolean {
  if (err instanceof PermissionDeniedError) {
    alertPermissionDenied(err.kind, err.canAskAgain, t);
    return true;
  }
  return false;
}
