import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { SkeletonForm } from '../../components/Skeleton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';
import { TimezonePickerModal } from '../../components/TimezonePickerModal';
import { useFloatingScroll } from '../../lib/floating-scroll';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../lib/queries';
import { defaultNotificationPreferences } from '../../lib/notification-defaults';
import { spacing } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

const LEAD_OPTIONS = [7, 3, 2, 1, 0]; // days before due; label keys lead_<n>

export default function NotificationPreferences() {
  const { t, language } = useTranslation();
  const { colors } = useAtelierTheme();
  const scroll = useFloatingScroll();
  const prefsQ = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const [tzOpen, setTzOpen] = useState(false);

  // Forgiving fallback: if the request failed and we have nothing cached, show
  // sensible defaults so the controls stay usable. Edits apply optimistically
  // and sync (or replay via the offline queue) when possible.
  const p = prefsQ.data ?? defaultNotificationPreferences(language);
  const offline = prefsQ.isError && !prefsQ.data;
  const loading = prefsQ.isLoading && !prefsQ.data;

  const toggleLead = (day: number) => {
    const next = p.leadDays.includes(day)
      ? p.leadDays.filter((d) => d !== day)
      : [...p.leadDays, day];
    update.mutate({ leadDays: next });
  };

  const shiftHour = (delta: number) => {
    const next = (p.reminderHour + delta + 24) % 24;
    update.mutate({ reminderHour: next });
  };

  return (
    <Screen>
      <ScreenHeader title={t('settings.notifications')} />
      <ScrollView
        {...scroll}
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <SkeletonForm fields={4} />
        ) : (
          <View>
            {offline ? (
              <View style={styles.notifError}>
                <Text variant="caption" tone="textMuted" style={{ flex: 1 }}>
                  {t('settings.notifLoadError')}
                </Text>
                <Button
                  label={t('common.retry')}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => prefsQ.refetch()}
                />
              </View>
            ) : null}

            <ToggleRow
              label={t('settings.dueReminders')}
              value={p.dueRemindersEnabled}
              onValueChange={(v) => update.mutate({ dueRemindersEnabled: v })}
            />

            {p.dueRemindersEnabled ? (
              <>
                <Text variant="bodySm" tone="textMuted" style={styles.notifHint}>
                  {t('settings.remindBefore')}
                </Text>
                <View style={styles.chipRow}>
                  {LEAD_OPTIONS.map((day) => {
                    const active = p.leadDays.includes(day);
                    return (
                      <Pressable
                        key={day}
                        onPress={() => toggleLead(day)}
                        style={[
                          styles.chip,
                          {
                            borderColor: active ? colors.primary : colors.hairline,
                            backgroundColor: active ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          tone={active ? 'textOnPrimary' : 'textMuted'}
                        >
                          {t('settings.lead_' + day)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[styles.timeRow, { borderTopColor: colors.hairline }]}>
                  <Text variant="body" tone="text">
                    {t('settings.reminderTime')}
                  </Text>
                  <View style={styles.stepper}>
                    <Pressable onPress={() => shiftHour(-1)} hitSlop={8} style={styles.stepBtn}>
                      <Ionicons name="remove" size={18} color={colors.text} />
                    </Pressable>
                    <Text variant="body" tone="text" style={styles.stepValue}>
                      {String(p.reminderHour).padStart(2, '0')}:00
                    </Text>
                    <Pressable onPress={() => shiftHour(1)} hitSlop={8} style={styles.stepBtn}>
                      <Ionicons name="add" size={18} color={colors.text} />
                    </Pressable>
                  </View>
                </View>
              </>
            ) : null}

            <ToggleRow
              label={t('settings.overdueReminders')}
              value={p.overdueEnabled}
              onValueChange={(v) => update.mutate({ overdueEnabled: v })}
            />
            <ToggleRow
              label={t('settings.statusUpdates')}
              value={p.statusChangeEnabled}
              onValueChange={(v) => update.mutate({ statusChangeEnabled: v })}
            />

            <Pressable
              style={[styles.timeRow, { borderTopColor: colors.hairline, marginTop: 0 }]}
              onPress={() => setTzOpen(true)}
            >
              <Text variant="body" tone="text">
                {t('settings.timezone')}
              </Text>
              <View style={styles.stepper}>
                <Text variant="bodySm" tone="textMuted" numberOfLines={1}>
                  {p.timezone ?? t('settings.timezoneAuto')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <TimezonePickerModal
        visible={tzOpen}
        current={p.timezone}
        onClose={() => setTzOpen(false)}
        onSelect={(tz) => {
          update.mutate({ timezone: tz });
          setTzOpen(false);
        }}
      />
    </Screen>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useAtelierTheme();
  return (
    <View style={[styles.toggleRow, { borderTopColor: colors.hairline }]}>
      <Text variant="body" tone="text" style={styles.toggleLabel}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notifError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  notifHint: { marginTop: spacing.md, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 9999,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: { padding: 4 },
  stepValue: { minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  toggleLabel: { flex: 1, marginRight: spacing.md },
});
