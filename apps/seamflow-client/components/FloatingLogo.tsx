// ============================================================================
// <FloatingLogo> — the persistent "S" mark suspended at the bottom-center of
// every in-app screen. Tapping it returns home from anywhere.
//
// It's mounted once in (app)/_layout, as a sibling overlay above the navigator,
// so it stays put across screen transitions. Its opacity is driven by the
// shared `activity` value from FloatingScrollProvider: nearly transparent while
// a list is scrolling, fully visible (with its lavender glow) when idle.
//
// The container is `pointerEvents="box-none"` so only the disc itself is
// tappable — the rest of the bottom strip passes touches through to content.
// ============================================================================

import { useEffect } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { Text, useAtelierTheme, springs } from '@seamflow/ui';
import { useFloatingActivity } from '../lib/floating-scroll';

const HOME_PATH = '/(app)';
const SIZE = 56;

export function FloatingLogo() {
  const { colors } = useAtelierTheme();
  const insets = useSafeAreaInsets();
  const activity = useFloatingActivity();
  const pathname = usePathname();

  // Press feedback (independent of the scroll fade).
  const scale = useSharedValue(1);
  // 0 = keyboard hidden, 1 = visible. The logo sits at the bottom-center, which
  // collides with the keyboard (especially in landscape), so we fold it out
  // while typing — it's decorative, nothing is lost by hiding it.
  const kb = useSharedValue(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      kb.value = withTiming(1, { duration: 150 });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      kb.value = withTiming(0, { duration: 200 });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [kb]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity:
      (1 - kb.value) *
      interpolate(activity.value, [0, 1], [1, 0.14], Extrapolation.CLAMP),
    transform: [
      { scale: scale.value },
      // Drift down while scrolling (recede) and further down when the keyboard
      // pushes it, so it slides out of the way instead of just fading.
      {
        translateY:
          interpolate(activity.value, [0, 1], [0, 6], Extrapolation.CLAMP) +
          kb.value * 24,
      },
    ],
  }));

  const goHome = () => {
    // Already home → no-op (avoid a redundant navigation).
    if (pathname === '/' || pathname === HOME_PATH) return;
    router.navigate(HOME_PATH);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + 6, left: insets.left, right: insets.right },
      ]}
    >
      <Animated.View style={fadeStyle}>
        <Pressable
          onPress={goHome}
          onPressIn={() => {
            scale.value = withSpring(0.9, springs.snappy);
          }}
          onPressOut={() => {
            scale.value = withSpring(1, springs.snappy);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go to home"
          style={[
            styles.disc,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              borderColor: colors.bg,
            },
          ]}
        >
          <Text
            variant="h2"
            style={{ color: colors.textOnPrimary, lineHeight: SIZE }}
          >
            S
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  disc: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    // Lavender glow — iOS shadow + Android elevation.
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 12,
  },
});
