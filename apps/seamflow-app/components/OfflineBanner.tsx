import { StyleSheet, Text, View } from 'react-native';
import { useOnline } from '../lib/use-online';
import { usePendingMutations } from '../lib/use-pending-mutations';
import { colors, spacing } from '../lib/theme';

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
  const online = useOnline();
  const pending = usePendingMutations();

  if (online && pending === 0) return null;

  const isSyncing = online && pending > 0;
  const text = !online
    ? pending > 0
      ? `Offline — ${pending} change${pending === 1 ? '' : 's'} will sync when reconnected`
      : "You're offline"
    : `Syncing ${pending} change${pending === 1 ? '' : 's'}…`;

  return (
    <View style={[styles.banner, isSyncing ? styles.bannerSync : styles.bannerOffline]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  bannerOffline: { backgroundColor: colors.danger },
  bannerSync: { backgroundColor: '#f5a524' },
  text: { color: colors.accentText, fontSize: 12, fontWeight: '600' },
});
