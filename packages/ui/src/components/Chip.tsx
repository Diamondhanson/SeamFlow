// ============================================================================
// <Chip> — Atelier chip primitive. Two jobs, one shape (pill):
//
//   variant="filter"  — interactive, selectable. Outlined when idle, fills
//                       with `tone` when `selected`. Used for filter rows
//                       (order status / time filters).
//   variant="status"  — display-only filled badge. Used for the status pill
//                       on order cards. Non-interactive.
//
// `tone` is a semantic color token name (e.g. `primary`, `danger`,
// `statusInProgress`) — never a raw hex. The fill/accent color and the
// idle border both resolve from the theme, so chips re-skin with the mode.
//
// Label always renders through the `label` type variant (Inter 500, uppercase,
// +0.4 tracking) so chips read as crisp tags, matching the sign-in tab labels.
// ============================================================================

import { forwardRef } from 'react';
import {
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
import type { SemanticColors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { press as motionPress } from '../tokens/motion';

export type ChipTone = keyof SemanticColors;
export type ChipVariant = 'filter' | 'status';

export interface ChipProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ChipVariant;
  /** Filter mode only: filled with `tone` when true. */
  selected?: boolean;
  /** Semantic color token for the fill (status) / selected fill + border. */
  tone?: ChipTone;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Chip = forwardRef<View, ChipProps>(function Chip(
  {
    label,
    variant = 'filter',
    selected = false,
    tone = 'primary',
    onPressIn,
    onPressOut,
    disabled,
    ...rest
  },
  ref,
) {
  const theme = useAtelierTheme();
  const c = theme.colors;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Display-only filled badge.
  if (variant === 'status') {
    return (
      <View
        ref={ref}
        style={[
          styles.statusBase,
          { backgroundColor: c[tone], borderRadius: theme.radii.pill },
        ]}
        accessibilityRole="text"
      >
        <Text variant="label" tone="textOnPrimary">
          {label}
        </Text>
      </View>
    );
  }

  // Interactive filter chip.
  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    scale.value = withSpring(motionPress.scaleTo, motionPress.spring);
    onPressIn?.(e);
  };
  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    scale.value = withSpring(1, motionPress.spring);
    onPressOut?.(e);
  };

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        ref={ref}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.filterBase,
          {
            borderRadius: theme.radii.pill,
            backgroundColor: selected ? c[tone] : 'transparent',
            borderColor: selected ? c[tone] : c.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: !!disabled }}
        {...rest}
      >
        <Text variant="label" tone={selected ? 'textOnPrimary' : 'textMuted'}>
          {label}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  filterBase: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBase: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
});
