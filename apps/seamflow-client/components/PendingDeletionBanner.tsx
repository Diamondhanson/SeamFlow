// ============================================================================
// "Your account closes in N days" — consumer side.
//
// Same reasoning as the tailor app's copy of this: a cancel button nobody can
// find is not a grace period. One tap, no password, no confirmation, sitting
// at the top of the first screen they see.
// ============================================================================

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Button } from './Button';
import { api } from '../lib/api';
import { useMe } from '../lib/queries';
import { useDialog } from '../lib/dialog';
import { useTranslation } from '../lib/i18n';
import { radii, spacing } from '../lib/theme';

export function PendingDeletionBanner() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const { data: me, refetch } = useMe();

  const deletion = me?.deletion;
  if (!deletion?.requestedAt) return null;

  const days = deletion.daysRemaining ?? 0;

  const onCancel = async () => {
    try {
      await api.account.cancelDeletion();
      await refetch();
      await dialog.alert({
        title: t('account.keptTitle'),
        message: t('account.keptBody'),
        tone: 'success',
      });
    } catch (err) {
      await dialog.error(err);
    }
  };

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}
    >
      <View style={styles.head}>
        <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
        <Text variant="body" tone="text" style={styles.title}>
          {days > 0 ? t('account.pendingTitle', { days }) : t('account.pendingTitleToday')}
        </Text>
      </View>
      <Text variant="bodySm" tone="textMuted" style={styles.body}>
        {t('account.pendingBody')}
      </Text>
      <Button label={t('account.keepAccount')} variant="secondary" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontWeight: '600' },
  body: { marginBottom: spacing.xs },
});
