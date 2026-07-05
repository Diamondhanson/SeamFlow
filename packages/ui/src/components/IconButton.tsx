// ============================================================================
// <IconButton> — Atelier circular icon button.
//
// The single round tap-target used across the shell: header back chevron,
// month prev/next, the group/template "+", the calendar chat button. Renders
// whatever icon node the caller passes (so `@seamflow/ui` stays icon-library
// agnostic) inside a themed disc with the shared scale-to-0.97 press spring.
//
//   variant="surface" (default) — surface fill + hairline ring
//   variant="primary"           — primary fill (the "+" FAB)
//   variant="ghost"             — no fill / no ring (bare tap target)
// ============================================================================

import { forwardRef, type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useAtelierTheme } from '../theme/ThemeProvider';
import { press as motionPress } from '../tokens/motion';

export type IconButtonVariant = 'surface' | 'primary' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

const DIAMETER: Record<IconButtonSize, number> = { sm: 36, md: 44, lg: 52 };

export interface IconButtonProps
  extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const IconButton = forwardRef<View, IconButtonProps>(function IconButton(
  { children, variant = 'surface', size = 'md', onPress, onPressIn, onPressOut, style, ...rest },
  ref,
) {
  const { colors } = useAtelierTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const d = DIAMETER[size];
  const surface: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.primary, borderWidth: 0 }
      : variant === 'ghost'
        ? { backgroundColor: 'transparent', borderWidth: 0 }
        : { backgroundColor: colors.surface, borderColor: colors.hairline, borderWidth: 1 };

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
        hitSlop={8}
        style={[
          styles.base,
          { width: d, height: d, borderRadius: d / 2 },
          surface,
          style,
        ]}
        accessibilityRole="button"
        {...rest}
      >
        {children}
      </AnimatedPressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
