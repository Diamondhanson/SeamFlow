// ============================================================================
// <ScreenHeader> — the inline large-title header used on every in-app screen.
//
// Replaces the native nav bar (which is hidden app-wide). Layout:
//
//   [‹ back]   Big Fraunces title              [right action?]
//              optional mono/muted subtitle
//
// - `showBack` defaults to true; the header always offers a back affordance
//   even though the floating logo is also present (per product requirement).
//   Home passes showBack={false}.
// - `onBack` defaults to router.back().
// - `right` is an optional node (e.g. an IconButton "+" or a prev/next pair).
// ============================================================================

import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, IconButton, useAtelierTheme, spacing } from '@seamflow/ui';
import { isWeb } from '../lib/platform-capabilities';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Render subtitle in mono (e.g. a year "2026"). */
  subtitleNumeric?: boolean;
  right?: ReactNode;
  /**
   * A small node rendered immediately after the title, on the same line.
   *
   * For marks that BELONG to the title rather than acting on the screen — a
   * verified tick beside a shop's name. Distinct from `right`, which is an
   * action and sits at the far edge; putting a badge there would read as
   * something to press to change the screen.
   */
  titleAccessory?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  subtitleNumeric,
  right,
  titleAccessory,
  showBack = true,
  onBack,
}: ScreenHeaderProps) {
  const { colors } = useAtelierTheme();
  const pathname = usePathname();

  // Web: every screen renders this header, so it's the natural place to keep
  // the browser tab / history entry in sync. Native ignores it.
  useEffect(() => {
    if (!isWeb || !title) return;
    try {
      if (globalThis.document) globalThis.document.title = `${title} · SeamFlow`;
    } catch {
      // no DOM — nothing to do
    }
  }, [title]);

  /**
   * Back, and never a dead button.
   *
   * Tab switches replace rather than push (see components/BottomNav), so a tab
   * screen has nothing behind it — and `router.back()` on an empty stack does
   * nothing at all. The chevron was still drawn, so it read as broken.
   *
   * When there is no history we go UP instead: to the home of whichever side
   * the person is on. That is not a workaround for the tab change — on Android
   * a toolbar arrow has always meant Up ("go to the parent"), which for a tab
   * screen is the section's home. Back and Up are different affordances and
   * this is the one a header chevron is.
   *
   * It also fixes a case that predates all of this: open a notification or a
   * shared link straight into a detail screen and the stack is one deep, so the
   * chevron was equally dead there. Now it lands you somewhere real.
   */
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // `/discover` and `/hub` are the customer side; everything else is the
    // designer's. `/t/<slug>` is a public shopfront reachable from either, so
    // it is deliberately NOT treated as customer-only — whoever opened it gets
    // sent to their own home rather than across the app.
    const onClientSide = pathname.startsWith('/discover') || pathname.startsWith('/hub');
    router.replace((onClientSide ? '/(client)/discover' : '/(app)') as never);
  };

  return (
    <View style={styles.container}>
      {showBack ? (
        <IconButton
          variant="surface"
          size="md"
          onPress={onBack ?? goBack}
          style={styles.back}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </IconButton>
      ) : null}

      <View style={styles.titleWrap}>
        <View style={styles.titleRow}>
          {/* The title shrinks rather than pushing the accessory off the edge:
              a long shop name must not be able to hide the verified mark. */}
          <Text variant="h1" numberOfLines={1} style={styles.titleText}>
            {title}
          </Text>
          {titleAccessory}
        </View>
        {subtitle ? (
          <Text
            variant={subtitleNumeric ? 'mono' : 'bodySm'}
            tone="textMuted"
            style={{ marginTop: 2 }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { flexShrink: 1 },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.s,
    paddingBottom: spacing.m,
    gap: spacing.m,
  },
  back: {},
  titleWrap: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
});
