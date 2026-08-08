// ============================================================================
// Edit one piece in My Designs — the attributes that drive filtering, plus the
// publish toggle.
//
// Attributes are pickers, not free text, for garment audience and occasion.
// Filters are the point of the portfolio screen, and they stop working the
// moment the same idea is typed three different ways.
// ============================================================================

import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { WorkAudience, WorkOccasion } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormScroll } from '../../../components/FormScroll';
import { SkeletonForm } from '../../../components/Skeleton';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import {
  usePublishWork,
  useUnpublishWork,
  useUpdateWork,
  useWork,
} from '../../../lib/queries';
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

  const [title, setTitle] = useState('');
  const [garmentType, setGarmentType] = useState('');
  const [fabric, setFabric] = useState('');
  const [audience, setAudience] = useState<WorkAudience | null>(null);
  const [occasion, setOccasion] = useState<WorkOccasion | null>(null);

  useEffect(() => {
    if (!work) return;
    setTitle(work.title ?? '');
    setGarmentType(work.garmentType ?? '');
    setFabric(work.fabric ?? '');
    setAudience(work.audience);
    setOccasion(work.occasion);
  }, [work]);

  const save = () => {
    updateM.mutate(
      {
        id,
        input: {
          title: title.trim() || null,
          garmentType: garmentType.trim() || null,
          fabric: fabric.trim() || null,
          audience,
          occasion,
        },
      },
      { onSuccess: () => router.back(), onError: (err) => void dialog.error(err) },
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
        {work?.signedUrl ? (
          <Image
            source={{ uri: work.signedUrl }}
            style={[styles.preview, { backgroundColor: colors.card, borderRadius: radii.lg }]}
            resizeMode="cover"
          />
        ) : null}

        <Input
          label={t('feed.titleLabel')}
          placeholder={t('feed.titlePlaceholder')}
          value={title}
          onChangeText={setTitle}
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
          <Switch
            value={!!work?.isPublished}
            onValueChange={togglePublished}
            disabled={publishM.isPending || unpublishM.isPending}
            trackColor={{ true: colors.accent, false: colors.border }}
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
  preview: { width: '100%', height: 220, marginBottom: spacing.lg },
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
