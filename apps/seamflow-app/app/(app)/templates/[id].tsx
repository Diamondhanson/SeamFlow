import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { SkeletonForm } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import {
  TemplateImagesEditor,
  toTemplateImageInput,
  type EditableTemplateImage,
} from '../../../components/TemplateImagesEditor';
import {
  useDeleteTemplate,
  useMe,
  useTemplate,
  useUpdateTemplate,
} from '../../../lib/queries';
import { spacing, useThemeColors } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

export default function TemplateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: template, isLoading } = useTemplate(id);
  const del = useDeleteTemplate(id);
  const updateM = useUpdateTemplate(id);
  const { data: me } = useMe();
  const tailorId = me?.tailor?.id;
  const colors = useThemeColors();
  const scroll = useFloatingScroll();
  const { t } = useTranslation();
  const dialog = useDialog();

  // Local copy for instant feedback; re-seed when the server row changes
  // (a fresh fetch brings new signed URLs after each add/remove).
  const [images, setImages] = useState<EditableTemplateImage[]>([]);
  useEffect(() => {
    if (template) setImages(template.images ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, template?.updatedAt]);

  const onImagesChange = (next: EditableTemplateImage[]) => {
    setImages(next);
    updateM.mutate(
      { images: next.map(toTemplateImageInput) },
      { onError: (err) => void dialog.error(err) },
    );
  };

  const onDelete = async () => {
    const ok = await dialog.confirm({
      title: t('templates.deleteConfirmTitle'),
      message: t('templates.deleteConfirmBody', { name: template?.name ?? '' }),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    del.mutate(undefined, {
      onSuccess: () => router.back(),
      onError: (err) => void dialog.error(err),
    });
  };

  if (isLoading || !template) {
    return (
      <Screen>
        <ScreenHeader title={t('templates.detailTitle')} />
        <SkeletonForm fields={5} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={template.name} />
      <ScrollView
        {...scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {template.garmentType ? (
          <Text variant="bodySm" tone="textMuted">{t('templates.garmentLine', { garment: template.garmentType })}</Text>
        ) : null}
        {template.description ? (
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
            {template.description}
          </Text>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <TemplateImagesEditor
          tailorId={tailorId}
          images={images}
          onChange={onImagesChange}
        />

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <Text variant="h3" style={{ marginBottom: spacing.md }}>
          {t('templates.measurementFieldsCount', { count: template.fields.length })}
        </Text>
        {template.fields.map((f, i) => (
          <Card key={`${f.key}_${i}`}>
            <CardTitle>{f.label}</CardTitle>
            <CardLine>{t('templates.keyLine', { key: f.key })}</CardLine>
            <CardLine>{t('templates.unitLine', { unit: f.unit ?? 'cm' })}</CardLine>
            <CardLine>{f.required ? t('templates.requiredPlain') : t('templates.optional')}</CardLine>
          </Card>
        ))}

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
        <Button label={t('templates.deleteTemplate')} variant="danger" onPress={onDelete} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
});
