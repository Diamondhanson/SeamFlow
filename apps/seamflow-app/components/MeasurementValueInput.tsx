// ============================================================================
// <MeasurementValueInput> — the one input every measurement value is typed
// into, wherever it appears.
//
// It has to do two things that pull against each other: keep a fast numeric
// keypad (a tailor enters dozens of these), and still allow a compound value
// like "32-42-12", which some attributes genuinely are.
//
// What each platform can actually offer, verified rather than assumed:
//
//   web      inputMode="text" — the browser keyboard already has - / and
//            space, and it takes precedence over keyboardType in
//            react-native-web. No buttons needed, and crucially no buttons
//            means no focus bug (see below).
//   iOS      'numbers-and-punctuation' is a digit-led layout that carries
//            - / and a space bar. Also nothing to add.
//   Android  no numeric input type exposes "/". React Native maps 'numeric'
//            to TYPE_CLASS_NUMBER | DECIMAL | SIGNED — digits, "." and "-"
//            only (ReactTextInputManager.kt). So Android, and only Android,
//            gets the insert buttons.
//
// The earlier version showed those buttons on every platform and gated them
// on focus. On web that was self-defeating: the browser blurs the input on
// mousedown, which unmounted the row before the press could land, so the tap
// dismissed the keyboard and inserted nothing. Native is fine because the
// surrounding FormScroll sets keyboardShouldPersistTaps="handled", but the
// row still hides on a short delay here so a stray blur can't beat the press.
// ============================================================================

import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { Text } from '@seamflow/ui';
import { Input } from './Input';
import { isWeb } from '../lib/platform-capabilities';
import { radii, spacing, useThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

/** Inserted by the buttons; also exactly what the parser accepts. */
const SEPARATORS = ['-', '/', ' '] as const;

/** Only Android lacks a keyboard that can produce these. */
const NEEDS_BUTTONS = Platform.OS === 'android';

/** Long enough for a press to register after any blur, short enough to feel deliberate. */
const HIDE_DELAY_MS = 180;

export function MeasurementValueInput({
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
  'value' | 'onChangeText' | 'keyboardType' | 'inputMode' | 'ref'
>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Where the caret is, so a separator lands where the tailor is typing rather
  // than always at the end.
  const sel = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const insert = (ch: string) => {
    const cur = value ?? '';
    const { start, end } = sel.current;
    const at = Math.min(Math.max(start, 0), cur.length);
    const to = Math.min(Math.max(end, at), cur.length);
    const before = cur.slice(0, at);
    const after = cur.slice(to);
    // Never lead with a separator and never double one up — either makes the
    // value unparseable, and the tailor would have to spot it and fix it.
    if (!before.trim()) return;
    if (/[-/ ]$/.test(before)) return;
    const next = before + ch + after;
    sel.current = { start: at + 1, end: at + 1 };
    onChangeText(next);
  };

  // Native-only keyboard choice; web uses inputMode below instead.
  const keyboardType = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

  return (
    <View>
      <Input
        {...rest}
        value={value}
        onChangeText={onChangeText}
        // The browser keyboard has every separator already, so give it a plain
        // text field rather than a numeric one it would have to fight.
        {...(isWeb ? { inputMode: 'text' as const } : { keyboardType })}
        onSelectionChange={(e) => {
          sel.current = e.nativeEvent.selection;
          rest.onSelectionChange?.(e);
        }}
        onFocus={(e) => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setFocused(false), HIDE_DELAY_MS);
          rest.onBlur?.(e);
        }}
        ref={inputRef}
      />

      {NEEDS_BUTTONS && focused ? (
        <View style={styles.row}>
          <Text variant="caption" tone="textMuted">
            {t('measurements.separatorHint')}
          </Text>
          {SEPARATORS.map((ch) => (
            <Pressable
              key={ch}
              onPress={() => insert(ch)}
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
}

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
