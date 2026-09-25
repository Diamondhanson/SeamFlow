// ============================================================================
// Small platform truths the design system has to state out loud.
//
// React Native hides most of the difference between iOS and Android, but not
// all of it, and the leftovers are exactly the details that make an app feel
// ported rather than made. Two of them live here.
// ============================================================================

import { Platform, type ViewStyle } from 'react-native';
import { useAtelierTheme } from './ThemeProvider';

/**
 * Which keyboard iOS should draw.
 *
 * The system keyboard does not follow an app's own theme: in a dark app with
 * no `keyboardAppearance`, iOS still slides up the light grey keyboard, and
 * that one white rectangle is the loudest "this was built for Android" signal
 * in the whole product. Android ignores the prop entirely.
 */
export function useKeyboardAppearance(): 'light' | 'dark' {
  const { mode } = useAtelierTheme();
  return mode === 'midnight' ? 'dark' : 'light';
}

/**
 * iOS squircles.
 *
 * `borderCurve: 'continuous'` is what makes a rounded rectangle on iOS curve
 * the way every Apple surface does, instead of the circular arc that reads as
 * a web card. It costs nothing, changes no measurement, and Android ignores
 * it — so every large rounded surface in the app should carry it.
 */
export const squircle: ViewStyle = Platform.OS === 'ios' ? { borderCurve: 'continuous' } : {};

/**
 * How a scroll view should treat the keyboard while dragging.
 *
 * On iOS the keyboard is expected to follow your finger down and come back if
 * you change your mind; on Android it simply closes. Passing the iOS value on
 * Android does nothing useful, so each gets its own.
 */
export const keyboardDismissOnDrag = Platform.OS === 'ios' ? 'interactive' : 'on-drag';
