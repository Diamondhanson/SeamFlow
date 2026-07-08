import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import type { TemplateField } from '@seamflow/schemas';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import {
  TemplateImagesEditor,
  toTemplateImageInput,
  type EditableTemplateImage,
} from '../../../components/TemplateImagesEditor';
import { useCreateTemplate, useMe } from '../../../lib/queries';
import { spacing } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

const STARTER_FIELDS: TemplateField[] = [
  { key: 'chest', label: 'Chest', required: true, unit: 'cm' },
  { key: 'waist', label: 'Waist', required: true, unit: 'cm' },
  { key: 'hips', label: 'Hips', required: false, unit: 'cm' },
];

export default function NewTemplate() {
  // Starter chips on the templates list pass a `garment` param to pre-fill.
  const { garment } = useLocalSearchParams<{ garment?: string }>();
  const [name, setName] = useState('');
  const [garmentType, setGarmentType] = useState(garment?.toLowerCase() ?? '');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<TemplateField[]>(STARTER_FIELDS);
  const [images, setImages] = useState<EditableTemplateImage[]>([]);
  const create = useCreateTemplate();
  const { data: me } = useMe();
  const tailorId = me?.tailor?.id;
  const { t } = useTranslation();
  const dialog = useDialog();

  const addField = () =>
    setFields([
      ...fields,
      { key: `field_${fields.length + 1}`, label: 'New field', unit: 'cm' },
    ]);

  const updateField = (i: number, patch: Partial<TemplateField>) => {
    const copy = [...fields];
    copy[i] = { ...copy[i], ...patch };
    setFields(copy);
  };

  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!name) return;
    create.mutate(
      {
        name,
        garmentType: garmentType || null,
        description: description || null,
        fields,
        images: images.map(toTemplateImageInput),
      },
      {
        onSuccess: (t) => {
          router.dismiss();
          router.push(`/(app)/templates/${t.id}`);
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title={t('templates.newTitle')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <Input
          label={t('templates.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('templates.namePlaceholder')}
        />
        <Input
          label={t('templates.garmentTypeLabel')}
          value={garmentType}
          onChangeText={setGarmentType}
          placeholder={t('templates.garmentTypePlaceholder')}
          autoCapitalize="none"
        />
        <Input
          label={t('templates.descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('templates.descriptionPlaceholder')}
          multiline
        />

        <View style={styles.section}>
          <TemplateImagesEditor tailorId={tailorId} images={images} onChange={setImages} />
        </View>

        <Text variant="h3" style={styles.section}>{t('templates.measurementFields')}</Text>
        {fields.map((f, i) => (
          <Card key={i}>
            <Input
              label={t('templates.fieldKeyLabel', { number: i + 1 })}
              value={f.key}
              onChangeText={(v) => updateField(i, { key: v })}
              autoCapitalize="none"
              placeholder={t('templates.fieldKeyPlaceholder')}
            />
            <Input
              label={t('templates.fieldLabelLabel')}
              value={f.label}
              onChangeText={(v) => updateField(i, { label: v })}
              placeholder={t('templates.fieldLabelPlaceholder')}
            />
            <View style={styles.row}>
              <Button
                label={f.required ? t('templates.required') : t('templates.optional')}
                variant="secondary"
                onPress={() => updateField(i, { required: !f.required })}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                label={f.unit === 'in' ? 'in' : 'cm'}
                variant="secondary"
                onPress={() => updateField(i, { unit: f.unit === 'in' ? 'cm' : 'in' })}
              />
            </View>
            <View style={{ height: spacing.sm }} />
            <Button label={t('templates.removeField')} variant="danger" onPress={() => removeField(i)} />
          </Card>
        ))}

        <Button label={t('templates.addField')} variant="secondary" onPress={addField} />
        <View style={{ height: spacing.lg }} />

        <Button
          label={t('templates.saveTemplate')}
          onPress={submit}
          loading={create.isPending}
          disabled={!name || fields.length === 0}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row' },
});
