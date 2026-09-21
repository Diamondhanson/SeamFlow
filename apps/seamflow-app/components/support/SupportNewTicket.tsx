// ============================================================================
// Help & Support — open a ticket (plan step 1). Shared by both sides.
//
// Category → description → optional screenshots → optional order. Order and
// screenshots are optional on purpose: most "I can't log in" tickets have
// neither, and a form that demands them gets abandoned.
// ============================================================================

import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  SUPPORT_CATEGORIES,
  type SupportAttachment,
  type SupportCategory,
  type SupportSide,
} from '@seamflow/schemas';
import { Chip, Text } from '@seamflow/ui';
import { Screen } from '../Screen';
import { FormScroll } from '../FormScroll';
import { ScreenHeader } from '../ScreenHeader';
import { Button } from '../Button';
import { Input } from '../Input';
import { useAuth } from '../../lib/auth-context';
import { newSupportClientId, useCreateSupportTicket } from '../../lib/support-queries';
import { pickPhoto, uploadSupportImage } from '../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../lib/permissions';
import { radii, spacing, useThemeColors } from '../../lib/theme';
import { useDialog } from '../../lib/dialog';
import { useTranslation } from '../../lib/i18n';

const MAX_SCREENSHOTS = 5;
const MIN_BODY = 10;

export interface SupportOrderOption {
  id: string;
  name: string;
}

export function SupportNewTicket({
  side,
  basePath,
  orders,
}: {
  side: SupportSide;
  basePath: string;
  /** Orders this user may link — the tailor's own, or the client's claimed. */
  orders: SupportOrderOption[];
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const dialog = useDialog();
  const { session } = useAuth();
  const create = useCreateSupportTicket();
  const userId = session?.user?.id;

  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [body, setBody] = useState('');
  const [shots, setShots] = useState<{ att: SupportAttachment; uri: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  // One key per form, so a double tap or a retry after a timeout can't open
  // two tickets — the API returns the first.
  const clientId = useMemo(() => newSupportClientId(), []);

  const order = orders.find((o) => o.id === orderId) ?? null;

  const addShot = async () => {
    if (!userId) return;
    const source = await dialog.choose<'camera' | 'library'>({
      title: t('support.addScreenshotTitle'),
      actions: [
        { label: t('support.chooseFromGallery'), value: 'library' },
        { label: t('support.takePhoto'), value: 'camera' },
      ],
    });
    if (!source) return;
    setUploading(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;
      const att = await uploadSupportImage({ userId, asset });
      setShots((cur) => [...cur, { att, uri: asset.uri }]);
    } catch (err) {
      if (await alertIfOffline(err, dialog, t)) return;
      if (await alertIfPermissionDenied(err, dialog, t)) return;
      await dialog.error(err);
    } finally {
      setUploading(false);
    }
  };

  const chooseOrder = async () => {
    const picked = await dialog.pick({
      title: t('support.pickOrderTitle'),
      options: orders.map((o) => ({ key: o.id, label: o.name })),
      selectedKey: orderId ?? undefined,
      emptyText: t('support.noOrders'),
    });
    if (picked) setOrderId(picked);
  };

  const send = () => {
    if (!category) return;
    create.mutate(
      {
        side,
        category,
        body: body.trim(),
        attachments: shots.map((s) => s.att),
        orderId,
        clientId,
      },
      {
        onSuccess: (detail) => router.replace(`${basePath}/${detail.ticket.id}` as never),
        onError: (err) => void dialog.error(err),
      },
    );
  };

  const ready = !!category && body.trim().length >= MIN_BODY && !uploading;

  return (
    <Screen>
      <ScreenHeader title={t('support.newTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: 120 }}>
        <Text variant="bodySm" tone="textMuted">
          {t('support.newIntro')}
        </Text>

        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('support.categoryLabel')}
        </Text>
        <View style={styles.chips}>
          {SUPPORT_CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={t(`support.category_${c}`)}
              selected={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Input
            label={t('support.descriptionLabel')}
            placeholder={t('support.descriptionPlaceholder')}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={4000}
          />
          {body.trim().length > 0 && body.trim().length < MIN_BODY ? (
            <Text variant="caption" tone="textMuted" style={styles.hint}>
              {t('support.descriptionHint')}
            </Text>
          ) : null}
        </View>

        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('support.screenshotsLabel')} · {t('common.optional')}
        </Text>
        <View style={styles.photoRow}>
          {shots.map((s, i) => (
            <View key={s.att.storagePath} style={styles.thumbWrap}>
              <Image source={{ uri: s.uri }} style={styles.thumb} />
              <Pressable
                style={[styles.remove, { backgroundColor: colors.bg }]}
                onPress={() => setShots((cur) => cur.filter((_, n) => n !== i))}
                accessibilityRole="button"
                accessibilityLabel={t('support.removeScreenshot')}
              >
                <Ionicons name="close" size={16} color={colors.text} />
              </Pressable>
            </View>
          ))}
          {shots.length < MAX_SCREENSHOTS ? (
            <Pressable
              onPress={() => void addShot()}
              disabled={uploading}
              style={[styles.addPhoto, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t('support.addScreenshotTitle')}
            >
              <Ionicons name={uploading ? 'hourglass-outline' : 'image-outline'} size={24} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('support.orderLabel')} · {t('common.optional')}
        </Text>
        {order ? (
          <View style={[styles.orderRow, { borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={18} color={colors.textMuted} />
            <Text variant="bodySm" style={styles.orderName} numberOfLines={1}>
              {order.name}
            </Text>
            <Pressable
              onPress={() => setOrderId(null)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('support.removeOrder')}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Button
            label={t('support.linkOrder')}
            variant="secondary"
            fullWidth={false}
            iconStart={<Ionicons name="link-outline" size={18} color={colors.text} />}
            onPress={() => void chooseOrder()}
          />
        )}

        <View style={styles.submit}>
          <Button
            label={t('support.send')}
            onPress={send}
            loading={create.isPending}
            disabled={!ready}
          />
        </View>
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { marginTop: spacing.xs },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { width: 72, height: 72 },
  thumb: { width: 72, height: 72, borderRadius: radii.md },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  orderName: { flex: 1 },
  submit: { marginTop: spacing.xl },
});
