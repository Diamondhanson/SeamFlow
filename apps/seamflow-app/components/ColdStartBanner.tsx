// ============================================================================
// <ColdStartBanner> — names the wait when the API is cold.
//
// The free-tier host sleeps when idle; the first request after that can take
// 30-60s. A silent stall reads as "the app is broken" — this banner appears
// only when loading has dragged past a threshold (so warm loads never see
// it), tells the user the app is waking up, and disappears on its own.
// ============================================================================

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

/** How long loading must persist before we surface the banner. */
const SHOW_AFTER_MS = 3000;

export function ColdStartBanner({ loading }: { loading: boolean }) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!show || !loading) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: withAlpha(colors.warning, 0.1),
          borderColor: withAlpha(colors.warning, 0.3),
        },
      ]}
    >
      <ActivityIndicator size="small" color={colors.warning} />
      <View style={styles.textCol}>
        <Text variant="bodySm" style={styles.title}>
          {t('home.wakingTitle')}
        </Text>
        <Text variant="caption" tone="textMuted">
          {t('home.wakingBody')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  textCol: { flex: 1 },
  title: { fontFamily: 'Inter_600SemiBold' },
});
