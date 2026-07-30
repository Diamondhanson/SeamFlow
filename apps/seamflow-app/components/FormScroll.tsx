// ============================================================================
// <FormScroll> — the app's standard scroll container for screens with inputs.
//
// Wraps react-native-keyboard-controller's KeyboardAwareScrollView: when a
// field is focused, the content scrolls so the field sits above the keyboard
// (with breathing room), tracks focus moving between fields, and follows the
// keyboard's animation. Works identically on iOS and edge-to-edge Android
// (incl. tablets), where the OS-level pan/resize window modes are unreliable.
//
// Use this instead of a plain ScrollView on ANY screen with text inputs.
// Horizontal strips and input-free lists keep using ScrollView/FlatList.
// ============================================================================

import { type ComponentProps } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { spacing } from '../lib/theme';

type Props = ComponentProps<typeof KeyboardAwareScrollView>;

export function FormScroll({ children, ...props }: Props) {
  return (
    <KeyboardAwareScrollView
      // Gap kept between the focused field and the keyboard's top edge.
      bottomOffset={spacing.xl}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
