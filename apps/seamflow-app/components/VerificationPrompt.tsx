// ============================================================================
// "Get verified" — the home nudge (appendix J.3).
//
// This is the prompt that decides whether anyone ever verifies, so two choices
// in it are deliberate.
//
// IT SNOOZES, IT DOES NOT DISMISS FOREVER.
//
// The Getting-started checklist dismisses permanently, which is right for
// onboarding: those steps are things you must do to run the app. Verification
// is not onboarding and is not required, so "dismiss forever" would mean we ask
// once, catch whoever happened to be ready that day, and never ask again. A
// tailor who was not ready in week one may well be ready in week three. Seven
// days, longer than the profile nudge's three, because asking repeatedly for
// something optional reads as pressure.
//
// IT IS NOT A CHECKLIST STEP.
//
// Putting it in Getting started would frame it as required and turn "4 of 6
// done" into a failing grade for someone who deliberately skipped it. That
// breaks appendix J's one rule at the level of tone, which is the level that
// actually reaches people.
//
// The copy names the BENEFIT rather than the chore. "Get verified" with a tick
// icon reads as admin; what a tailor cares about is that clients can tell their
// work is their own.
// ============================================================================

import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { activeFontFamilies, Text, useAtelierTheme } from '@seamflow/ui';
import { Button } from './Button';
import { useMe, useVerification } from '../lib/queries';
import { useVerificationReminder } from '../lib/reminders';
import { useTranslation } from '../lib/i18n';
import { radii, spacing } from '../lib/theme';

export function VerificationPrompt() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const { data: me } = useMe();
  const { data: state } = useVerification();

  const request = state?.request ?? null;

  // Every reason this is not the moment. Each one is a different mistake:
  //
  //   available   — the server has no OTP provider, so step one is impossible
  //   tailor      — no shop yet; the profile nudge owns this moment, and two
  //                 stacked nudges is nagging
  //   isVerified  — they already have it
  //   pending     — it is with us; asking again while WE are the slow ones is
  //                 insulting
  //
  // A REJECTED request deliberately does not suppress it: there is now
  // something to act on, and the screen carries the reason.
  const relevant =
    Boolean(state?.available) &&
    Boolean(me?.tailor) &&
    !state?.isVerified &&
    request?.status !== 'pending';

  const { shouldShow, snooze } = useVerificationReminder(relevant);
  if (!shouldShow) return null;

  const declined = request?.status === 'rejected';

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.head}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        <Text variant="body" tone="text" style={styles.title}>
          {declined ? t('verification.promptDeclinedTitle') : t('verification.promptTitle')}
        </Text>
      </View>
      <Text variant="bodySm" tone="textMuted" style={styles.body}>
        {declined ? t('verification.promptDeclinedBody') : t('verification.promptBody')}
      </Text>
      {/* Dismiss on the left, action on the right, each in its own flex item —
          the same shape as ProfileReminderBanner, because two nudges on one
          screen that handle their buttons differently look like a bug.
          `secondary`, not primary: an optional prompt must not shout louder
          than "Start new order" three rows above it. */}
      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <Button label={t('verification.promptLater')} variant="ghost" onPress={snooze} />
        </View>
        <View style={styles.actionItem}>
          <Button
            label={
              declined ? t('verification.promptDeclinedAction') : t('verification.promptAction')
            }
            variant="secondary"
            onPress={() => router.push('/(app)/verification')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    // Owns the gap ABOVE it as well as below. What precedes this on the home
    // screen varies — "Start new order", the Getting-started card, or nothing
    // at all — and none of those carry a bottom margin, so a nudge that only
    // spaced itself downwards sat flush against the CTA.
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontFamily: activeFontFamilies.bodySemibold },
  body: { marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionItem: { flex: 1 },
});
