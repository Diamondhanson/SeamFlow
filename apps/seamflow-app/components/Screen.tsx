import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, useThemeColors } from '../lib/theme';
import { useContentWidth, type ContentWidth } from '../lib/use-breakpoint';

export function Screen({
  children,
  padded = true,
  width = 'reading',
}: {
  children: ReactNode;
  padded?: boolean;
  /**
   * Content-width cap. `'reading'` (default, 760) for forms and detail screens;
   * `'wide'` (1120) for browse/overview surfaces (dashboard, lists, grids,
   * calendar) that should fill more of a tablet's width.
   */
  width?: ContentWidth;
}) {
  const colors = useThemeColors();
  // On wide screens (tablets / landscape) cap the content width and centre it
  // so content stays a comfortable width instead of stretching edge-to-edge.
  // On phones the screen is narrower than the cap, so the body is full-width
  // and the centring is a no-op.
  //
  // `useContentWidth` resolves to a CONCRETE pixel width rather than
  // `width:'100%' + maxWidth` — the percentage+maxWidth form leaves Yoga an
  // indefinite width constraint, which makes nested horizontal ScrollViews
  // (e.g. filter-chip rows) measure their content as zero-width and collapse.
  const bodyWidth = useContentWidth(width);
  // Inset all four edges so a side notch / Dynamic Island in landscape doesn't
  // clip content (portrait only ever needs top/bottom, so this is a superset).
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.bg }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={[styles.body, { width: bodyWidth }, padded && styles.padded]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, alignSelf: 'center' },
  padded: { padding: spacing.lg },
});
