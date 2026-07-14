// ============================================================================
// <Tile> — home-screen grid card, Atelier redesign.
//
//   ┌──────────────┐
//   │ �é (icon sq)   │   tinted rounded icon square, top-left
//   │              │
//   │ Orders       │   label — Inter 600 (h3)
//   │ 6 open       │   subtitle — mono when a count ("6 open")
//   └──────────────┘
//
// `tone` sets the icon color + its square's wash, so each tile carries a
// distinct accent (all resolved from the theme — no hex). Interactive with the
// shared scale-to-0.97 press spring.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Text,
  useAtelierTheme,
  withAlpha,
  spacing,
  press as motionPress,
  type SemanticColors,
} from '@seamflow/ui';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TileProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  /** Render the subtitle in mono (for counts like "6 open"). */
  subtitleNumeric?: boolean;
  /** Semantic token driving the icon color + its square wash. */
  tone?: keyof SemanticColors;
  onPress: () => void;
}

export function Tile({
  label,
  icon,
  subtitle,
  subtitleNumeric,
  tone = 'primary',
  onPress,
}: TileProps) {
  const theme = useAtelierTheme();
  const c = theme.colors;
  const tint = c[tone];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(motionPress.scaleTo, motionPress.spring);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, motionPress.spring);
        }}
        accessibilityRole="button"
        style={[
          styles.tile,
          {
            backgroundColor: c.surface,
            borderColor: c.hairline,
            borderRadius: theme.radii.l,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: withAlpha(tint, 0.16), borderRadius: theme.radii.s },
          ]}
        >
          <Ionicons name={icon} size={22} color={tint} />
        </View>
        <View>
          <Text variant="h3" numberOfLines={1}>
            {label}
          </Text>
          {subtitle ? (
            <Text
              variant={subtitleNumeric ? 'mono' : 'bodySm'}
              tone="textMuted"
              numberOfLines={1}
              style={[
                subtitleNumeric ? styles.count : styles.subtitle,
                // Tile subtext uses Figtree (a warm humanist sans) to set it
                // apart from the Inter titles. Counts get the medium weight.
                { fontFamily: subtitleNumeric ? 'Figtree_500Medium' : 'Figtree_400Regular' },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '100%',
    // Shorter than a square — icon on top, label + count below. Wider aspect
    // ratio keeps the grid compact so more fits above the fold.
    aspectRatio: 1.4,
    padding: spacing.l,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { marginTop: 2, fontSize: 13 },
  subtitle: { marginTop: 2 },
});
