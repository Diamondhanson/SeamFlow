import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activeFontFamilies, Text } from '@seamflow/ui';
import { useEffect } from 'react';
import { useOnline } from '../lib/use-online';
import { BANNER_OWNS_TOP_INSET, setStatusBannerVisible } from '../lib/status-banner';
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
  const insets = useSafeAreaInsets();

  const visible = !(online && pending === 0);

  // Tell the screens below whether the status bar is already covered, so they
  // don't pad for it a second time (lib/status-banner). Cleared on unmount.
  useEffect(() => {
    setStatusBannerVisible(visible);
    return () => setStatusBannerVisible(false);
  }, [visible]);

  if (!visible) return null;

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
      // This sits above the whole router, outside any <Screen>, so nothing else
      // insets it. On iPhone, without the top inset its text is drawn at y=0 —
      // straight behind the clock and the Dynamic Island, where it cannot be read.
      // The colour still runs up under the status bar; only the text is pushed down.
      //
      // iOS only: Android's layout was already right (text centred between the
      // status-bar icons) and is deliberately left exactly as it was.
      style={[
        styles.banner,
        {
          paddingTop: (BANNER_OWNS_TOP_INSET ? insets.top : 0) + spacing.sm,
          backgroundColor: isSyncing ? colors.warning : colors.danger,
        },
      ]}
      // Announced by a screen reader when it appears, not only seen.
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text variant="caption" tone="textOnPrimary" style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: { fontFamily: activeFontFamilies.bodySemibold },
});
