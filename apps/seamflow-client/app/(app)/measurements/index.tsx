import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonList } from '../../../components/Skeleton';
import { useConsumerMeasurements } from '../../../lib/queries';
import { spacing, radii } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

export default function MeasurementsLocker() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const { data, isLoading } = useConsumerMeasurements();
  const items = data?.items ?? [];

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        <ScreenHeader title={t('measurements.title')} subtitle={t('measurements.subtitle')} />
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.padded}>
          <SkeletonList leading="none" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="body-outline" size={40} color={colors.textMuted} />
          <Text variant="h3" style={{ marginTop: spacing.md }}>{t('measurements.empty')}</Text>
          <Text variant="bodySm" tone="textMuted" style={styles.emptyHint}>{t('measurements.emptyHint')}</Text>
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
            return (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                <Text variant="h3">{item.label}</Text>
                <Text variant="bodySm" tone="textMuted">{t('measurements.savedBy', { name: item.tailorBusinessName })}</Text>
                <View style={styles.values}>
                  {entries.map(([k, v]) => (
                    <View key={k} style={[styles.valueRow, { borderTopColor: colors.hairline }]}>
                      <Text variant="bodySm" tone="textMuted" style={{ flex: 1 }}>{k}</Text>
                      <Text variant="body" numeric>{`${v} ${item.unitPreference}`}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 96 },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
  emptyHint: { textAlign: 'center', marginTop: spacing.sm },
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg },
  values: { marginTop: spacing.md },
  valueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1 },
});
