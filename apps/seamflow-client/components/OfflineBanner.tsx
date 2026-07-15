import { StyleSheet, View } from 'react-native';
import { Text } from '@seamflow/ui';
import { useOnline } from '../lib/use-online';
import { usePendingMutations } from '../lib/use-pending-mutations';
import { useTranslation } from '../lib/i18n';
import { spacing, useThemeColors } from '../lib/theme';

/**
 * Top-of-screen banner that surfaces connectivity + sync state:
 *   - Offline with pending: red, "Offline — N changes will sync when reconnected"
 *   - Offline with no pending: red, "You're offline"
 *   - Online with pending (currently syncing): amber, "Syncing N change(s)…"
 *   - Online with nothing pending: hidden
 *
 * The visible-while-online state matters because the persisted mutation
 * queue can hold paused mutations across app restarts — when the app boots
 * online with queued work from a previous offline session, we want the user
 * to see the sync happen rather than wonder where their edits went.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnline();
  const pending = usePendingMutations();
  const colors = useThemeColors();

  if (online && pending === 0) return null;

  const isSyncing = online && pending > 0;
  const text = !online
    ? pending > 0
      ? t('misc.offlineWithPending', {
          count: pending,
          plural: pending === 1 ? '' : 's',
        })
      : t('misc.youreOffline')
    : t('misc.syncing', { count: pending, plural: pending === 1 ? '' : 's' });

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: isSyncing ? colors.warning : colors.danger },
      ]}
    >
      <Text variant="caption" tone="textOnPrimary" style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: { fontWeight: '600' },
});
