// ============================================================================
// <PasswordInput> — an Atelier <Input> for passwords with a show/hide eye.
//
// Wraps the shared Input, owns the visibility toggle, and drops an eye button
// into the field's trailing slot. Use anywhere a password is entered.
// ============================================================================

import { forwardRef, useState } from 'react';
import { Pressable, type TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, useAtelierTheme, type InputProps } from '@seamflow/ui';
import { useTranslation } from '../lib/i18n';

/**
 * Ref-forwarding so a form can focus this field — e.g. submit validation
 * jumping to the first invalid input. Without it the ref lands on the wrapper
 * and `.focus()` silently does nothing.
 */
export const PasswordInput = forwardRef<
  TextInput,
  Omit<InputProps, 'secureTextEntry' | 'trailing'>
>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  const { colors } = useAtelierTheme();
  const { t } = useTranslation();

  return (
    <Input
      ref={ref}
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      trailing={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      }
    />
  );
});
