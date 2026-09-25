// ============================================================================
// Haptics — feedback for what HAPPENED, never for what was pressed.
//
// The taptic engine is one of the things an iPhone does better than anything
// else, and an app that never uses it feels slightly dead in the hand. An app
// that buzzes on every tap feels broken, which is the more common mistake, so
// this module is deliberately small and the rules are written down:
//
//   · An OUTCOME may speak: saved, failed, a status moved, a payment landed.
//     The phone is confirming something the eyes can then verify.
//   · A TAP may not. The button already responds visually; a buzz on top of
//     that is noise, and thirty of them an hour is why people turn haptics off
//     system-wide and lose the useful ones too.
//   · Nothing in a list, a scroll or a keystroke. Ever.
//
// Android has the same API through expo-haptics and a much coarser motor, so
// the same calls are correct there but land softer. The web has nothing, and
// every call below is a no-op rather than a guard at each call site.
// ============================================================================

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Fire and forget.
 *
 * Haptics are never load-bearing: a device with the motor disabled, a phone in
 * low-power mode, or a permission quirk must not turn a saved order into a
 * thrown error. Every failure here is swallowed on purpose.
 */
function fire(run: () => Promise<void>): void {
  if (!SUPPORTED) return;
  void run().catch(() => undefined);
}

export const haptics = {
  /** It worked, and the screen is about to say so. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** It did not work. Pairs with an error dialog, never used alone. */
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

  /** It worked, with something the person should read before continuing. */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),

  /**
   * Something left the device: a message sent, a photo attached. The lightest
   * impact there is, because it accompanies an action that already animates.
   */
  sent: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /**
   * A consequential, deliberate change: an order moved to the next stage, a
   * destructive confirmation accepted. Heavier, because it should register.
   */
  commit: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Moving between options — a tab, a segment. Already used by the bottom nav. */
  selection: () => fire(() => Haptics.selectionAsync()),
};
