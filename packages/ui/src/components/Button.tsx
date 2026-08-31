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
// Double-submit is handled HERE, not in each caller.
//   A tailor on a slow connection taps "Create", sees nothing happen, and taps
//   again — four, eight times. Every one of those taps used to fire its own
//   POST. We shipped real duplicate clients that way.
//   The old contract asked every screen to remember `loading={mutation.isPending}`,
//   and a contract you have to remember at ~60 call sites is one you will lose.
//   So: if onPress returns a promise, the button holds itself busy until that
//   promise settles — presses in between are dropped — and shows the spinner
//   on its own unless the caller is already driving `loading` explicitly.
//   Synchronous handlers (steppers, toggles, navigation) return undefined and
//   are completely unaffected.
//
// Web rendering note: <button class="atelier-btn atelier-btn-primary"> +
// Tailwind preset that emits the same paddings, radii, colors.
// ============================================================================

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { createPressGuard, type PressGuard } from './pressGuard';
import { useAtelierTheme } from '../theme/ThemeProvider';
import { press as motionPress } from '../tokens/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /**
   * Render an icon before the label — on the LEFT in a left-to-right language,
   * on the right in Arabic. Pass a phosphor / SVG node.
   */
  iconStart?: React.ReactNode;
  /** Render an icon after the label. Mirrors under RTL, like `iconStart`. */
  iconEnd?: React.ReactNode;
  /** @deprecated Use `iconStart`. The physical name is what led call sites to
   *  position icons by compass point rather than by reading order. */
  iconLeft?: React.ReactNode;
  /** @deprecated Use `iconEnd`. */
  iconRight?: React.ReactNode;
  /** Stretch to fill parent width. Default true (matches buttons in forms). */
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** How long a press is held after firing an async-operation button, to cover
 *  the render gap before the caller's own `loading` flag arrives. Long enough
 *  to swallow an impatient double-tap, short enough that a deliberate retry
 *  after a fast failure still feels immediate. */
const PRESS_LOCK_MS = 600;

const HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const PADDINGS_X: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    variant = 'primary',
    size = 'md',
    loading,
    disabled,
    iconStart,
    iconEnd,
    iconLeft,
    iconRight,
    fullWidth = true,
    onPress,
    onPressIn,
    onPressOut,
    ...rest
  },
  ref,
) {
  // One release of overlap for the deprecated physical names.
  const start = iconStart ?? iconLeft;
  const end = iconEnd ?? iconRight;
  const theme = useAtelierTheme();
  const scale = useSharedValue(1);

  const mountedRef = useRef(true);
  const [selfBusy, setSelfBusy] = useState(false);

  // Whether the caller has declared this an async-operation button. Passing the
  // prop at all — even as `false` — is the declaration; steppers, chips and
  // navigation buttons never pass it and stay fully rapid-tappable.
  const isAsyncButton = loading !== undefined;

  // A ref, not state: the second tap of a double-tap can land before React has
  // re-rendered, and only a ref is already updated by then.
  const guardRef = useRef<PressGuard | null>(null);
  if (guardRef.current === null) {
    guardRef.current = createPressGuard({
      lock: isAsyncButton,
      lockMs: PRESS_LOCK_MS,
      now: Date.now,
    });
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (e) => {
      const guard = guardRef.current!;
      if (!guard.shouldRun()) return;

      const result = onPress?.(e) as unknown;
      if (!isPromise(result)) return;

      guard.hold(result, (busy) => {
        if (busy || mountedRef.current) setSelfBusy(busy);
      });
    },
    [onPress],
  );

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

  // `loading === undefined` means the caller is not driving the busy state, so
  // we drive it. If they passed it (even `false`), we defer to them for the
  // spinner and keep our guard purely as the press-blocker underneath.
  const showSpinner = loading ?? selfBusy;
  const isDisabled = disabled || showSpinner;

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
        onPress={handlePress}
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
        accessibilityState={{ disabled: isDisabled, busy: showSpinner }}
        {...rest}
      >
        {showSpinner ? (
          <ActivityIndicator color={palette.label} />
        ) : (
          <>
            {start ? <View style={styles.iconStart}>{start}</View> : null}
            <Text variant="button" tone={palette.tone}>
              {label}
            </Text>
            {end ? <View style={styles.iconEnd}>{end}</View> : null}
          </>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
});

function isPromise(v: unknown): v is Promise<unknown> {
  return typeof (v as { then?: unknown } | null | undefined)?.then === 'function';
}

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
  iconStart: { marginEnd: 8 },
  iconEnd: { marginStart: 8 },
});
