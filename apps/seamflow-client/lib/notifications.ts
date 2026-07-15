// ============================================================================
// Push notifications — Phase 1.8
//
// Lifecycle on a physical device:
//   1. User signs in → ensurePushRegistered() is called.
//   2. If permissions weren't decided, prompt the OS for permission.
//   3. If granted, fetch the Expo push token via Notifications.getExpoPushTokenAsync
//      (using the projectId baked into app.json).
//   4. POST it to /me/device-tokens. The server upserts.
// On sign-out we DELETE /me/device-tokens/<token> to stop fan-out to the
// signed-out user.
//
// Foreground UX: by default Expo would suppress banner notifications while
// the app is foregrounded. We override that so the tailor sees the toast
// even if they're already in the app — useful for status confirmations.
//
// Tap UX: when the user taps a notification, the `data` payload tells us
// which order to navigate to. We resolve this lazily — the listener is
// installed at the app root so it survives tab switches.
// ============================================================================

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';
import type { DevicePlatform } from '@seamflow/schemas';
import { api } from './api';

// Lazy-load native modules so a stale dev APK (built before 1.8 added push)
// doesn't crash the whole app at module init. Each getter returns null when
// the native side is missing; the push code paths just become no-ops.
let DeviceMod: typeof import('expo-device') | null = null;
function getDevice(): typeof import('expo-device') | null {
  if (DeviceMod) return DeviceMod;
  try {
    DeviceMod = require('expo-device') as typeof import('expo-device');
    return DeviceMod;
  } catch {
    return null;
  }
}

let NotificationsMod: typeof ExpoNotifications | null = null;
let notificationsModResolved = false;
function getNotifications(): typeof ExpoNotifications | null {
  if (notificationsModResolved) return NotificationsMod;
  notificationsModResolved = true;
  try {
    NotificationsMod = require('expo-notifications') as typeof ExpoNotifications;
    return NotificationsMod;
  } catch {
    return null;
  }
}

let lastRegisteredToken: string | null = null;

// Show banner + play sound even when the app is foregrounded so the tailor
// gets confirmation for self-triggered events. Wrapped so a missing native
// module on a stale dev APK doesn't break module init.
{
  const N = getNotifications();
  if (N) {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
}

/**
 * Register the current device's Expo push token with the backend. Idempotent
 * — safe to call multiple times. Resolves to the token string on success,
 * `null` when push isn't available (simulator, denied permission, missing
 * project id, etc.). Never throws.
 */
export async function ensurePushRegistered(): Promise<string | null> {
  try {
    const Device = getDevice();
    // If expo-device's native module isn't in the APK (stale dev build),
    // err on the side of attempting registration anyway. The Expo push
    // server will reject if the bundle/device combo can't deliver.
    if (Device && !Device.isDevice) {
      // Push notifications only work on physical devices. Bail silently.
      return null;
    }

    const Notifications = getNotifications();
    if (!Notifications) {
      // expo-notifications native module not in this APK (stale dev build).
      // Skip silently — push is just disabled until rebuild.
      return null;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      // User said no. We won't re-prompt automatically — they can flip it
      // in OS settings or via a future in-app re-ask UI.
      return null;
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      // Without a projectId Expo can't issue a managed-credentials token.
      // Should never happen in a properly configured Expo project.
      return null;
    }

    const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResp.data;

    // Skip the round-trip if we registered this exact token this session.
    if (lastRegisteredToken === token) return token;

    await api.notifications.registerToken({
      expoToken: token,
      platform: currentPlatform(),
    });
    lastRegisteredToken = token;
    return token;
  } catch {
    // Network down on first run, permission revoked between checks, etc.
    // Never block the sign-in flow on push wiring.
    return null;
  }
}

/**
 * Detach this device on sign-out so the backend stops pushing to a token
 * that may end up belonging to a different user (rare but possible if two
 * tailors share a device).
 */
export async function unregisterPushOnSignOut(): Promise<void> {
  const token = lastRegisteredToken;
  if (!token) return;
  try {
    await api.notifications.removeToken(token);
  } catch {
    // Best-effort; the periodic invalid-token cleanup on the server side
    // will eventually prune dead tokens if delete fails.
  }
  lastRegisteredToken = null;
}

/**
 * Fire a backend round-trip test push. Use from a "Send test notification"
 * button in settings. Returns the number of devices the server tried to
 * push to — `0` means nothing happened (no tokens registered).
 */
export async function sendPushTest(): Promise<number> {
  const r = await api.notifications.pushTest({});
  return r.sentTo;
}

/**
 * Deep-link on notification tap. Order reminders and status-change pushes carry
 * `data.orderId`; tapping one opens that order. Handles both a warm tap (app
 * running / backgrounded) and a cold start (app launched by the tap). Mount
 * once, inside the authed router context.
 */
export function useNotificationTapHandler(): void {
  useEffect(() => {
    const N = getNotifications();
    if (!N) return;

    const routeTo = (data: unknown) => {
      const orderId = (data as { orderId?: unknown } | null | undefined)?.orderId;
      if (typeof orderId === 'string' && orderId) {
        router.push(`/(app)/orders/${orderId}`);
      }
    };

    // Cold start: app was opened by tapping a notification.
    N.getLastNotificationResponseAsync()
      .then((resp) => {
        if (resp) routeTo(resp.notification.request.content.data);
      })
      .catch(() => {});

    // Warm: tapped while the app was running or backgrounded.
    const sub = N.addNotificationResponseReceivedListener((resp) => {
      routeTo(resp.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);
}

function currentPlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

function resolveProjectId(): string | undefined {
  // EAS injects this into expoConfig.extra.eas.projectId — that's the
  // canonical place for managed-credential push.
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    // Older runtime config (Expo Go) carries it under a different key.
    Constants.easConfig?.projectId ??
    undefined
  );
}
