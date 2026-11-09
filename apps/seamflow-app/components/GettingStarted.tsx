// ============================================================================
// <GettingStarted> — a first-timer checklist on the home screen.
//
// Shows a brand-new user the steps to get their shop going. Three always:
//   1. Tell us what you make   (specialties)
//   2. Save a measurement template
//   3. Create your first order (a new client can be added right inside it)
// and a fourth, "Set up your shop", slotted in as step 2 ONLY for someone who
// skipped the business-name-and-location form that follows "I'm a designer".
// Someone who filled it in is never asked again. Tapping it opens that form.
//
// Ticks derive from live data, so they fill in as the user actually does each
// thing. The card fades for good once every step is done OR the user dismisses
// it — remembered per device via GuidesProvider (guideKey "home.checklist").
// ============================================================================

import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, IconButton, useAtelierTheme } from '@seamflow/ui';
import { SkeletonLine } from './Skeleton';
import { useGuides } from '../lib/guides';
import { useMe, useOrders, useTemplates } from '../lib/queries';
import { hasShopBasics } from '../lib/shop-setup';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

// Bumped from 'home.checklist' when specialties became the first step.
//
// Tailors who signed up before the garment taxonomy existed have no
// specialties set, and matching cannot work without them — but they had
// already dismissed the old checklist, so a new step added to it would never
// have been seen. A new key resurfaces the card exactly once for them, with
// every other step already ticked, so it reads as "one new thing to do"
// rather than as onboarding starting over.
const GUIDE_KEY = 'home.checklist.v2';

export function GettingStarted() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const { ready, isDismissed, dismiss } = useGuides();

  const { data: me } = useMe();
  const { data: ordersData } = useOrders({});
  const { data: templatesData } = useTemplates();

  const steps = [
    {
      // First on purpose. It is the cheapest step, it is the one that makes a
      // tailor findable, and everything about matching clients to tailors
      // reads from it.
      key: 'specialties',
      label: t('specialties.checklistLabel'),
      done: (me?.tailor?.specialties?.length ?? 0) > 0,
      go: () => router.push('/(app)/specialties'),
    },
    // Only for someone who skipped the shop form. Once a name and location are
    // saved the row disappears rather than ticking, so the list is simply the
    // three everyone gets. It opens the form itself, not Settings.
    ...(hasShopBasics(me?.tailor)
      ? []
      : [
          {
            key: 'profile',
            label: t('guides.checklistProfile'),
            done: false,
            go: () => router.push('/(app)/profile-edit'),
          },
        ]),
    {
      key: 'template',
      label: t('guides.checklistTemplate'),
      done: (templatesData?.items.length ?? 0) > 0,
      go: () => router.push('/(app)/templates'),
    },
    {
      // A client is added inside the order flow, so there is no separate step.
      key: 'order',
      label: t('guides.checklistOrder'),
      done: (ordersData?.items.length ?? 0) > 0,
      go: () => router.push('/(app)/new-order'),
    },
  ];

  // Wait until the cached data has hydrated so we don't flash a wrong count.
  const loaded = me != null && ordersData != null && templatesData != null;
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (!ready || isDismissed(GUIDE_KEY)) return null;

  // Data still loading (cold start / first sign-in): hold the checklist's spot
  // with a shimmer card instead of rendering nothing — an empty stretch of
  // screen reads as "broken", a loading card reads as "on its way".
  if (!loaded) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
      >
        <Text variant="h3">{t('guides.checklistTitle')}</Text>
        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          <SkeletonLine width="70%" />
          <SkeletonLine width="55%" />
          <SkeletonLine width="62%" />
        </View>
      </View>
    );
  }

  if (allDone) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="h3">{t('guides.checklistTitle')}</Text>
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: 2 }}>
            {t('guides.checklistSubtitle')}
          </Text>
        </View>
        <IconButton
          variant="ghost"
          size="sm"
          onPress={() => dismiss(GUIDE_KEY)}
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </IconButton>
      </View>

      <Text variant="caption" tone="textMuted" style={styles.progress}>
        {t('guides.checklistProgress', { done: doneCount, total: steps.length })}
      </Text>

      {steps.map((s, i) => (
        <Pressable
          key={s.key}
          onPress={s.done ? undefined : s.go}
          disabled={s.done}
          style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.hairline }]}
        >
          <Ionicons
            name={s.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={s.done ? colors.success : colors.textMuted}
          />
          <Text
            variant="body"
            tone={s.done ? 'textMuted' : 'text'}
            style={[styles.label, s.done && styles.labelDone]}
          >
            {s.label}
          </Text>
          {!s.done ? (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    // Same reason as the verification nudge: the home CTA above it carries no
    // bottom margin, so this card has to space itself away from it.
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1 },
  progress: { marginTop: spacing.sm, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  label: { flex: 1 },
  labelDone: { textDecorationLine: 'line-through' },
});
