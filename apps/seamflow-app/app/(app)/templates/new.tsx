import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import {
  TemplateImagesEditor,
  toTemplateImageInput,
  type EditableTemplateImage,
} from '../../../components/TemplateImagesEditor';
import { TemplateFieldsEditor } from '../../../components/TemplateFieldsEditor';
import {
  finalizeTemplateFields,
  type EditableField,
} from '../../../lib/measurements';
import { useCreateTemplate, useMe } from '../../../lib/queries';
import { spacing } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

export default function NewTemplate() {
  const { t } = useTranslation();
  // Starter chips on the templates list pass a `garment` param to pre-fill.
  const { garment } = useLocalSearchParams<{ garment?: string }>();
  const [name, setName] = useState('');
  const [garmentType, setGarmentType] = useState(garment?.toLowerCase() ?? '');
  const [description, setDescription] = useState('');
  // Seed the three most common measurements so the template isn't empty.
  const [fields, setFields] = useState<EditableField[]>(() => [
    { label: t('measurements.chest'), required: true, unit: 'cm' },
    { label: t('measurements.waist'), required: true, unit: 'cm' },
    { label: t('measurements.hips'), unit: 'cm' },
  ]);
  const [images, setImages] = useState<EditableTemplateImage[]>([]);
  const create = useCreateTemplate();
  const { data: me } = useMe();
  const tailorId = me?.tailor?.id;
  const dialog = useDialog();

  const submit = () => {
    if (!name.trim()) return;
    create.mutate(
      {
        name,
        garmentType: garmentType || null,
        description: description || null,
        fields: finalizeTemplateFields(fields),
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

        <View style={styles.section}>
          <TemplateFieldsEditor fields={fields} onChange={setFields} />
        </View>

        <Button
          label={t('templates.saveTemplate')}
          onPress={submit}
          loading={create.isPending}
          disabled={!name.trim()}
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
});
