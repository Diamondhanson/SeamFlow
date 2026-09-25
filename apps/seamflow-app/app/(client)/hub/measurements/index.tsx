import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { activeFontFamilies, Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../../components/Screen';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { SkeletonList } from '../../../../components/Skeleton';
import type { ConsumerMeasurementSet } from '@seamflow/schemas';
import {
  useConsumerMeasurements,
  useDeleteConsumerMeasurement,
} from '../../../../lib/consumer-queries';
import { useConversations } from '../../../../lib/queries';
import { api } from '../../../../lib/api';
import { useDialog } from '../../../../lib/dialog';
import { spacing, radii } from '../../../../lib/theme';
import { useTranslation } from '../../../../lib/i18n';

export default function MeasurementsLocker() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const { data, isLoading } = useConsumerMeasurements();
  const deleteM = useDeleteConsumerMeasurement();
  const items = data?.items ?? [];

  // The tailors this customer already talks to. Measurements are sent INTO a
  // conversation rather than to an address, because that is where the tailor
  // will look for them, beside the photos and the price they agreed.
  const conversations = useConversations();
  const threads = (conversations.data?.pages ?? []).flatMap((p) => p.items);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sendToTailor = async (set: ConsumerMeasurementSet) => {
    if (threads.length === 0) {
      await dialog.alert({
        title: t('cmeasurements.send'),
        message: t('cmeasurements.sendNone'),
        tone: 'info',
      });
      return;
    }
    // One tailor: no point asking. More than one: ask, because sending body
    // measurements to the wrong person is not a small mistake.
    const chosen =
      threads.length === 1
        ? threads[0]!.id
        : await dialog.pick({
            title: t('cmeasurements.sendPick'),
            options: threads.map((c) => ({ key: c.id, label: c.counterparty.name })),
          });
    if (!chosen) return;
    const thread = threads.find((c) => c.id === chosen);
    setSendingId(set.id);
    try {
      await api.conversations.sendMessage(chosen, {
        clientId: `msr-${set.id}-${Date.now()}`,
        attachments: [
          {
            kind: 'measurement',
            label: set.label,
            values: set.values,
            unitPreference: set.unitPreference,
          },
        ],
      });
      await dialog.alert({
        title: t('cmeasurements.sendDone', { name: thread?.counterparty.name ?? '' }),
        message: '',
        tone: 'success',
      });
    } catch (err) {
      await dialog.error(err, { title: t('cmeasurements.sendFailed') });
    } finally {
      setSendingId(null);
    }
  };

  const confirmDelete = async (id: string) => {
    const ok = await dialog.confirm({
      title: t('cmeasurements.deleteTitle'),
      message: t('cmeasurements.deleteMessage'),
      confirmLabel: t('ccommon.delete'),
      destructive: true,
    });
    if (ok) deleteM.mutate(id, { onError: (e) => void dialog.error(e) });
  };

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        <ScreenHeader
          title={t('cmeasurements.title')}
          subtitle={t('cmeasurements.subtitle')}
          right={
            <Pressable
              onPress={() => router.push('/hub/measurements/edit')}
              accessibilityLabel={t('cmeasurements.add')}
              style={[styles.add, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={24} color={colors.textOnPrimary} />
            </Pressable>
          }
        />
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.padded}>
          <SkeletonList leading="none" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="body-outline" size={40} color={colors.textMuted} />
          <Text variant="h3" style={{ marginTop: spacing.md }}>{t('cmeasurements.empty')}</Text>
          <Text variant="bodySm" tone="textMuted" style={styles.emptyHint}>{t('cmeasurements.emptyHint')}</Text>
          <Pressable
            onPress={() => router.push('/hub/measurements/edit')}
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={18} color={colors.textOnPrimary} />
            <Text variant="button" tone="textOnPrimary">{t('cmeasurements.add')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => {
            const entries = Object.entries(item.values);
            const Card = item.owned ? Pressable : View;
            return (
              <Card
                {...(item.owned
                  ? { onPress: () => router.push({ pathname: '/hub/measurements/edit', params: { id: item.id } }) }
                  : {})}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3">{item.label ?? t('cmeasurements.defaultLabel')}</Text>
                    <Text variant="bodySm" tone="textMuted">
                      {item.owned
                        ? t('cmeasurements.savedByYou')
                        : t('cmeasurements.savedBy', { name: item.tailorBusinessName ?? '' })}
                    </Text>
                  </View>
                </View>
                <View style={styles.values}>
                  {entries.map(([k, v]) => (
                    <View key={k} style={[styles.valueRow, { borderTopColor: colors.hairline }]}>
                      <Text variant="bodySm" tone="textMuted" style={{ flex: 1 }}>{k}</Text>
                      <Text variant="body" numeric>{`${v} ${item.unitPreference}`}</Text>
                    </View>
                  ))}
                </View>

                {/* Named actions, because tapping the card to edit was the only
                    way in and nothing said so. Sending is the point of keeping
                    measurements here at all: they exist to reach a tailor. */}
                {item.owned ? (
                  <View style={[styles.actions, { borderTopColor: colors.hairline }]}>
                    <Pressable
                      onPress={() => void sendToTailor(item)}
                      hitSlop={8}
                      disabled={sendingId === item.id}
                      accessibilityRole="button"
                      style={styles.action}
                    >
                      {sendingId === item.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons name="paper-plane-outline" size={16} color={colors.primary} />
                      )}
                      <Text variant="bodySm" style={{ color: colors.primary, fontFamily: activeFontFamilies.bodySemibold }}>
                        {t('cmeasurements.send')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: '/hub/measurements/edit', params: { id: item.id } })
                      }
                      hitSlop={8}
                      accessibilityRole="button"
                      style={styles.action}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.textMuted} />
                      <Text variant="bodySm" tone="textMuted">{t('cmeasurements.edit')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void confirmDelete(item.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      style={styles.action}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                      <Text variant="bodySm" tone="textMuted">{t('ccommon.delete')}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg },
  add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 96 },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
  emptyHint: { textAlign: 'center', marginTop: spacing.sm },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.lg, paddingHorizontal: spacing.lg, height: 44, borderRadius: 999,
  },
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 2 },
  values: { marginTop: spacing.md },
  valueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1 },
});
