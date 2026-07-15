import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, withAlpha, type SemanticColors } from '@seamflow/ui';
import type { OrderStatus } from '@seamflow/schemas';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonDetail } from '../../../components/Skeleton';
import { useConsumerOrder } from '../../../lib/queries';
import { spacing, radii } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

const STATUS_TONE: Record<OrderStatus, keyof SemanticColors> = {
  registered: 'statusRegistered',
  in_progress: 'statusInProgress',
  testing: 'statusTesting',
  on_pause: 'statusOnPause',
  delivered: 'statusDelivered',
};

export default function ConsumerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const { data, isLoading } = useConsumerOrder(id);

  if (isLoading || !data) {
    return (
      <Screen>
        <ScreenHeader title={t('orders.detailTitle')} />
        <SkeletonDetail />
      </Screen>
    );
  }

  const { order, items, photos, events, tailor } = data;
  const tone = colors[STATUS_TONE[order.status]];
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : null);
  const statusChanges = events.filter((e) => !!e.toStatus);

  return (
    <Screen>
      <ScreenHeader title={order.orderName} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
        {/* Summary */}
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <View style={[styles.chip, { backgroundColor: withAlpha(tone, 0.16), alignSelf: 'flex-start' }]}>
            <Text variant="caption" style={{ color: tone }}>{t(`orders.status_${order.status}`)}</Text>
          </View>
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
            {t('orders.madeBy', { name: tailor.businessName })}
          </Text>
          <Text variant="bodySm" tone="textMuted">{t('orders.ordered', { date: fmt(order.dateOrdered) ?? '—' })}</Text>
          <Text variant="bodySm" tone="textMuted">
            {order.dateDelivery ? t('orders.due', { date: fmt(order.dateDelivery)! }) : t('orders.noDue')}
          </Text>
        </View>

        {/* Photos */}
        {photos.length > 0 ? (
          <Section title={t('orders.photosSection')} colors={colors}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
              {photos.map((p) => {
                const url = p.thumbnailUrl ?? p.signedUrl;
                return url ? (
                  <Image key={p.id} source={{ uri: url }} style={[styles.photo, { backgroundColor: colors.surface }]} />
                ) : null;
              })}
            </ScrollView>
          </Section>
        ) : null}

        {/* Pieces */}
        {items.length > 0 ? (
          <Section title={t('orders.itemsSection')} colors={colors}>
            {items.map((it) => (
              <View key={it.id} style={[styles.itemRow, { borderTopColor: colors.hairline }]}>
                <Ionicons name="shirt-outline" size={18} color={colors.textMuted} />
                <Text variant="body" style={{ flex: 1 }}>{it.garmentType}</Text>
                <Text variant="bodySm" tone="textMuted">{t('orders.quantity', { count: it.quantity })}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {/* Progress timeline */}
        {statusChanges.length > 0 ? (
          <Section title={t('orders.timelineSection')} colors={colors}>
            {statusChanges.map((e) => (
              <View key={e.id} style={styles.timelineRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodySm">
                    {t('orders.updatedTo', { status: t(`orders.status_${e.toStatus as OrderStatus}`) })}
                  </Text>
                  <Text variant="caption" tone="textMuted">{fmt(e.createdAt) ?? ''}</Text>
                </View>
              </View>
            ))}
          </Section>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, colors, children }: { title: string; colors: SemanticColors; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <Text variant="label" tone="textMuted" style={{ marginBottom: spacing.sm }}>{title}</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
  section: { borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  photoStrip: { gap: spacing.sm, padding: spacing.md },
  photo: { width: 120, height: 120, borderRadius: radii.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
});
