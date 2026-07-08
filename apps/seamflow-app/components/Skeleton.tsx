// ============================================================================
// Skeleton loaders — the placeholder UI shown while a screen's data loads.
//
// A skeleton MUST mirror the real layout it stands in for: same frame (Screen +
// ScreenHeader), same row/card shapes, same spacing. When you change a screen's
// design, update its skeleton to match. See docs/skeletons.md + CLAUDE.md.
//
// `<Skeleton>` is the base block — a theme-aware, reduced-motion-aware pulsing
// rectangle. The composed helpers (`SkeletonList`, `SkeletonDetail`,
// `SkeletonForm`, `SkeletonTiles`) cover the app's common layouts; compose them
// or drop raw `<Skeleton>` / `<SkeletonLine>` / `<SkeletonCircle>` blocks for
// bespoke screens.
// ============================================================================

import { useEffect } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { radii, spacing, useThemeColors } from '../lib/theme';

const PULSE_MS = 850;

// -- Base block ---------------------------------------------------------------

export function Skeleton({
  width = '100%',
  height = 14,
  radius = radii.md,
  fill = false,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  /** Stretch to fill the parent (flex:1) instead of using width/height. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reduceMotion, pulse]);

  const animated = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.6 : pulse.value,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        fill
          ? { flex: 1, borderRadius: radius, backgroundColor: colors.cardElevated }
          : { width, height, borderRadius: radius, backgroundColor: colors.cardElevated },
        animated,
        style,
      ]}
    />
  );
}

/** A text-line placeholder (pill-ish, short). */
export function SkeletonLine({
  width = '100%',
  height = 12,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <Skeleton width={width} height={height} radius={999} style={style} />;
}

/** A circular placeholder (avatar). */
export function SkeletonCircle({ size = 44 }: { size?: number }) {
  return <Skeleton width={size} height={size} radius={size / 2} />;
}

// -- Composed: list rows ------------------------------------------------------

type Leading = 'square' | 'circle' | 'none';

/**
 * One row placeholder. `leading:'square'` matches a `<ListRow>` (44 tinted
 * square + two lines); `leading:'circle'` matches an `<OrderCard>`/member row
 * (avatar + lines). `chip` adds a trailing status-pill placeholder.
 */
export function SkeletonRow({
  leading = 'square',
  lines = 2,
  chip = false,
}: {
  leading?: Leading;
  lines?: number;
  chip?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View style={[styles.row, { borderColor: colors.hairline }]}>
      {leading === 'square' ? (
        <Skeleton width={44} height={44} radius={radii.md} />
      ) : leading === 'circle' ? (
        <SkeletonCircle size={44} />
      ) : null}
      <View style={styles.rowText}>
        <SkeletonLine width="58%" height={14} />
        {lines > 1 ? (
          <SkeletonLine width="38%" height={11} style={{ marginTop: spacing.sm }} />
        ) : null}
      </View>
      {chip ? <Skeleton width={64} height={22} radius={999} /> : null}
    </View>
  );
}

/** A stack of row placeholders — the default for list screens. */
export function SkeletonList({
  count = 6,
  leading = 'square',
  lines = 2,
  chip = false,
}: {
  count?: number;
  leading?: Leading;
  lines?: number;
  chip?: boolean;
}) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} leading={leading} lines={lines} chip={chip} />
      ))}
    </View>
  );
}

// -- Composed: detail screen --------------------------------------------------

/**
 * A detail-screen body: a tall hero card + a couple of section blocks. Sits
 * below the screen's own <ScreenHeader> (which detail screens keep in their
 * loading branch). Matches the orders/clients/groups detail shape.
 */
export function SkeletonDetail({ sections = 2 }: { sections?: number }) {
  const colors = useThemeColors();
  return (
    <View style={styles.detail}>
      {/* Hero card */}
      <View style={[styles.hero, { borderColor: colors.hairline }]}>
        <Skeleton width={96} height={26} radius={999} />
        <View style={styles.heroStats}>
          <View style={{ gap: spacing.sm }}>
            <SkeletonLine width={70} height={10} />
            <SkeletonLine width={96} height={14} />
          </View>
          <View style={{ gap: spacing.sm }}>
            <SkeletonLine width={70} height={10} />
            <SkeletonLine width={96} height={14} />
          </View>
        </View>
      </View>
      {Array.from({ length: sections }).map((_, i) => (
        <View key={i} style={styles.section}>
          <SkeletonLine width="40%" height={16} />
          <Skeleton height={64} radius={radii.lg} style={{ marginTop: spacing.md }} />
        </View>
      ))}
    </View>
  );
}

// -- Composed: image grid -----------------------------------------------------

/** A grid of square image placeholders (Design Studio / photo grids). */
export function SkeletonGrid({ count = 9, columns = 3 }: { count?: number; columns?: number }) {
  const width = `${100 / columns}%` as DimensionValue;
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.gridCell, { width }]}>
          <Skeleton fill radius={radii.lg} />
        </View>
      ))}
    </View>
  );
}

// -- Composed: form -----------------------------------------------------------

/** A form body: N input-field placeholders + a button. For form/detail screens. */
export function SkeletonForm({ fields = 5 }: { fields?: number }) {
  return (
    <View style={styles.form}>
      {Array.from({ length: fields }).map((_, i) => (
        <Skeleton key={i} height={56} radius={radii.md} />
      ))}
      <Skeleton height={52} radius={999} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  rowText: { flex: 1 },
  detail: { gap: spacing.xl },
  hero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  heroStats: { flexDirection: 'row', gap: spacing.xl },
  section: { marginTop: spacing.xs },
  form: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { aspectRatio: 1, padding: spacing.xs / 2 },
});
