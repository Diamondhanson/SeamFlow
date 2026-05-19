import { StyleSheet, Text, View } from 'react-native';
import { useOnline } from '../lib/use-online';
import { colors, spacing } from '../lib/theme';

/**
 * Slim top-of-screen banner that surfaces "offline" when the device has no
 * connection. Reads/writes still work locally (last-known-good cache + queued
 * mutations); the banner just tells the user what's happening.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You're offline — changes will sync when reconnected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: { color: colors.accentText, fontSize: 12, fontWeight: '600' },
});
