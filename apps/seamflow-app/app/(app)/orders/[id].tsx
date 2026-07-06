import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '@seamflow/schemas';
import { nextOrderStatuses } from '@seamflow/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { Text, Chip, type ChipTone, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import {
  qk,
  useClient,
  useDeleteOrder,
  useDeleteOrderPhoto,
  useMe,
  useOrder,
  useOrderPhotos,
  useTransitionOrder,
} from '../../../lib/queries';
import { useShareOrder } from '../../../lib/share-order';
import { pickPhoto, uploadAndRegister } from '../../../lib/photo-upload';
import { alertIfPermissionDenied } from '../../../lib/permissions';
import { useDialog } from '../../../lib/dialog';
import { radii, spacing, useThemeColors } from '../../../lib/theme';
import { useResponsiveValue } from '../../../lib/use-breakpoint';
import { useTranslation } from '../../../lib/i18n';

const STATUS_TONE: Record<OrderStatus, ChipTone> = {
  registered: 'statusRegistered',
  in_progress: 'statusInProgress',
  testing: 'statusTesting',
  on_pause: 'statusOnPause',
  delivered: 'statusDelivered',
};

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const statusLabel = (s: OrderStatus) => t(`orders.status_${s}`);
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const orderQ = useOrder(id);
  const photosQ = useOrderPhotos(id);
  const transitionM = useTransitionOrder(id);
  const deletePhotoM = useDeleteOrderPhoto(id);
  const deleteOrderM = useDeleteOrder(id);
  const shareOrderHook = useShareOrder(id);
  const meQ = useMe();
  // Pull client lazily so we have a phone for the WhatsApp deep link.
  // `enabled` in useClient already short-circuits when the id is empty.
  const clientQ = useClient(orderQ.data?.clientId ?? '');
  const [uploading, setUploading] = useState(false);
  const colors = useThemeColors();
  const theme = useAtelierTheme();
  const dialog = useDialog();
  // Photos fill more of the (reading-width) detail column on larger screens.
  const thumbSize = useResponsiveValue({ compact: 120, medium: 140, expanded: 160 });
  const scroll = useFloatingScroll();

  const order = orderQ.data ?? null;
  const photos = photosQ.data?.items ?? [];
  const loading = orderQ.isLoading;

  const transition = (to: OrderStatus) =>
    transitionM.mutate(
      { to },
      { onError: (err) => void dialog.error(err) },
    );

  const addPhoto = async (source: 'camera' | 'library') => {
    if (!order) return;
    setUploading(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return; // user cancelled
      await uploadAndRegister({
        tailorId: order.tailorId,
        orderId: order.id,
        asset,
      });
      // Photo upload bypasses TanStack Query (it uses Supabase Storage
      // directly + the api-client raw call), so invalidate manually.
      qc.invalidateQueries({ queryKey: qk.orderPhotos(id) });
    } catch (err) {
      if (!(await alertIfPermissionDenied(err, dialog, t))) {
        await dialog.error(err);
      }
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    const ok = await dialog.confirm({
      title: t('orders.deletePhotoTitle'),
      message: t('orders.deletePhotoMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    deletePhotoM.mutate(photoId, { onError: (err) => void dialog.error(err) });
  };

  const shareWithClient = () => {
    if (!order) return;
    // We pass client + tailor info so the hook can build a friendly message
    // and use WhatsApp deep link when the client has a phone number.
    // The promise is fire-and-forget — every error path is already handled
    // inside the hook (it never throws).
    void shareOrderHook.share({
      orderName: order.orderName,
      clientName: clientQ.data?.fullName ?? null,
      clientPhone: clientQ.data?.phone ?? null,
      tailorBusinessName: meQ.data?.tailor?.businessName ?? null,
    });
  };

  const deleteOrder = async () => {
    const ok = await dialog.confirm({
      title: t('orders.deleteOrderTitle'),
      message: t('orders.deleteOrderMessage', { name: order?.orderName ?? '' }),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    deleteOrderM.mutate(undefined, {
      onSuccess: () => router.back(),
      onError: (err) => void dialog.error(err),
    });
  };

  if (loading || !order) {
    return (
      <Screen>
        <ScreenHeader title={t('orders.detailTitle')} />
        <Text variant="bodySm" tone="textMuted">
          {t('common.loading')}
        </Text>
      </Screen>
    );
  }

  const nextStatuses = nextOrderStatuses(order.status);
  const s = theme.colors;

  return (
    <Screen>
      <ScreenHeader title={order.orderName} />
      <ScrollView
        {...scroll}
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary — the at-a-glance state, lifted off the paper so the eye
            lands here first before the sections below. */}
        <Card variant="elevated" style={[styles.hero, theme.shadows.md]}>
          <Chip
            variant="status"
            label={statusLabel(order.status)}
            tone={STATUS_TONE[order.status]}
          />

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text variant="label" tone="textMuted">
                {t('orders.ordered')}
              </Text>
              <Text variant="body" style={styles.statValue}>
                {new Date(order.dateOrdered).toLocaleDateString()}
              </Text>
            </View>
            {order.dateDelivery ? (
              <View style={styles.stat}>
                <Text variant="label" tone="textMuted">
                  {t('orders.delivery')}
                </Text>
                <Text variant="body" style={styles.statValue}>
                  {new Date(order.dateDelivery).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>

          {order.notes ? (
            <>
              <View style={[styles.heroRule, { backgroundColor: s.hairline }]} />
              <Text variant="bodySm" tone="textMuted">
                {order.notes}
              </Text>
            </>
          ) : null}

          <View style={styles.heroAction}>
            <Button
              label={
                shareOrderHook.isPending
                  ? t('orders.generatingLink')
                  : t('orders.shareWithClient')
              }
              variant="secondary"
              iconLeft={
                shareOrderHook.isPending ? undefined : (
                  <Ionicons name="share-social-outline" size={18} color={colors.text} />
                )
              }
              onPress={shareWithClient}
              disabled={shareOrderHook.isPending}
            />
          </View>
        </Card>

        <Section title={t('orders.statusSection')}>
          {nextStatuses.length === 0 ? (
            <Text variant="bodySm" tone="textMuted">
              {t('orders.noNextStatus')}
            </Text>
          ) : (
            nextStatuses.map((st) => (
              <View key={st} style={{ marginBottom: spacing.sm }}>
                <Button
                  label={t('orders.transitionTo', { label: statusLabel(st) })}
                  variant="secondary"
                  onPress={() => transition(st)}
                />
              </View>
            ))
          )}
        </Section>

        <Section
          title={t('orders.photosCount', { count: photos.length })}
          right={uploading ? <ActivityIndicator color={colors.accent} /> : undefined}
        >
          <View style={styles.photoActions}>
            <Button
              label={t('orders.camera')}
              variant="secondary"
              iconLeft={<Ionicons name="camera-outline" size={18} color={colors.text} />}
              onPress={() => addPhoto('camera')}
              disabled={uploading}
            />
            <View style={{ width: spacing.sm }} />
            <Button
              label={t('orders.gallery')}
              variant="secondary"
              iconLeft={<Ionicons name="images-outline" size={18} color={colors.text} />}
              onPress={() => addPhoto('library')}
              disabled={uploading}
            />
          </View>
          {photos.length === 0 ? (
            <View
              style={[styles.photoEmpty, { backgroundColor: withAlpha(s.textMuted, 0.06) }]}
            >
              <Ionicons name="images-outline" size={22} color={colors.textMuted} />
              <Text variant="bodySm" tone="textMuted">
                {t('orders.noPhotosYet')}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoStrip}
            >
              {photos.map((p) => {
                // Prefer the tiny thumbnail for the strip; fall back to full if
                // somehow missing (legacy rows uploaded before the two-variant
                // pipeline).
                const previewUrl = p.thumbnailUrl ?? p.signedUrl;
                return (
                  <Pressable
                    key={p.id}
                    onLongPress={() => deletePhoto(p.id)}
                    style={[styles.photoThumbWrap, { width: thumbSize }]}
                  >
                    {previewUrl ? (
                      <Image
                        source={{ uri: previewUrl }}
                        style={[
                          styles.photoThumb,
                          { width: thumbSize, height: thumbSize, backgroundColor: colors.card },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.photoThumbPlaceholder,
                          { width: thumbSize, height: thumbSize, backgroundColor: colors.card },
                        ]}
                      >
                        <ActivityIndicator color={colors.textMuted} />
                      </View>
                    )}
                    <Text variant="caption" tone="textMuted" style={styles.photoRole}>
                      {p.role}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {photos.length > 0 ? (
            <Text variant="caption" tone="textMuted" style={styles.photoHint}>
              {t('orders.longPressToDelete')}
            </Text>
          ) : null}
        </Section>

        <Section title={t('orders.itemsCount', { count: order.items.length })}>
          {order.items.length === 0 ? (
            <Text variant="bodySm" tone="textMuted">
              {t('orders.noItems')}
            </Text>
          ) : (
            order.items.map((it) => (
              <Card key={it.id} style={theme.shadows.sm}>
                <View style={styles.itemHead}>
                  <CardTitle>{it.garmentType}</CardTitle>
                  <View
                    style={[styles.qtyPill, { backgroundColor: withAlpha(s.primary, 0.1) }]}
                  >
                    <Text variant="label" style={{ color: s.primary }}>
                      {t('orders.qtyLabel', { count: it.quantity })}
                    </Text>
                  </View>
                </View>
                {it.measurements && Object.keys(it.measurements).length > 0 ? (
                  <View style={styles.measWrap}>
                    {Object.entries(it.measurements).map(([k, v]) => (
                      <View
                        key={k}
                        style={[
                          styles.measTag,
                          { backgroundColor: withAlpha(s.primary, 0.06) },
                        ]}
                      >
                        <Text variant="bodySm">
                          {t('orders.measurementLine', { key: k, value: String(v) })}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {it.notes ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <CardLine>{it.notes}</CardLine>
                  </View>
                ) : null}
              </Card>
            ))
          )}
        </Section>

        <Section title={t('orders.timelineCount', { count: order.events.length })}>
          {order.events.length === 0 ? (
            <Text variant="bodySm" tone="textMuted">
              {t('orders.noEventsYet')}
            </Text>
          ) : (
            order.events.map((e, i) => (
              <View key={e.id} style={[styles.event, { borderLeftColor: withAlpha(s.primary, 0.22) }]}>
                {/* Node — the most recent event reads as a filled dot, older
                    ones as hollow, so the head of the timeline is obvious. */}
                <View
                  style={[
                    styles.eventDot,
                    {
                      backgroundColor: i === 0 ? s.primary : s.surface,
                      borderColor: s.primary,
                    },
                  ]}
                />
                <Text variant="bodySm">
                  {e.eventType === 'created'
                    ? t('orders.orderCreated')
                    : e.fromStatus && e.toStatus
                      ? t('orders.statusTransition', {
                          from: statusLabel(e.fromStatus),
                          to: statusLabel(e.toStatus),
                        })
                      : e.eventType}
                </Text>
                <Text variant="caption" tone="textMuted" style={{ marginTop: 2 }}>
                  {new Date(e.createdAt).toLocaleString()}
                </Text>
                {e.payload &&
                typeof e.payload === 'object' &&
                'note' in (e.payload as Record<string, unknown>) ? (
                  <Text variant="caption" tone="textMuted" style={styles.eventNote}>
                    {String((e.payload as Record<string, unknown>).note)}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </Section>

        <View style={styles.deleteWrap}>
          <Button label={t('orders.deleteOrder')} variant="danger" onPress={deleteOrder} />
        </View>
      </ScrollView>
    </Screen>
  );
}

/**
 * Section wrapper — an h3 header (with optional right-aligned slot) plus its
 * body, separated from the previous block by generous top space rather than a
 * hairline rule. Grouping + whitespace carries the rhythm so the screen reads
 * as distinct blocks, not one flat column.
 */
function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="h3">{title}</Text>
        {right ?? null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Summary card
  hero: {
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    marginTop: 2,
  },
  heroRule: {
    height: 1,
    marginTop: spacing.xs,
  },
  heroAction: {
    marginTop: spacing.xs,
  },
  // Sections
  section: {
    marginTop: spacing.xl,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  // Items
  itemHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
  },
  measWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  measTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  // Timeline
  event: {
    position: 'relative',
    borderLeftWidth: 2,
    paddingLeft: spacing.lg,
    paddingBottom: spacing.lg,
  },
  eventDot: {
    position: 'absolute',
    left: -6,
    top: 3,
    width: 11,
    height: 11,
    borderRadius: 999,
    borderWidth: 2,
  },
  eventNote: { marginTop: 4, fontStyle: 'italic' },
  // Photos
  photoEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderRadius: radii.md,
  },
  photoActions: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  deleteWrap: {
    marginTop: spacing.xl,
  },
  photoStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoThumbWrap: {
    width: 120,
    marginRight: spacing.sm,
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
  },
  photoThumbPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRole: {
    marginTop: 4,
    textAlign: 'center',
  },
  photoHint: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
