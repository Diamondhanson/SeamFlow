// ============================================================================
// <Card> — Atelier surface primitive. A padded, hairline-bordered surface with
// the soft card radius (radii.l = 20). Two jobs:
//
//   onPress absent  — static container (plain View).
//   onPress present — interactive; scale-to-0.97 spring on press, matching
//                     Button / Chip. Used for tappable list rows.
//
//   variant="surface"  (default) — sits on the screen bg.
//   variant="elevated"           — surfaceElevated bg, for cards-on-cards.
//
// `CardTitle` / `CardLine` are the canonical text slots so callers never reach
// for a raw <Text>: title → h3 (Inter 600 / 18), line → bodySm muted (14).
// Colors resolve from the theme, so cards re-skin with the mode — no hex.
// ============================================================================

import { forwardRef, type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useAtelierTheme } from '../theme/ThemeProvider';
import { spacing } from '../tokens/spacing';
import { press as motionPress } from '../tokens/motion';

export type CardVariant = 'surface' | 'elevated';

export interface CardProps
  extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  variant?: CardVariant;
  /** When set, the card becomes an interactive Pressable with press spring. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Card = forwardRef<View, CardProps>(function Card(
  { children, variant = 'surface', onPress, onPressIn, onPressOut, style, ...rest },
  ref,
) {
  const theme = useAtelierTheme();
  const c = theme.colors;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const surfaceStyle: ViewStyle = {
    backgroundColor: variant === 'elevated' ? c.surfaceElevated : c.surface,
    borderColor: c.hairline,
    borderRadius: theme.radii.l,
  };

  // Static container.
  if (!onPress) {
    return (
      <View ref={ref} style={[styles.base, surfaceStyle, style]} {...rest}>
        {children}
      </View>
    );
  }

  // Interactive card.
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
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.base, surfaceStyle, style]}
        accessibilityRole="button"
        {...rest}
      >
        {children}
      </AnimatedPressable>
    </Animated.View>
  );
});

export function CardTitle({ children }: { children: ReactNode }) {
  return <Text variant="h3">{children}</Text>;
}

export function CardLine({ children }: { children: ReactNode }) {
  return <Text variant="bodySm" tone="textMuted">{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    padding: spacing.l,
    borderWidth: 1,
  },
});
