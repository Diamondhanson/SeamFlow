// ============================================================================
// Platform capabilities — one place that answers "can we do this here?".
//
// The app runs natively (iOS/Android) AND in the browser (Expo web build, see
// docs/web-app-plan.md). Several features lean on native modules that simply
// don't exist on the web. Rather than sprinkle `Platform.OS === 'web'` checks
// through screens, ask these flags — so a screen reads as
// "if (canPickContacts) show the button" and the reason lives here.
//
// Rule of thumb: features degrade or hide on web, they never crash.
// ============================================================================

import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isNative = !isWeb;

/** Device address book (expo-contacts) — native only. */
export const canPickContacts = isNative;

/** Native push notifications (expo-notifications) — native only. Web push is
 *  a separate mechanism and unreliable in iOS PWAs, so we don't promise it. */
export const canUsePushNotifications = isNative;

/** PDF generation + share sheet (expo-print / expo-sharing). On web we fall
 *  back to the browser's own print-to-PDF. */
export const canGenerateNativePdf = isNative;

/** Hardware-backed secret storage (expo-secure-store). On web the session
 *  falls back to localStorage — weaker at rest; see lib/supabase.ts. */
export const hasSecureStorage = isNative;

/** The native spinner/calendar date picker. Web uses an <input type="date">. */
export const hasNativeDatePicker = isNative;

/** On-device speech recognition. The community module targets native; browser
 *  support is patchy (Safari especially), so treat web as unavailable. */
export const canUseVoiceInput = isNative;

/** Live camera capture. On web expo-image-picker becomes a file input — you
 *  can still UPLOAD a photo, which is why the measurement scan still works. */
export const canCaptureFromCamera = isNative;
