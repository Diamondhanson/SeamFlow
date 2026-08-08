// ============================================================================
// <FormScroll> — the client app's scroll container for screens with inputs.
//
// The tailor app uses react-native-keyboard-controller for this. The client app
// doesn't carry that dependency, and adding a native module for two forms isn't
// worth the build cost — so this is KeyboardAvoidingView + ScrollView, which is
// adequate for the short forms here (sign-in, inquire).
//
// If the client app ever grows long forms, swap in the keyboard-controller
// version to match the tailor app rather than fighting this.
// ============================================================================

import { type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { spacing } from '../lib/theme';

type Props = ComponentProps<typeof ScrollView>;

export function FormScroll({ children, contentContainerStyle, ...props }: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={spacing.xl}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
