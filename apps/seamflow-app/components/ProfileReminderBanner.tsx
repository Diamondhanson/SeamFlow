// ============================================================================
// "Complete your profile" — a gentle, dismissible home nudge.
//
// Setting up the shop profile is optional: a tailor can use every feature
// without one. But a complete profile unlocks the public/shared actions (share
// an order, post to the feed…), so we remind skippers "from time to time" — a
// dismiss snoozes it for a few days (see lib/reminders), rather than nagging on
// every launch or vanishing forever after one dismissal.
//
// Renders nothing once the profile exists or while snoozed. Modeled on
// PendingDeletionBanner so it sits in the same spot with the same visual language.
// ============================================================================

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Button } from './Button';
import { useMe } from '../lib/queries';
import { useProfileReminder } from '../lib/reminders';
import { useTranslation } from '../lib/i18n';
import { radii, spacing } from '../lib/theme';

export function ProfileReminderBanner() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const { data: me } = useMe();

  // Only nag while signed in with no shop profile yet.
  const needsProfile = me ? !me.tailor : false;
  const { shouldShow, snooze } = useProfileReminder(needsProfile);

  if (!shouldShow) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.head}>
        <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
        <Text variant="body" tone="text" style={styles.title}>
          {t('home.onboardingHeading')}
        </Text>
      </View>
      <Text variant="bodySm" tone="textMuted" style={styles.body}>
        {t('home.onboardingBody')}
      </Text>
      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <Button label={t('home.remindLater')} variant="ghost" onPress={snooze} />
        </View>
        <View style={styles.actionItem}>
          <Button
            label={t('home.onboardingButton')}
            variant="secondary"
            onPress={() => router.push('/(app)/profile-edit?onboarding=1')}
          />
        </View>
      </View>
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
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionItem: { flex: 1 },
});
