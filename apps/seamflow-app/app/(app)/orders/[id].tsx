import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import {
  MeasurementsEditor,
  numericMeasurements,
} from '../../../components/MeasurementsEditor';
import { Input } from '../../../components/Input';
import { FabricField } from '../../../components/FabricField';
import { SkeletonDetail } from '../../../components/Skeleton';
import {
  qk,
  useClient,
  useDeleteOrder,
  useDeleteOrderPhoto,
  useMe,
  useOrder,
  useOrderPhotos,
  useWorks,
  useUnpublishWork,
  useTransitionOrder,
  useUpdateOrder,
  useUpdateOrderItem,
} from '../../../lib/queries';
import { useShareOrder } from '../../../lib/share-order';
import { pickPhoto, uploadAndRegister } from '../../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../../lib/permissions';
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
  // Which of this order's photos are in the portfolio (and whether they're
  // live in the feed). Publishing from an order adopts the photo into
  // tailor_works, so the portfolio — not feed_posts — is the source of truth.
  const myWorksQ = useWorks({});
  const unpublishM = useUnpublishWork();
  const publishedByPhotoId = useMemo(
    () =>
      new Map(
        (myWorksQ.data?.pages ?? [])
          .flatMap((pg) => pg.items)
          .filter((w) => w.orderPhotoId)
          .map((w) => [w.orderPhotoId as string, w]),
      ),
    [myWorksQ.data],
  );
  const deleteOrderM = useDeleteOrder(id);
  const updateOrderM = useUpdateOrder(id);
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

  const order = orderQ.data ?? null;
  const photos = photosQ.data?.items ?? [];
  const loading = orderQ.isLoading;

  // Local mirror of the meters-used field, re-seeded when the order loads.
  const [yardage, setYardage] = useState('');
  /** Which garment's measurements are open for editing (one at a time). */
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  useEffect(() => {
    setYardage(order?.fabricYardageUsed ?? '');
  }, [order?.fabricYardageUsed]);

  const setFabric = (fabricId: string | null) =>
    updateOrderM.mutate({ fabricId }, { onError: (err) => void dialog.error(err) });

  const saveYardage = () => {
    const next = yardage.trim() ? Number(yardage) : null;
    if ((order?.fabricYardageUsed ?? null) === (next != null ? String(next) : null)) return;
    updateOrderM.mutate(
      { fabricYardageUsed: next },
      { onError: (err) => void dialog.error(err) },
    );
  };

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
      if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      ) {
        await dialog.error(err);
      }
    } finally {
      setUploading(false);
    }
  };

  /**
   * Tapping a photo offers the feed actions. Publishing is deliberately not a
   * long-press: making something public should be an obvious, discoverable
   * choice, not a hidden gesture. Long-press stays as delete, unchanged.
   */
  const photoActions = async (photoId: string, previewUrl?: string) => {
    const work = publishedByPhotoId.get(photoId);
    const isPublished = !!work?.isPublished;

    const action = await dialog.choose<'publish' | 'unpublish'>({
      title: t('orders.photosCount', { count: photos.length }),
      actions: isPublished
        ? [{ label: t('feed.unpublishAction'), value: 'unpublish' }]
        : [{ label: t('feed.publishAction'), value: 'publish' }],
    });
    if (!action) return;

    if (action === 'publish') {
      router.push({
        pathname: '/(app)/feed/publish',
        params: {
          photoId,
          orderId: id,
          previewUrl: previewUrl ?? '',
          // Prefill the garment from the order's first item — we already know it.
          garmentType: order?.items?.[0]?.garmentType ?? '',
        },
      });
      return;
    }

    const ok = await dialog.confirm({
      title: t('feed.unpublishConfirmTitle'),
      message: t('feed.unpublishConfirmBody'),
      tone: 'warning',
    });
    if (!ok || !work) return;
    unpublishM.mutate(
      work.id,
      {
        onSuccess: () =>
          void dialog.alert({ title: t('feed.unpublishedTitle'), tone: 'success' }),
        onError: (err) => void dialog.error(err),
      },
    );
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
        <SkeletonDetail />
      </Screen>
    );
  }

  const nextStatuses = nextOrderStatuses(order.status);
  const s = theme.colors;

  return (
    <Screen>
      <ScreenHeader title={order.orderName} />
      <FormScroll
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

        <Section title={t('fabrics.fabricLabel')}>
          <FabricField value={order.fabricId} onChange={setFabric} />
          {order.fabricId ? (
            <Input
              label={t('fabrics.metersUsedLabel')}
              value={yardage}
              onChangeText={setYardage}
              onEndEditing={saveYardage}
              onBlur={saveYardage}
              keyboardType="decimal-pad"
              placeholder={t('fabrics.yardagePlaceholder')}
            />
          ) : null}
        </Section>

        <Section
          title={t('orders.photosCount', { count: photos.length })}
          right={uploading ? <ActivityIndicator color={colors.accent} /> : undefined}
        >
          <View style={styles.photoActions}>
            {/* fullWidth={false} is load-bearing: the Button default is 100%
                width, which made the camera button fill the row and push the
                gallery button off-screen entirely. */}
            <Button
              label={t('orders.camera')}
              variant="secondary"
              fullWidth={false}
              iconLeft={<Ionicons name="camera-outline" size={18} color={colors.text} />}
              onPress={() => addPhoto('camera')}
              disabled={uploading}
            />
            <View style={{ width: spacing.sm }} />
            <Button
              label={t('orders.gallery')}
              variant="secondary"
              fullWidth={false}
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
                const work = publishedByPhotoId.get(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => photoActions(p.id, previewUrl)}
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
                    {work?.isPublished ? (
                      <View
                        style={[
                          styles.inFeedBadge,
                          { backgroundColor: colors.accent, borderRadius: radii.lg },
                        ]}
                      >
                        <Text variant="caption" style={{ color: colors.accentText }}>
                          {t('feed.inFeedBadge')}
                        </Text>
                      </View>
                    ) : null}
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
                {editingItemId === it.id ? (
                  <ItemMeasurementsEditor
                    item={it}
                    onDone={() => setEditingItemId(null)}
                    orderId={id}
                  />
                ) : (
                  <>
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
                    ) : (
                      <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
                        {t('orders.noMeasurementsYet')}
                      </Text>
                    )}
                    <Pressable
                      onPress={() => setEditingItemId(it.id)}
                      hitSlop={8}
                      style={styles.editMeasBtn}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.accent} />
                      <Text variant="bodySm" tone="primary">
                        {t('orders.editMeasurements')}
                      </Text>
                    </Pressable>
                  </>
                )}
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
          <Button
            label={t('orders.duplicateOrder')}
            variant="secondary"
            iconLeft={<Ionicons name="copy-outline" size={18} color={colors.text} />}
            onPress={() => router.push(`/(app)/new-order?duplicateFrom=${id}`)}
          />
          <View style={{ height: spacing.md }} />
          <Button label={t('orders.deleteOrder')} variant="danger" onPress={deleteOrder} />
        </View>
      </FormScroll>
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

/**
 * Edit one garment's measurements in place on the order screen.
 *
 * Local draft, explicit save. Measurements get corrected mid-fitting with the
 * client standing there, so a half-typed value must not be written on every
 * keystroke — and an accidental edit must be discardable.
 *
 * Reuses the same <MeasurementsEditor> as the new-order flow, so adding an
 * attribute works identically in both places.
 */
function ItemMeasurementsEditor({
  item,
  orderId,
  onDone,
}: {
  item: { id: string; measurements?: Record<string, unknown> | null };
  orderId: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const updateItem = useUpdateOrderItem(orderId);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(item.measurements ?? {}).map(([k, v]) => [k, String(v ?? '')]),
    ),
  );

  const save = () => {
    // Same rule the new-order flow uses: blanks and non-positive values are
    // dropped rather than sent, because the wire format is positive numbers.
    const cleaned = numericMeasurements(draft);
    updateItem.mutate(
      { id: item.id, input: { measurements: cleaned } },
      { onSuccess: onDone, onError: (err) => void dialog.error(err) },
    );
  };

  return (
    <View style={{ marginTop: spacing.sm }}>
      <MeasurementsEditor values={draft} setValues={(cb) => setDraft((cur) => cb(cur))} />
      <View style={styles.itemEditActions}>
        <View style={styles.itemEditAction}>
          <Button label={t('common.save')} onPress={save} loading={updateItem.isPending} />
        </View>
        <View style={styles.itemEditAction}>
          <Button label={t('common.cancel')} variant="secondary" onPress={onDone} />
        </View>
      </View>
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
  editMeasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  itemEditActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  itemEditAction: { flex: 1 },
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
  inFeedBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
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
