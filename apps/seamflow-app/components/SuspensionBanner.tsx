// ============================================================================
// <SuspensionBanner> — why nothing is working.
//
// A suspended account can still read everything it ever made; what it cannot
// do is change anything. Without this banner that arrives as a series of
// refused buttons with no explanation, which is the worst possible way to
// learn it. So: say it once, at the top, with the reason we gave, and point
// at the one door that is still open.
//
// Not dismissible. This is not a nudge.
// ============================================================================

import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { Button } from './Button';
import { useMe } from '../lib/queries';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export function SuspensionBanner({ support }: { support: string }) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const me = useMe();
  const suspension = me.data?.suspension ?? null;
  if (!suspension) return null;

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: withAlpha(colors.danger, 0.1), borderColor: colors.danger, borderRadius: radii.lg },
      ]}
    >
      <View style={styles.head}>
        <Ionicons name="alert-circle" size={18} color={colors.danger} />
        <Text variant="bodySm" style={{ flex: 1, fontWeight: '700' }}>
          {t('account.suspendedTitle')}
        </Text>
      </View>
      <Text variant="bodySm" tone="textMuted">
        {suspension.reason?.trim()
          ? t('account.suspendedReason', { reason: suspension.reason.trim() })
          : t('account.suspendedBody')}
      </Text>
      <Text variant="caption" tone="textMuted" style={{ marginTop: spacing.xs }}>
        {t('account.suspendedKeepsData')}
      </Text>
      <View style={{ marginTop: spacing.sm }}>
        <Button
          label={t('account.suspendedContact')}
          variant="secondary"
          onPress={() => router.push(support as never)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, gap: 4, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
