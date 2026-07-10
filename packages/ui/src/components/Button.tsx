// ============================================================================
// <Button> — Atelier button primitive.
//
// Variants
//   primary      — filled, primary background, textOnPrimary
//   secondary    — outlined hairline, text-color label
//   ghost        — no border / no fill, primary-colored label
//   destructive  — danger fill, textOnPrimary
//
// Sizes
//   sm  — 36px tall, label "button" variant @ 13/18
//   md  — 44px tall (default)
//   lg  — 52px tall
//
// Press feedback: native scale-to-0.97 via reanimated spring (snappy). When
// reanimated isn't available we fall back to a plain Pressable — handy for
// the web build later (just CSS :active scale).
//
// Web rendering note: <button class="atelier-btn atelier-btn-primary"> +
// Tailwind preset that emits the same paddings, radii, colors.
// ============================================================================

import { forwardRef, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useAtelierTheme } from '../theme/ThemeProvider';
import { press as motionPress } from '../tokens/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Render an icon to the left of the label. Pass a phosphor / SVG node. */
  iconLeft?: React.ReactNode;
  /** Render an icon to the right of the label. */
  iconRight?: React.ReactNode;
  /** Stretch to fill parent width. Default true (matches buttons in forms). */
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const PADDINGS_X: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    variant = 'primary',
    size = 'md',
    loading,
    disabled,
    iconLeft,
    iconRight,
    fullWidth = true,
    onPressIn,
    onPressOut,
    ...rest
  },
  ref,
) {
  const theme = useAtelierTheme();
  const scale = useSharedValue(1);

  const palette = useMemo(() => paletteFor(theme.colors, variant), [theme, variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    scale.value = withSpring(motionPress.scaleTo, motionPress.spring);
    onPressIn?.(e);
  };
  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    scale.value = withSpring(1, motionPress.spring);
    onPressOut?.(e);
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View
      style={[
        { width: fullWidth ? '100%' : 'auto', opacity: isDisabled ? 0.55 : 1 },
        animatedStyle,
      ]}
    >
      <AnimatedPressable
        ref={ref}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.base,
          {
            height: HEIGHTS[size],
            paddingHorizontal: PADDINGS_X[size],
            backgroundColor: palette.bg,
            borderColor: palette.border,
            borderWidth: palette.borderWidth,
            borderRadius: theme.radii.pill,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: !!loading }}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={palette.label} />
        ) : (
          <>
            {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
            <Text variant="button" tone={palette.tone}>
              {label}
            </Text>
            {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
          </>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
});

interface ButtonPalette {
  bg: string;
  border: string;
  borderWidth: number;
  label: string;
  tone: 'text' | 'textOnPrimary' | 'primary' | 'danger';
}

function paletteFor(
  c: ReturnType<typeof useAtelierTheme>['colors'],
  variant: ButtonVariant,
): ButtonPalette {
  switch (variant) {
    case 'primary':
      return {
        bg: c.primary,
        border: c.primary,
        borderWidth: 0,
        label: c.textOnPrimary,
        tone: 'textOnPrimary',
      };
    case 'destructive':
      return {
        bg: c.danger,
        border: c.danger,
        borderWidth: 0,
        label: c.textOnPrimary,
        tone: 'textOnPrimary',
      };
    case 'secondary':
      // A subtle surface fill + a defined border so the button reads as a real,
      // tappable control — not near-invisible text with a faint hairline.
      return {
        bg: c.surface,
        border: c.border,
        borderWidth: 1,
        label: c.text,
        tone: 'text',
      };
    case 'ghost':
      return {
        bg: 'transparent',
        border: 'transparent',
        borderWidth: 0,
        label: c.primary,
        tone: 'primary',
      };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
