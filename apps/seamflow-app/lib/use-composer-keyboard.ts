// ============================================================================
// The keyboard contract for every screen with a composer pinned to the bottom:
// the chat thread, the support thread and the assistant.
//
// WHY NOT KeyboardAvoidingView
//
// Under edge-to-edge Android — the default since RN 0.83, and what this app
// ships — the system no longer resizes or pans the window for the IME. A
// generic avoiding view has nothing to react to, so it lands the bar somewhere
// between the keys and the screen edge. The size of that gap is the device's
// own bottom inset plus its IME toolbar, which is exactly why the amount of
// composer left hidden differed from phone to phone. iOS misses for the
// mirror-image reason: the avoiding view measures from the window, while the
// bar sits inside <Screen>'s safe-area padding, and nothing tells it so.
//
// KeyboardStickyView reads the real IME frame and translates the bar in
// lockstep with it. Same code, both platforms, no per-device arithmetic.
//
// THE OFFSET IS THE BOTTOM INSET, AND IT IS NOT A FUDGE
//
// The bar rests inside <Screen>'s bottom safe-area padding, so it already sits
// `insets.bottom` above the window. An open keyboard covers that strip, so the
// travel owed is `keyboard - insets.bottom` — which is what `offset.opened`
// subtracts. Leave it out and the bar floats a home-indicator's height above
// the keys; that gap is the single most common way this goes wrong.
//
// THE LIST GETS THE SAME NUMBER
//
// `listPad` is the matching bottom padding for the scroller, so the newest
// message stays above the raised bar rather than sliding behind it. That is
// the behaviour every other chat app has, and it is why this is one hook
// rather than two unrelated fixes: the bar and the list must move by the same
// amount or the thread loses its last line exactly when you start replying.
// ============================================================================

import { useMemo } from 'react';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useComposerKeyboard() {
  const insets = useSafeAreaInsets();
  // Counts 0 → -keyboardHeight as the IME opens, on the IME's own curve, so
  // the bar and the list track the keys frame by frame instead of jumping
  // when it has finished.
  const { height } = useReanimatedKeyboardAnimation();

  const listPad = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, -height.value - insets.bottom),
  }));

  // Memoised: KeyboardStickyView re-runs its native config when this identity
  // changes, and a fresh object every render makes it do that on every keypress.
  const stickyOffset = useMemo(
    () => ({ closed: 0, opened: insets.bottom }),
    [insets.bottom],
  );

  return { listPad, stickyOffset };
}

/**
 * Tap-target size for every control in a composer bar, and the resting height
 * of the text field between them.
 *
 * One number for all three, because that is what makes the row read as aligned:
 * a 40 dp field beside 44 dp buttons bottom-aligns 4 px low, which is small
 * enough to look like a mistake rather than a choice. 44 is also the iOS HIG
 * minimum and comfortably over Android's 48 dp guidance once the row padding
 * is counted.
 */
export const COMPOSER_CONTROL = 44;

/**
 * Line height of composer text. Set explicitly because the default differs
 * between platforms — the field cannot be centred against the buttons if its
 * own height is a platform detail.
 */
export const COMPOSER_LINE_H = 20;
