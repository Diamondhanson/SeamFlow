import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../../components/Screen';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { SkeletonList } from '../../../../components/Skeleton';
import {
  useConsumerMeasurements,
  useDeleteConsumerMeasurement,
} from '../../../../lib/consumer-queries';
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
                  {item.owned ? (
                    <Pressable onPress={() => void confirmDelete(item.id)} hitSlop={8} style={styles.trash}>
                      <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.values}>
                  {entries.map(([k, v]) => (
                    <View key={k} style={[styles.valueRow, { borderTopColor: colors.hairline }]}>
                      <Text variant="bodySm" tone="textMuted" style={{ flex: 1 }}>{k}</Text>
                      <Text variant="body" numeric>{`${v} ${item.unitPreference}`}</Text>
                    </View>
                  ))}
                </View>
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
  trash: { padding: spacing.xs },
  values: { marginTop: spacing.md },
  valueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1 },
});
