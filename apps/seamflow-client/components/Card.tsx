// ============================================================================
// <Card> — the surface every list row and detail block in this app already
// draws by hand.
//
// Extracted rather than invented: the shape here (1px hairline border, large
// radius, surface fill) is exactly what orders/index.tsx and the discover
// screens were each defining in their own StyleSheet. Requests would have been
// the fourth copy, and four copies is where they start to drift apart.
// ============================================================================

import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { radii, spacing } from '../lib/theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useAtelierTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.hairline },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <Text variant="body">{children}</Text>;
}

export function CardLine({ children }: { children: ReactNode }) {
  return (
    <Text variant="bodySm" tone="textMuted" style={styles.line}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 2,
  },
  line: { marginTop: 2 },
});
