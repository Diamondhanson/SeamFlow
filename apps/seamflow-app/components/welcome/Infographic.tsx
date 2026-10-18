// ============================================================================
// The three intro infographics, drawn in code.
//
// WHY NOT LOTTIE, AND WHY NOT SVG
//
// Neither is installed, and both are native modules. Every native dependency
// costs another full build — and on this project a build means a 72 MB upload
// over a link that has taken twenty minutes and failed outright more than once.
// Reanimated is already here and is enough for this: layered views, circles,
// soft cards, a stagger. Abstract and geometric rather than illustrative, which
// also means nothing has to be commissioned or redrawn when the brand moves.
//
// They carry NO TEXT. That is the point of asking for a language first — the
// pictures are the same for everyone and only the words around them change, so
// there is nothing here to translate and nothing to re-export per locale.
//
// Reduced motion is honoured: everything lands in its final position with no
// movement, rather than being animated faster.
// ============================================================================

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAtelierTheme, withAlpha } from '@seamflow/ui';
import { spacing, radii } from '../../lib/theme';

const SPRING = { damping: 14, stiffness: 120, mass: 0.9 } as const;

/** One element that drifts up into place, `delay` ms after the slide appears. */
function Rise({
  delay,
  children,
  style,
}: {
  delay: number;
  children?: React.ReactNode;
  style?: object;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    p.value = reduce ? 1 : withDelay(delay, withSpring(1, SPRING));
  }, [delay, reduce, p]);

  const anim = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 18 }, { scale: 0.94 + p.value * 0.06 }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** The slow background bloom every slide shares, so they feel like one piece. */
function Bloom({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    p.value = reduce ? 1 : withTiming(1, { duration: 900 });
  }, [reduce, p]);
  const anim = useAnimatedStyle(() => ({
    opacity: p.value * 0.9,
    transform: [{ scale: 0.7 + p.value * 0.3 }],
  }));
  return <Animated.View style={[styles.bloom, { backgroundColor: color }, anim]} />;
}

export function Infographic({ slide }: { slide: 0 | 1 | 2 }) {
  const { colors } = useAtelierTheme();
  const soft = withAlpha(colors.primary, 0.16);
  const softer = withAlpha(colors.primary, 0.09);

  return (
    <View style={styles.stage}>
      <Bloom color={softer} />

      {/* ---- 1. Welcome: a stack of work, rising ------------------------- */}
      {slide === 0 ? (
        <>
          <Rise delay={0} style={[styles.card, styles.cardBack, { backgroundColor: soft }]} />
          <Rise delay={90} style={[styles.card, styles.cardMid, { backgroundColor: colors.surface }]} />
          <Rise delay={180} style={[styles.card, styles.cardFront, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="shirt-outline" size={42} color={colors.primary} />
          </Rise>
          <Rise delay={320} style={[styles.pin, styles.pinTopRight, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={14} color={colors.textOnPrimary} />
          </Rise>
        </>
      ) : null}

      {/* ---- 2. For customers: looking, then asking ---------------------- */}
      {slide === 1 ? (
        <>
          <Rise delay={0} style={[styles.card, styles.cardMid, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={34} color={colors.primary} />
          </Rise>
          <Rise delay={140} style={[styles.bubble, styles.bubbleLeft, { backgroundColor: colors.surfaceElevated }]}>
            <View style={[styles.line, { backgroundColor: soft, width: 44 }]} />
            <View style={[styles.line, { backgroundColor: soft, width: 28 }]} />
          </Rise>
          <Rise delay={260} style={[styles.bubble, styles.bubbleRight, { backgroundColor: colors.primary }]}>
            <View style={[styles.line, { backgroundColor: withAlpha('#ffffff', 0.7), width: 36 }]} />
            <View style={[styles.line, { backgroundColor: withAlpha('#ffffff', 0.45), width: 22 }]} />
          </Rise>
        </>
      ) : null}

      {/* ---- 3. For designers: the shop, in order ------------------------ */}
      {slide === 2 ? (
        <>
          <Rise delay={0} style={[styles.card, styles.cardWide, { backgroundColor: colors.surface }]}>
            <Ionicons name="cut-outline" size={30} color={colors.primary} />
          </Rise>
          {[0, 1, 2].map((i) => (
            <Rise
              key={i}
              delay={120 + i * 90}
              style={[
                styles.row,
                { backgroundColor: colors.surfaceElevated, top: 108 + i * 38 },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={[styles.line, { backgroundColor: soft, width: 70 - i * 12 }]} />
            </Rise>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 260, alignItems: 'center', justifyContent: 'center' },
  bloom: { position: 'absolute', width: 230, height: 230, borderRadius: 115 },

  card: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg },
  cardBack: { position: 'absolute', width: 120, height: 150, transform: [{ rotate: '-9deg' }] },
  cardMid: { position: 'absolute', width: 124, height: 156, transform: [{ rotate: '5deg' }] },
  cardFront: { width: 128, height: 162 },
  cardWide: { position: 'absolute', top: 18, width: 150, height: 74 },

  pin: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTopRight: { top: 44, right: 54 },

  bubble: {
    position: 'absolute',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  bubbleLeft: { left: 24, bottom: 62 },
  bubbleRight: { right: 24, bottom: 14 },

  row: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 168,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { height: 6, borderRadius: 3 },
});
