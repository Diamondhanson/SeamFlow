import { type ReactNode } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, useThemeColors } from '../lib/theme';
import { useContentWidth, type ContentWidth } from '../lib/use-breakpoint';

export function Screen({
  children,
  padded = true,
  width = 'reading',
  scroll = false,
}: {
  children: ReactNode;
  padded?: boolean;
  /**
   * Content-width cap. `'reading'` (default, 760) for forms and detail screens;
   * `'wide'` (1120) for browse/overview surfaces (dashboard, lists, grids,
   * calendar) that should fill more of a tablet's width.
   */
  width?: ContentWidth;
  /**
   * Wrap the body in a keyboard-aware ScrollView. Use on any screen that has
   * text inputs: the focused field scrolls to sit just above the keyboard —
   * but ONLY when the keyboard would otherwise cover it (iOS
   * `automaticallyAdjustKeyboardInsets`; Android window `adjustResize`). If
   * nothing is covered, nothing moves.
   *
   * Don't set this on screens whose body is itself a FlatList or a ScrollView
   * (it would nest scroll views).
   */
  scroll?: boolean;
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
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.grow, { width: bodyWidth }, padded && styles.padded]}>
            {children}
          </View>
        </ScrollView>
      ) : (
        <View style={[styles.body, { width: bodyWidth }, padded && styles.padded]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  // Center the width-capped body; grow so short forms still fill the viewport
  // (bottom-anchored buttons stay put) while long ones scroll.
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  grow: { flexGrow: 1 },
  body: { flex: 1, alignSelf: 'center' },
  padded: { padding: spacing.lg },
});
