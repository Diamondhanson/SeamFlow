// ============================================================================
// <MeasurementValueInput> — the one input every measurement value is typed
// into, wherever it appears.
//
// It has to do two things that fight each other: keep the fast numeric keypad
// (a tailor enters dozens of these), and still let them write a compound value
// like "32-42-12", which some attributes genuinely are.
//
// No keyboard type gives both on both platforms:
//   iOS      'numbers-and-punctuation' has digits, - / and space. Good.
//   Android  no type offers "/" at all. 'numeric' shows "-" on most keyboards,
//            but that depends on the keyboard app the tailor happens to use
//            (Gboard, Samsung and SwiftKey all differ), so it cannot be relied
//            on. 'decimal-pad' is digits and "." only.
//
// So the separators are not left to the keyboard. A small row of buttons
// appears under the field while it is focused and inserts the character
// directly. That behaves identically on iOS, Android and the browser, whatever
// keyboard is installed — and it stays out of the way the rest of the time,
// which matters when a template renders twenty of these.
// ============================================================================

import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { Text } from '@seamflow/ui';
import { Input } from './Input';
import { radii, spacing, useThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

/** Inserted by the buttons below; also what the parser accepts. */
const SEPARATORS = ['-', '/', ' '] as const;

/**
 * iOS gets the punctuation keyboard outright. Android gets the signed decimal
 * keypad — which shows "-" on most keyboards and always shows the decimal
 * point — with the buttons covering whatever it doesn't.
 */
const KEYBOARD = Platform.select({
  ios: 'numbers-and-punctuation',
  default: 'numeric',
}) as 'numbers-and-punctuation' | 'numeric';

export const MeasurementValueInput = function MeasurementValueInput({
  value,
  onChangeText,
  inputRef,
  ...rest
}: {
  value: string;
  onChangeText: (v: string) => void;
  inputRef?: React.Ref<TextInput>;
} & Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChangeText' | 'keyboardType' | 'ref'
>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  const append = (ch: string) => {
    // Never start with a separator, and never double one up — both would make
    // the value unparseable, and the tailor would have to notice and fix it.
    const cur = value ?? '';
    if (!cur.trim()) return;
    if (/[-/ ]$/.test(cur)) return;
    onChangeText(cur + ch);
  };

  return (
    <View>
      <Input
        {...rest}
        value={value}
        onChangeText={onChangeText}
        keyboardType={KEYBOARD}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        ref={inputRef}
      />
      {focused ? (
        <View style={styles.row}>
          <Text variant="caption" tone="textMuted">
            {t('measurements.separatorHint')}
          </Text>
          {SEPARATORS.map((ch) => (
            <Pressable
              key={ch}
              onPress={() => append(ch)}
              accessibilityRole="button"
              accessibilityLabel={t(
                ch === '-'
                  ? 'measurements.insertDash'
                  : ch === '/'
                    ? 'measurements.insertSlash'
                    : 'measurements.insertSpace',
              )}
              hitSlop={8}
              style={[
                styles.key,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Text variant="bodySm">{ch === ' ' ? '␣' : ch}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  key: {
    minWidth: 34,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
