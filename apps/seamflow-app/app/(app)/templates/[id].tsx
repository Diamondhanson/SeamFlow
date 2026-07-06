import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { useDeleteTemplate, useTemplate } from '../../../lib/queries';
import { spacing, useThemeColors } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

export default function TemplateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: template, isLoading } = useTemplate(id);
  const del = useDeleteTemplate(id);
  const colors = useThemeColors();
  const scroll = useFloatingScroll();
  const { t } = useTranslation();
  const dialog = useDialog();

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
        <Text variant="bodySm" tone="textMuted">{t('templates.loading')}</Text>
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
