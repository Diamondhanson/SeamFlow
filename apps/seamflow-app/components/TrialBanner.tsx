// ============================================================================
// <TrialBanner> — the only place the app volunteers anything about money.
//
// It appears in the last two weeks of the trial, and stays while a tailor is
// on Free. Not before: a countdown running from day one is noise for a month,
// and by the time it matters everyone has learned to look past it.
//
// The wording carries the promise the whole model rests on — you keep your
// work — because a tailor reading "your trial is ending" is, at that moment,
// wondering whether they are about to lose their clients.
// ============================================================================

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { activeFontFamilies, Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { shouldNagAboutTrial, useSubscription } from '../lib/subscription';
import { canSellSubscriptions } from '../lib/platform-capabilities';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export function TrialBanner() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const sub = useSubscription();
  // Dismissal lasts for this app session only. It is a nudge, not a decision,
  // and a tailor who dismissed it a month ago still needs to know.
  const [hidden, setHidden] = useState(false);

  if (hidden || !shouldNagAboutTrial(sub) || !sub) return null;

  const trialing = sub.status === 'trialing';
  const title = trialing
    ? sub.daysLeft <= 1
      ? t('billing.trialEndsToday')
      : t('billing.trialTitle')
    : t('billing.freeTitle');
  const body = trialing
    ? t('billing.trialBody', { days: sub.daysLeft })
    : t('billing.freeBody');

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: withAlpha(colors.primary, 0.1),
          borderColor: withAlpha(colors.primary, 0.35),
          borderRadius: radii.lg,
        },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        <Text variant="bodySm" style={[styles.title, { color: colors.primary }]}>
          {title}
        </Text>
        <Pressable
          onPress={() => setHidden(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('billing.dismiss')}
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      <Text variant="bodySm" tone="textMuted" style={styles.body}>
        {body}
      </Text>
      {/* The store builds get no call to action: Apple and Google both forbid
          pointing at a way to pay outside their own. The banner still reports
          where the tailor stands, which is status, not selling. */}
      {canSellSubscriptions ? (
        <Pressable
          onPress={() => router.push('/(app)/upgrade' as never)}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.cta}
        >
          <Text variant="bodySm" style={{ color: colors.primary, fontFamily: activeFontFamilies.bodySemibold }}>
            {t('billing.seePlans')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, padding: spacing.md, marginBottom: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontFamily: activeFontFamilies.bodySemibold },
  body: { lineHeight: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.xs },
});
