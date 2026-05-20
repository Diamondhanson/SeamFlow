import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { OrderStatus } from '@seamflow/schemas';
import { nextOrderStatuses } from '@seamflow/schemas';
import { useQueryClient } from '@tanstack/react-query';
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
import { colors, radii, spacing } from '../../../lib/theme';

const STATUS_LABEL: Record<OrderStatus, string> = {
  registered: 'Registered',
  in_progress: 'In progress',
  testing: 'Testing / fitting',
  on_pause: 'On pause',
  delivered: 'Delivered',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  registered: colors.textMuted,
  in_progress: colors.accent,
  testing: '#f5a524',
  on_pause: '#e35d6a',
  delivered: colors.success,
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
        <Text style={styles.muted}>Loading…</Text>
      </Screen>
    );
  }

  const nextStatuses = nextOrderStatuses(order.status);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.name}>{order.orderName}</Text>
        <View
          style={[styles.statusPill, { backgroundColor: STATUS_COLOR[order.status] }]}
        >
          <Text style={styles.statusText}>{STATUS_LABEL[order.status]}</Text>
        </View>

        <View style={{ height: spacing.md }} />
        <Text style={styles.muted}>
          Ordered: {new Date(order.dateOrdered).toLocaleDateString()}
        </Text>
        {order.dateDelivery ? (
          <Text style={styles.muted}>
            Delivery: {new Date(order.dateDelivery).toLocaleDateString()}
          </Text>
        ) : null}
        {order.notes ? (
          <Text style={[styles.muted, { marginTop: spacing.sm }]}>{order.notes}</Text>
        ) : null}

        <View style={{ height: spacing.md }} />
        <Button
          label={shareOrderHook.isPending ? 'Generating link…' : '🔗 Share with client'}
          variant="secondary"
          onPress={shareWithClient}
          disabled={shareOrderHook.isPending}
        />

        <View style={styles.divider} />

        <Text style={styles.section}>Status</Text>
        {nextStatuses.length === 0 ? (
          <Text style={styles.muted}>No next status available.</Text>
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

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.section}>Photos ({photos.length})</Text>
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
          <Text style={styles.muted}>No photos yet.</Text>
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
                    <Image source={{ uri: previewUrl }} style={styles.photoThumb} />
                  ) : (
                    <View style={styles.photoThumbPlaceholder}>
                      <ActivityIndicator color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.photoRole}>{p.role}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        <Text style={styles.photoHint}>Long-press a photo to delete.</Text>

        <View style={styles.divider} />

        <Text style={styles.section}>Items ({order.items.length})</Text>
        {order.items.length === 0 ? (
          <Text style={styles.muted}>No items.</Text>
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

        <View style={styles.divider} />

        <Text style={styles.section}>Timeline ({order.events.length})</Text>
        {order.events.length === 0 ? (
          <Text style={styles.muted}>No events yet.</Text>
        ) : (
          order.events.map((e) => (
            <View key={e.id} style={styles.event}>
              <Text style={styles.eventTitle}>
                {e.eventType === 'created'
                  ? 'Order created'
                  : e.fromStatus && e.toStatus
                    ? `${STATUS_LABEL[e.fromStatus]} → ${STATUS_LABEL[e.toStatus]}`
                    : e.eventType}
              </Text>
              <Text style={styles.eventDate}>
                {new Date(e.createdAt).toLocaleString()}
              </Text>
              {e.payload &&
              typeof e.payload === 'object' &&
              'note' in (e.payload as Record<string, unknown>) ? (
                <Text style={styles.eventNote}>
                  {String((e.payload as Record<string, unknown>).note)}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <View style={styles.divider} />
        <Button label="Delete order" variant="danger" onPress={deleteOrder} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 24, fontWeight: '700' },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
  },
  statusText: { color: colors.accentText, fontWeight: '600', fontSize: 12 },
  muted: { color: colors.textMuted, fontSize: 14 },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  event: {
    paddingVertical: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.md,
    marginBottom: spacing.xs,
  },
  eventTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  eventDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  eventNote: { color: colors.textMuted, fontSize: 13, marginTop: 4, fontStyle: 'italic' },
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
    backgroundColor: colors.card,
  },
  photoThumbPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRole: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  photoHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
