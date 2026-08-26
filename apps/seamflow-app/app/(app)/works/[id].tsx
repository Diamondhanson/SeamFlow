// ============================================================================
// Edit one piece in My Designs — the attributes that drive filtering, plus the
// publish toggle.
//
// Attributes are pickers, not free text, for garment audience and occasion.
// Filters are the point of the portfolio screen, and they stop working the
// moment the same idea is typed three different ways.
// ============================================================================

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { WorkAudience, WorkImage, WorkOccasion } from '@seamflow/schemas';
import { MAX_WORK_IMAGES, StartingPriceSchema } from '@seamflow/schemas';
import { formatCurrency } from '@seamflow/utils';
import { Text, Toggle } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormScroll } from '../../../components/FormScroll';
import { SkeletonForm } from '../../../components/Skeleton';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { WorkPhotoStrip } from '../../../components/WorkPhotoStrip';
import {
  useAddWorkImages,
  useMe,
  usePublishWork,
  useRemoveWorkImage,
  useSetWorkCover,
  useUnpublishWork,
  useUpdateWork,
  useWork,
} from '../../../lib/queries';
import { MAX_MULTI_SELECT, pickPhotos, uploadWorkImages } from '../../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../../lib/permissions';
import { useDialog } from '../../../lib/dialog';
import { spacing, radii, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

const AUDIENCES: WorkAudience[] = ['women', 'men', 'unisex', 'children'];
const OCCASIONS: WorkOccasion[] = [
  'wedding',
  'traditional',
  'corporate',
  'casual',
  'party',
];

export default function EditWork() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();

  const workQ = useWork(id);
  const updateM = useUpdateWork();
  const publishM = usePublishWork();
  const unpublishM = useUnpublishWork();
  const work = workQ.data;

  const { data: me } = useMe();
  const addImagesM = useAddWorkImages();
  const removeImageM = useRemoveWorkImage();
  const setCoverM = useSetWorkCover();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [garmentType, setGarmentType] = useState('');
  const [fabric, setFabric] = useState('');
  const [price, setPrice] = useState('');
  const [audience, setAudience] = useState<WorkAudience | null>(null);
  const [occasion, setOccasion] = useState<WorkOccasion | null>(null);
  const [busyPhotos, setBusyPhotos] = useState(false);

  useEffect(() => {
    if (!work) return;
    setTitle(work.title ?? '');
    setDescription(work.description ?? '');
    setGarmentType(work.garmentType ?? '');
    setFabric(work.fabric ?? '');
    setPrice(work.startingPrice ?? '');
    setAudience(work.audience);
    setOccasion(work.occasion);
  }, [work]);

  const currency = work?.currency ?? me?.tailor?.currency ?? 'XAF';

  const save = async () => {
    const trimmed = price.replace(/[\s,]/g, '');
    if (trimmed && !StartingPriceSchema.safeParse(trimmed).success) {
      await dialog.alert({ title: t('feed.priceInvalid'), tone: 'error' });
      return;
    }

    updateM.mutate(
      {
        id,
        input: {
          title: title.trim() || null,
          description: description.trim() || null,
          garmentType: garmentType.trim() || null,
          fabric: fabric.trim() || null,
          startingPrice: trimmed || null,
          currency: trimmed ? currency : null,
          audience,
          occasion,
        },
      },
      { onSuccess: () => router.back(), onError: (err) => void dialog.error(err) },
    );
  };

  // ── Photos ────────────────────────────────────────────────────────────────

  const addPhotos = async () => {
    if (!work) return;
    const room = MAX_WORK_IMAGES - work.images.length;
    if (room <= 0) {
      await dialog.alert({
        title: t('feed.maxPhotosTitle'),
        message: t('feed.maxPhotosBody', { max: MAX_WORK_IMAGES }),
      });
      return;
    }

    setBusyPhotos(true);
    try {
      const assets = await pickPhotos('library', Math.min(room, MAX_MULTI_SELECT));
      if (assets.length === 0) return;
      await uploadWorkImages({
        tailorId: work.tailorId,
        workId: work.id,
        assets: assets.slice(0, room),
      });
      await workQ.refetch();
    } catch (err) {
      if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      ) {
        await dialog.error(err);
      }
    } finally {
      setBusyPhotos(false);
    }
  };

  const photoActions = async (image: WorkImage) => {
    if (!work) return;

    // The cover is already the cover — offering to promote it would be a
    // control that does nothing.
    const actions = [
      ...(image.position === 0
        ? []
        : [{ label: t('feed.makeCover'), value: 'cover' as const }]),
      { label: t('feed.removePhoto'), value: 'remove' as const, destructive: true },
    ];

    const action = await dialog.choose<'cover' | 'remove'>({
      title: t('feed.photoActionsTitle'),
      actions,
    });
    if (!action) return;

    if (action === 'cover') {
      setCoverM.mutate(
        { id: work.id, imageId: image.id },
        { onError: (err) => void dialog.error(err) },
      );
      return;
    }

    if (work.images.length <= 1) {
      await dialog.alert({
        title: t('feed.lastPhotoTitle'),
        message: t('feed.lastPhotoBody'),
      });
      return;
    }

    const ok = await dialog.confirm({
      title: t('feed.removePhotoConfirm'),
      confirmLabel: t('feed.removePhoto'),
      destructive: true,
    });
    if (!ok) return;

    removeImageM.mutate(
      { id: work.id, imageId: image.id },
      { onError: (err) => void dialog.error(err) },
    );
  };

  const togglePublished = (next: boolean) => {
    if (next) {
      publishM.mutate({ id, input: {} }, { onError: (err) => void dialog.error(err) });
    } else {
      unpublishM.mutate(id, { onError: (err) => void dialog.error(err) });
    }
  };

  if (workQ.isLoading && !work) {
    return (
      <Screen>
        <ScreenHeader title={t('feed.editDesign')} />
        <SkeletonForm fields={5} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={t('feed.editDesign')} />
      <FormScroll contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <WorkPhotoStrip
          images={work?.images}
          onPressImage={photoActions}
          onAdd={addPhotos}
          busy={busyPhotos || addImagesM.isPending}
        />

        <View style={{ height: spacing.lg }} />

        <Input
          label={t('feed.titleLabel')}
          placeholder={t('feed.titlePlaceholder')}
          value={title}
          onChangeText={setTitle}
        />
        <Input
          label={t('feed.descriptionLabel')}
          placeholder={t('feed.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Input
          label={t('feed.garmentTypeLabel')}
          placeholder={t('feed.garmentTypePlaceholder')}
          value={garmentType}
          onChangeText={setGarmentType}
        />
        <Input
          label={t('feed.fabricLabel')}
          placeholder={t('feed.fabricPlaceholder')}
          value={fabric}
          onChangeText={setFabric}
        />
        <Input
          label={t('feed.priceLabel')}
          placeholder={t('feed.pricePlaceholder')}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        <Text variant="caption" tone="textMuted">
          {t('feed.priceHelp', { example: formatCurrency(45000, currency) })}
        </Text>

        <Text variant="bodySm" tone="textMuted" style={styles.pickerLabel}>
          {t('feed.audienceLabel')}
        </Text>
        <View style={styles.chipRow}>
          {AUDIENCES.map((a) => (
            <OptionChip
              key={a}
              label={t(`feed.audience_${a}`)}
              active={audience === a}
              onPress={() => setAudience(audience === a ? null : a)}
            />
          ))}
        </View>

        <Text variant="bodySm" tone="textMuted" style={styles.pickerLabel}>
          {t('feed.occasionLabel')}
        </Text>
        <View style={styles.chipRow}>
          {OCCASIONS.map((o) => (
            <OptionChip
              key={o}
              label={t(`feed.occasion_${o}`)}
              active={occasion === o}
              onPress={() => setOccasion(occasion === o ? null : o)}
            />
          ))}
        </View>

        <View style={[styles.toggle, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
          <Text variant="body" style={{ flex: 1 }}>
            {t('feed.publishedToggle')}
          </Text>
          <Toggle
            value={!!work?.isPublished}
            onValueChange={togglePublished}
            disabled={publishM.isPending || unpublishM.isPending}
          />
        </View>

        <View style={styles.submit}>
          <Button
            label={t('feed.saveDesign')}
            onPress={save}
            disabled={updateM.isPending}
            loading={updateM.isPending}
          />
        </View>
      </FormScroll>
    </Screen>
  );
}

function OptionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.accent : colors.card, borderRadius: radii.lg },
      ]}
    >
      <Text variant="bodySm" style={{ color: active ? colors.accentText : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pickerLabel: { marginTop: spacing.md, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  submit: { marginTop: spacing.lg },
});
