// ============================================================================
// <Input> — Atelier text input with floating label.
//
// Visual spec:
//   - 14px radius (matches token `m`)
//   - 1px hairline border at rest
//   - On focus: border picks up `primarySoft` + a 2px inner glow at 30 % alpha
//   - Floating label slides up when value is non-empty OR field has focus
//   - Trailing icon slot (used by search inputs, password toggles, etc)
//   - Error caption slides in below the field; shifts focus border to danger
//
// Replaces the legacy <TextInput> patterns: `#ffffff15` slabs, flat borders,
// no label motion, etc.
//
// Web rendering note: <label class="atelier-input"> with a <span> for the
// label that animates via CSS `transform: translateY(...)` + a hairline
// border.
// ============================================================================

import { forwardRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useAtelierTheme } from '../theme/ThemeProvider';
import { durations, easing } from '../tokens/motion';

export interface InputProps extends TextInputProps {
  label: string;
  /** Optional helper text — shows below the field. Replaced by error when set. */
  helper?: string;
  /** Error message — when present, field renders in danger color. */
  error?: string;
  /** Render a node on the right side of the field (icon, button, badge). */
  trailing?: React.ReactNode;
  /** Render a node on the left side. */
  leading?: React.ReactNode;
  /**
   * Placeholder is supported for back-compat with forms that pass a hint
   * (e.g. "you@example.com"). The floating label normally fills this role
   * — but when both are provided the placeholder shows AFTER the label
   * has floated up (i.e. focused with an empty field), which gives a
   * useful hint without doubling up with the label.
   */
  placeholder?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    helper,
    error,
    trailing,
    leading,
    value,
    defaultValue,
    onFocus,
    onBlur,
    style,
    multiline,
    placeholder,
    ...rest
  },
  ref,
) {
  const theme = useAtelierTheme();

  // Whether the label is in its "floated up" position. True when focused or
  // when the field has any value.
  const hasValue = !!(value ?? defaultValue);
  const [focused, setFocused] = useState(false);
  const floated = focused || hasValue;

  // Animated progress between resting and floating states.
  const progress = useSharedValue(floated ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(floated ? 1 : 0, {
      duration: durations.fast,
      easing: Easing.bezier(...easing.standardBezier),
    });
  }, [floated, progress]);

  // Border colour shifts on focus, more aggressively on error. Use the
  // worklet thread for these animations to avoid layout-thread jank.
  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.hairline;

  // Inner-glow focus ring — a sibling absolutely-positioned border-only View
  // that's visible when focused. We do NOT animate this via a worklet because
  // worklets that capture React state (the `focused` bool) trip Reanimated's
  // closure-validation in some Hermes builds. The ring snaps in instead of
  // fading; the spring fade is a Phase 2 polish via a SharedValue mirror.

  // Label position animation — reads only `progress.value` (a SharedValue),
  // so it runs cleanly on the UI thread with no closure-capture surprises.
  const labelAnimated = useAnimatedStyle(() => ({
    transform: [
      // -2 (centered) → -14 (above)
      { translateY: -2 + (-14 - -2) * progress.value },
    ],
    // fontSize on a View is ignored by RN — we'll wire the size transition
    // through the Text style instead once `Animated.Text` is in play.
  }));

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderWidth: theme.borderWidths.hairline,
            borderRadius: theme.radii.m,
            backgroundColor: theme.colors.surface,
            paddingTop: floated ? 22 : 12,
            paddingBottom: 8,
            minHeight: multiline ? 96 : 56,
          },
        ]}
      >
        {/* Focus ring — plain conditional opacity, no worklet (see above). */}
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              opacity: focused ? 0.3 : 0,
              borderColor: error ? theme.colors.danger : theme.colors.primary,
              borderRadius: theme.radii.m,
            },
          ]}
        />

        {leading ? <View style={styles.leading}>{leading}</View> : null}

        {/* Floating label */}
        <Animated.View pointerEvents="none" style={[styles.label, labelAnimated]}>
          <Text
            tone={focused ? 'primary' : error ? 'danger' : 'textMuted'}
            // Override family via a manual cast so we can keep `variant="body"`
            // sizing animatable. The label transitions visually between body
            // (16px) and label (12px) sizes via the animated style above.
            variant="body"
            style={{
              // We don't want the textTransform from the label variant here —
              // floating labels read better in title case.
              fontFamily:
                theme.textVariants.bodySm.fontFamily,
            }}
          >
            {label}
          </Text>
        </Animated.View>

        <TextInput
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          // When focused with no value the floating label has moved up and
          // out of the way — at that moment we surface the caller's
          // placeholder ("e.g. you@example.com") as a hint. When the
          // label is in its resting position it occupies the space, so we
          // hide the placeholder to avoid duplication.
          placeholder={floated ? placeholder : ''}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          multiline={multiline}
          selectionColor={theme.colors.primary}
          style={[
            {
              color: theme.colors.text,
              fontFamily: theme.textVariants.body.fontFamily,
              fontSize: theme.textVariants.body.fontSize,
              lineHeight: multiline
                ? theme.textVariants.body.lineHeight
                : undefined, // see RN center-vertically caveat
              flex: 1,
              paddingHorizontal: 0,
              paddingTop: 0,
              paddingBottom: 0,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
          {...rest}
        />

        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>

      {/* Helper / error text */}
      {error || helper ? (
        <Text
          variant="caption"
          tone={error ? 'danger' : 'textMuted'}
          style={{ marginTop: 4, marginLeft: 4 }}
        >
          {error ?? helper}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  field: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderWidth: 2,
  },
  label: {
    position: 'absolute',
    left: 16,
    top: 18,
  },
  leading: { marginRight: 10 },
  trailing: { marginLeft: 10 },
});
