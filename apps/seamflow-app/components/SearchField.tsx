// ============================================================================
// <SearchField> — the rounded search bar (leading magnifier + placeholder).
//
// A lighter-weight input than the floating-label <Input>: a single pill with a
// search glyph, for list filtering where a persistent label would be noise.
// Colors + radius come from the theme (no hex).
// ============================================================================

import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAtelierTheme, spacing, useFieldFocus } from '@seamflow/ui';
import { useTranslation } from '../lib/i18n';

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const { colors, radii } = useAtelierTheme();
  const placeholderText = placeholder ?? t('misc.searchPlaceholder');
  // The pill's own border is the focus indicator, which is what lets us drop
  // the browser's inner ring on web (see useFieldFocus).
  const { focused, focusProps, webReset } = useFieldFocus();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: focused ? colors.primary : colors.hairline,
          borderRadius: radii.m,
        },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholderText}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        {...focusProps}
        style={[styles.input, { color: colors.text }, webReset]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.m,
    height: 48,
    gap: spacing.s,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    padding: 0,
  },
});
