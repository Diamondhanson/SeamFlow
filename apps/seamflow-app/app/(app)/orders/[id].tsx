import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { OrderStatus } from '@seamflow/schemas';
import { nextOrderStatuses } from '@seamflow/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { Text, Chip, type ChipTone } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
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
import { radii, spacing, useThemeColors } from '../../../lib/theme';

const STATUS_LABEL: Record<OrderStatus, string> = {
  registered: 'Registered',
  in_progress: 'In progress',
  testing: 'Testing / fitting',
  on_pause: 'On pause',
  delivered: 'Delivered',
};

const STATUS_TONE: Record<OrderStatus, ChipTone> = {
  registered: 'statusRegistered',
  in_progress: 'statusInProgress',
  testing: 'statusTesting',
  on_pause: 'statusOnPause',
  delivered: 'statusDelivered',
};

export default function OrderDetailScreen() {
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

  const order = orderQ.data ?? null;
  const photos = photosQ.data?.items ?? [];
  const loading = orderQ.isLoading;

  const transition = (to: OrderStatus) =>
    transitionM.mutate(
      { to },
      {
        onError: (err) =>
          Alert.alert('Error', err instanceof Error ? err.message : String(err)),
      },
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
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = (photoId: string) =>
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deletePhotoM.mutate(photoId, {
            onError: (err) =>
              Alert.alert('Error', err instanceof Error ? err.message : String(err)),
          }),
      },
    ]);

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

  const deleteOrder = () =>
    Alert.alert('Delete order?', `${order?.orderName} will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteOrderM.mutate(undefined, {
            onSuccess: () => router.back(),
            onError: (err) =>
              Alert.alert('Error', err instanceof Error ? err.message : String(err)),
          }),
      },
    ]);

  if (loading || !order) {
    return (
      <Screen>
        <Text variant="bodySm" tone="textMuted">
          Loading…
        </Text>
      </Screen>
    );
  }

  const nextStatuses = nextOrderStatuses(order.status);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text variant="h1">{order.orderName}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <Chip
            variant="status"
            label={STATUS_LABEL[order.status]}
            tone={STATUS_TONE[order.status]}
          />
        </View>

        <View style={{ height: spacing.md }} />
        <Text variant="bodySm" tone="textMuted">
          Ordered: {new Date(order.dateOrdered).toLocaleDateString()}
        </Text>
        {order.dateDelivery ? (
          <Text variant="bodySm" tone="textMuted">
            Delivery: {new Date(order.dateDelivery).toLocaleDateString()}
          </Text>
        ) : null}
        {order.notes ? (
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
            {order.notes}
          </Text>
        ) : null}

        <View style={{ height: spacing.md }} />
        <Button
          label={shareOrderHook.isPending ? 'Generating link…' : '🔗 Share with client'}
          variant="secondary"
          onPress={shareWithClient}
          disabled={shareOrderHook.isPending}
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text variant="h3" style={styles.section}>
          Status
        </Text>
        {nextStatuses.length === 0 ? (
          <Text variant="bodySm" tone="textMuted">
            No next status available.
          </Text>
        ) : (
          nextStatuses.map((s) => (
            <View key={s} style={{ marginBottom: spacing.sm }}>
              <Button
                label={`→ ${STATUS_LABEL[s]}`}
                variant="secondary"
                onPress={() => transition(s)}
              />
            </View>
          ))
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <Text variant="h3">Photos ({photos.length})</Text>
          {uploading ? <ActivityIndicator color={colors.accent} /> : null}
        </View>
        <View style={styles.photoActions}>
          <Button
            label="📷 Camera"
            variant="secondary"
            onPress={() => addPhoto('camera')}
            disabled={uploading}
          />
          <View style={{ width: spacing.sm }} />
          <Button
            label="🖼  Gallery"
            variant="secondary"
            onPress={() => addPhoto('library')}
            disabled={uploading}
          />
        </View>
        {photos.length === 0 ? (
          <Text variant="bodySm" tone="textMuted">
            No photos yet.
          </Text>
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
                  style={styles.photoThumbWrap}
                >
                  {previewUrl ? (
                    <Image
                      source={{ uri: previewUrl }}
                      style={[styles.photoThumb, { backgroundColor: colors.card }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.photoThumbPlaceholder,
                        { backgroundColor: colors.card },
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
        <Text variant="caption" tone="textMuted" style={styles.photoHint}>
          Long-press a photo to delete.
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text variant="h3" style={styles.section}>
          Items ({order.items.length})
        </Text>
        {order.items.length === 0 ? (
          <Text variant="bodySm" tone="textMuted">
            No items.
          </Text>
        ) : (
          order.items.map((it) => (
            <Card key={it.id}>
              <CardTitle>{it.garmentType}</CardTitle>
              <CardLine>Qty: {it.quantity}</CardLine>
              {it.measurements && Object.keys(it.measurements).length > 0 ? (
                <View style={{ marginTop: spacing.xs }}>
                  {Object.entries(it.measurements).map(([k, v]) => (
                    <CardLine key={k}>
                      {k}: {String(v)} cm
                    </CardLine>
                  ))}
                </View>
              ) : null}
              {it.notes ? <CardLine>{it.notes}</CardLine> : null}
            </Card>
          ))
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text variant="h3" style={styles.section}>
          Timeline ({order.events.length})
        </Text>
        {order.events.length === 0 ? (
          <Text variant="bodySm" tone="textMuted">
            No events yet.
          </Text>
        ) : (
          order.events.map((e) => (
            <View key={e.id} style={[styles.event, { borderLeftColor: colors.accent }]}>
              <Text variant="bodySm">
                {e.eventType === 'created'
                  ? 'Order created'
                  : e.fromStatus && e.toStatus
                    ? `${STATUS_LABEL[e.fromStatus]} → ${STATUS_LABEL[e.toStatus]}`
                    : e.eventType}
              </Text>
              <Text variant="caption" tone="textMuted" style={{ marginTop: 2 }}>
                {new Date(e.createdAt).toLocaleString()}
              </Text>
              {e.payload &&
              typeof e.payload === 'object' &&
              'note' in (e.payload as Record<string, unknown>) ? (
                <Text
                  variant="caption"
                  tone="textMuted"
                  style={styles.eventNote}
                >
                  {String((e.payload as Record<string, unknown>).note)}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Button label="Delete order" variant="danger" onPress={deleteOrder} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  event: {
    paddingVertical: spacing.sm,
    borderLeftWidth: 2,
    paddingLeft: spacing.md,
    marginBottom: spacing.xs,
  },
  eventNote: { marginTop: 4, fontStyle: 'italic' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photoActions: {
    flexDirection: 'row',
    marginBottom: spacing.md,
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
