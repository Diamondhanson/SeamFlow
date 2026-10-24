import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { FormScroll } from './FormScroll';
import { spacing, useThemeColors } from '../lib/theme';
import { ScreenBleedContext } from '../lib/screen-bleed';
import { useBannerOwnsTopInset } from '../lib/status-banner';
import { useContentWidth, type ContentWidth } from '../lib/use-breakpoint';

export function Screen({
  children,
  padded = true,
  width = 'reading',
  scroll = false,
  bleed = false,
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
   * Wrap the body in a keyboard-aware scroll view (<FormScroll>). Use on any
   * screen that has text inputs: the focused field scrolls to sit just above
   * the keyboard, driven by the real IME insets — reliable on edge-to-edge
   * Android (incl. tablets) and iOS alike.
   *
   * Don't set this on screens whose body is itself a FlatList or a ScrollView
   * (it would nest scroll views).
   */
  scroll?: boolean;
  /**
   * The body is (or ends in) a FlatList / ScrollView / FormScroll: let it run
   * to the physical bottom edge instead of stopping at the safe-area line.
   *
   * Without this the whole screen is padded above the home indicator, so a card
   * scrolling up is cut off mid-screen with a blank strip beneath it. With it,
   * the bottom inset is handed to the scroll container as trailing padding
   * (lib/screen-bleed.ts), so content slides under the indicator while it
   * scrolls and still comes to rest clear of it. Use the ScrollView / FlatList
   * from components/EdgeScroll, or FormScroll, for the scroller.
   *
   * Leave it off when something is pinned to the bottom (a Save bar, a composer):
   * that has to stay above the indicator, which is exactly what the default does.
   * `scroll` implies it.
   */
  bleed?: boolean;
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
  const insets = useSafeAreaInsets();
  const bleeds = bleed || scroll;
  // Inset all four edges so a side notch / Dynamic Island in landscape doesn't
  // clip content (portrait only ever needs top/bottom, so this is a superset).
  // A bleeding screen gives up the bottom edge: its scroller reaches the
  // physical edge and puts the inset back as trailing padding instead.
  const allEdges: Edge[] = bleeds
    ? ['top', 'left', 'right']
    : ['top', 'bottom', 'left', 'right'];
  // While the offline/syncing banner is up it already covers the status bar, so
  // padding the top again left a dead strip between it and the page. Give the top
  // inset up for as long as the banner is there; take it back when it leaves.
  // (iOS only — see lib/status-banner; always false on Android.)
  const bannerOwnsTop = useBannerOwnsTopInset();
  const edges = bannerOwnsTop ? allEdges.filter((e) => e !== 'top') : allEdges;
  // What the scroller must add to end up exactly where it used to rest: the
  // inset, plus the body's own bottom padding (which a bleed body no longer has,
  // since it would stop the scroller short of the edge).
  const trailing = insets.bottom + (padded ? spacing.lg : 0);
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.bg }]}
      edges={edges}
    >
      {scroll ? (
        <FormScroll
          style={styles.flex}
          // This scroller is Screen's own, so it adds the inset itself; the body
          // inside keeps its padding, which is what sits above it.
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.grow, { width: bodyWidth }, padded && styles.padded]}>
            {children}
          </View>
        </FormScroll>
      ) : (
        <View
          style={[
            styles.body,
            { width: bodyWidth },
            padded && styles.padded,
            bleed && styles.bleedBody,
          ]}
        >
          <ScreenBleedContext.Provider value={bleed ? trailing : 0}>
            {children}
          </ScreenBleedContext.Provider>
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
  // Declared after `padded` so it wins: no bottom padding, or the scroller
  // would stop that far short of the edge.
  bleedBody: { paddingBottom: 0 },
});
