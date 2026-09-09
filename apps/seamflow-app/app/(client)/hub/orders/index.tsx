import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, withAlpha, type SemanticColors } from '@seamflow/ui';
import type { OrderStatus } from '@seamflow/schemas';
import { Screen } from '../../../../components/Screen';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { SkeletonList } from '../../../../components/Skeleton';
import { useConsumerOrders } from '../../../../lib/consumer-queries';
import { spacing, radii } from '../../../../lib/theme';
import { useTranslation } from '../../../../lib/i18n';

const STATUS_TONE: Record<OrderStatus, keyof SemanticColors> = {
  registered: 'statusRegistered',
  in_progress: 'statusInProgress',
  testing: 'statusTesting',
  on_pause: 'statusOnPause',
  delivered: 'statusDelivered',
};

export default function OrdersInbox() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const { data, isLoading } = useConsumerOrders();
  const items = data?.items ?? [];

  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : null);

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        <ScreenHeader
          title={t('corders.inboxTitle')}
          subtitle={t('corders.inboxSubtitle')}
          right={
            <Pressable
              onPress={() => router.push('/hub/claim')}
              accessibilityLabel={t('corders.addOrder')}
              style={[styles.add, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={24} color={colors.textOnPrimary} />
            </Pressable>
          }
        />
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.padded}>
          <SkeletonList leading="square" chip />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shirt-outline" size={40} color={colors.textMuted} />
          <Text variant="h3" style={{ marginTop: spacing.md }}>{t('corders.empty')}</Text>
          <Text variant="bodySm" tone="textMuted" style={styles.emptyHint}>
            {t('corders.emptyHint')}
          </Text>
          <Pressable
            onPress={() => router.push('/hub/claim')}
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={18} color={colors.textOnPrimary} />
            <Text variant="button" tone="textOnPrimary">{t('corders.addOrder')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => {
            const tone = colors[STATUS_TONE[item.status]];
            const due = fmt(item.dateDelivery);
            return (
              <Pressable
                onPress={() => router.push(`/hub/orders/${item.id}`)}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
              >
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={[styles.thumb, { backgroundColor: colors.surfaceElevated }]} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: colors.surfaceElevated }]}>
                    <Ionicons name="shirt-outline" size={22} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text variant="h3" numberOfLines={1}>{item.orderName}</Text>
                  <Text variant="bodySm" tone="textMuted" numberOfLines={1}>
                    {t('corders.madeBy', { name: item.tailorBusinessName })}
                  </Text>
                  <View style={styles.cardMeta}>
                    <View style={[styles.chip, { backgroundColor: withAlpha(tone, 0.16) }]}>
                      <Text variant="caption" style={{ color: tone }}>
                        {t(`corders.status_${item.status}`)}
                      </Text>
                    </View>
                    <Text variant="caption" tone="textMuted">
                      {due ? t('corders.due', { date: due }) : t('corders.noDue')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
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
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderRadius: radii.lg, padding: spacing.md,
  },
  thumb: { width: 56, height: 56, borderRadius: radii.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
});
