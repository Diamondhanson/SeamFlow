// ============================================================================
// Shared PIN UI — the animated dot indicator + the round dialpad.
//
// Used by both the PIN settings screen (`app/(app)/pin.tsx`) and the full-
// screen lock (`components/PinLockScreen.tsx`) so the two PIN surfaces stay
// identical. Keys are large circular tap targets (thumb-friendly); dots spring
// from a hollow outline to a filled primary disc as digits land.
// ============================================================================

import { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text, useAtelierTheme, springs } from '@seamflow/ui';
import { PIN_LENGTH } from '../lib/pin-lock';

// ----- animated dot indicator -----

function PinDot({ filled }: { filled: boolean }) {
  const { colors } = useAtelierTheme();
  const p = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(filled ? 1 : 0, springs.snappy);
  }, [filled, p]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      p.value,
      [0, 1],
      ['rgba(0,0,0,0)', colors.primary],
    ),
    borderColor: interpolateColor(
      p.value,
      [0, 1],
      [colors.border, colors.primary],
    ),
    transform: [{ scale: 1 + p.value * 0.18 }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function PinDots({ value }: { value: string }) {
  return (
    <View style={styles.dotRow}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <PinDot key={i} filled={i < value.length} />
      ))}
    </View>
  );
}

// ----- round dialpad -----

const KEYS: Array<string | 'backspace' | null> = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  null, '0', 'backspace',
];

const GAP = 18;

export function Dialpad({
  onKey,
  disabled,
}: {
  onKey: (k: string) => void;
  disabled?: boolean;
}) {
  const { colors } = useAtelierTheme();
  const { width, height } = useWindowDimensions();

  // Compute a concrete circular key diameter. A fixed size (rather than
  // %-width + aspectRatio, which Yoga won't resolve to a circle inside a wrap
  // container) guarantees perfectly round keys and scales across devices.
  // Bound by BOTH width and height: the pad is 4 rows tall, so on a short
  // landscape screen a width-only size overflows and collides with the header.
  const byWidth = Math.floor((Math.min(width, 520) - 2 * 24 - 2 * GAP) / 3);
  const byHeight = Math.floor((height * 0.55 - 3 * GAP) / 4);
  const diameter = Math.max(48, Math.min(104, byWidth, byHeight));
  const padWidth = diameter * 3 + GAP * 2;

  return (
    <View style={[styles.pad, { width: padWidth }]}>
      {KEYS.map((k, i) => {
        const keyStyle = {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
        };
        return k === null ? (
          <View key={`sp-${i}`} style={keyStyle} />
        ) : (
          <Pressable
            key={k + i}
            disabled={disabled}
            onPress={() => onKey(k)}
            style={({ pressed }) => [
              styles.key,
              keyStyle,
              {
                backgroundColor: pressed
                  ? colors.surfaceElevated
                  : colors.surface,
                borderColor: colors.hairline,
              },
            ]}
          >
            <Text variant="h1" numeric style={styles.keyText}>
              {k === 'backspace' ? '⌫' : k}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dotRow: {
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  // Round, roomy keys — 3 per row, circular, generous gaps for thumb reach.
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'center',
    justifyContent: 'space-between',
    rowGap: GAP,
  },
  key: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 30 },
});
