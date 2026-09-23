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
 *  falls back to localStorage — weaker at rest; see lib/supabase.ts.
 *
 *  Note this is a hard unavailability, not a soft one: expo-secure-store ships
 *  `export default {}` as its web implementation, so every call throws a
 *  TypeError in a browser rather than failing gracefully. Anything reaching for
 *  it must check this flag first. */
export const hasSecureStorage = isNative;

/** App PIN lock. Native only — and deliberately not polyfilled. The PIN hash
 *  has to live somewhere only the OS can read; in a browser the best available
 *  store is localStorage, which any script on the page can read, so a "PIN
 *  lock" there would be security theatre. Web hides the feature instead. */
export const canUsePinLock = hasSecureStorage;

/** The native spinner/calendar date picker. Web uses an <input type="date">. */
export const hasNativeDatePicker = isNative;

/** On-device speech recognition. The community module targets native; browser
 *  support is patchy (Safari especially), so treat web as unavailable. */
export const canUseVoiceInput = isNative;

/** Live camera capture. On web expo-image-picker becomes a file input — you
 *  can still UPLOAD a photo, which is why the measurement scan still works. */
export const canCaptureFromCamera = isNative;

/**
 * May this build sell a subscription?
 *
 * WEB ONLY, and this is a store rule rather than a technical limit. Apple
 * requires a subscription that unlocks in-app features to go through their
 * purchase system, and — outside the US and EU, which includes Cameroon —
 * forbids the app from even pointing at another way to pay. Google Play's
 * payments policy says materially the same thing; it is enforced more loosely,
 * but Play Billing cannot take MTN MoMo or Orange Money here anyway.
 *
 * So the store builds report STATUS and nothing else: the trial countdown,
 * "your trial has ended", and warm locked states. No prices, no methods, no
 * buy button, and no message telling anyone where to pay. Selling happens on
 * the web app and in the emails we send — both outside the stores' reach.
 *
 * Entitlement is a date on the server, so a tailor who subscribes on the web
 * is premium on their phone at the next check, with nothing to restore.
 */
export const canSellSubscriptions = isWeb;
