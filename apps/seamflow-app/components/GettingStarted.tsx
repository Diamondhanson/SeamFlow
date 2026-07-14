// ============================================================================
// <GettingStarted> — a first-timer checklist on the home screen.
//
// Shows a brand-new user the handful of steps to get their shop going: add a
// client, create an order, save a template (the shop profile is already done
// by the time this shows, so it lands pre-ticked as a little "1 of 4" win).
//
// Ticks derive from live data, so they fill in as the user actually does each
// thing. The card fades for good once every step is done OR the user dismisses
// it — remembered per device via GuidesProvider (guideKey "home.checklist").
// ============================================================================

import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, IconButton, useAtelierTheme } from '@seamflow/ui';
import { useGuides } from '../lib/guides';
import { useMe, useClients, useOrders, useTemplates } from '../lib/queries';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

const GUIDE_KEY = 'home.checklist';

export function GettingStarted() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const { ready, isDismissed, dismiss } = useGuides();

  const { data: me } = useMe();
  const { data: clientsData } = useClients('');
  const { data: ordersData } = useOrders({});
  const { data: templatesData } = useTemplates();

  const steps = [
    {
      key: 'profile',
      label: t('guides.checklistProfile'),
      done: !!me?.tailor,
      go: () => router.push('/(app)/me'),
    },
    {
      key: 'client',
      label: t('guides.checklistClient'),
      done: (clientsData?.items.length ?? 0) > 0,
      go: () => router.push('/(app)/clients/new'),
    },
    {
      key: 'order',
      label: t('guides.checklistOrder'),
      done: (ordersData?.items.length ?? 0) > 0,
      go: () => router.push('/(app)/new-order'),
    },
    {
      key: 'template',
      label: t('guides.checklistTemplate'),
      done: (templatesData?.items.length ?? 0) > 0,
      go: () => router.push('/(app)/templates'),
    },
  ];

  // Wait until the cached data has hydrated so we don't flash a wrong count.
  const loaded =
    me != null && clientsData != null && ordersData != null && templatesData != null;
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (!ready || !loaded || allDone || isDismissed(GUIDE_KEY)) return null;

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
