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

import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, IconButton, useAtelierTheme, spacing } from '@seamflow/ui';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Render subtitle in mono (e.g. a year "2026"). */
  subtitleNumeric?: boolean;
  right?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  subtitleNumeric,
  right,
  showBack = true,
  onBack,
}: ScreenHeaderProps) {
  const { colors } = useAtelierTheme();

  return (
    <View style={styles.container}>
      {showBack ? (
        <IconButton
          variant="surface"
          size="md"
          onPress={onBack ?? (() => router.back())}
          style={styles.back}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </IconButton>
      ) : null}

      <View style={styles.titleWrap}>
        <Text variant="h1" numberOfLines={1}>
          {title}
        </Text>
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
