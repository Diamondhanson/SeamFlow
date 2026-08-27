// ============================================================================
// One measurement template — view and edit.
//
// Everything here is editable, including the field list. It used to be
// read-only apart from the reference images, which meant a template built by
// scanning a paper form was frozen the moment it was saved: one misread label
// and the only way out was to delete and rescan. Deleting is not neutral —
// `measurement_sets.template_id` is `on delete set null`, so it severs the
// link from every set already recorded against it.
//
// THE FIELD-KEY RULE. Recorded measurements live in `measurement_sets.values`
// keyed by `TemplateField.key`, and on the create path that key is derived
// from the label. Re-deriving it here when a tailor fixes a spelling would
// orphan every value already stored under the old one. So existing fields
// carry their key through the editor untouched (see EditableField.key) and
// only newly added fields get one derived from what was typed.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { SkeletonForm } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormScroll } from '../../../components/FormScroll';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { TemplateFieldsEditor } from '../../../components/TemplateFieldsEditor';
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
import { finalizeTemplateFields, type EditableField } from '../../../lib/measurements';
import { draftKey, useDraft } from '../../../lib/drafts';
import { spacing, useThemeColors } from '../../../lib/theme';
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
  const { t } = useTranslation();
  const dialog = useDialog();

  const [name, setName] = useState('');
  const [garmentType, setGarmentType] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<EditableField[]>([]);

  // Local copy for instant feedback; re-seed when the server row changes
  // (a fresh fetch brings new signed URLs after each add/remove).
  const [images, setImages] = useState<EditableTemplateImage[]>([]);

  // What the server currently holds, so "is this edited?" is a real comparison
  // rather than a dirty flag that every keystroke sets and nothing clears.
  const saved = useMemo(
    () =>
      template
        ? {
            name: template.name,
            garmentType: template.garmentType ?? '',
            description: template.description ?? '',
            fields: template.fields.map((f) => ({
              key: f.key,
              label: f.label,
              required: f.required,
              unit: f.unit,
            })) as EditableField[],
          }
        : null,
    [template],
  );

  useEffect(() => {
    if (!template) return;
    setName(template.name);
    setGarmentType(template.garmentType ?? '');
    setDescription(template.description ?? '');
    setFields(
      template.fields.map((f) => ({
        key: f.key,
        label: f.label,
        required: f.required,
        unit: f.unit,
      })),
    );
    setImages(template.images ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, template?.updatedAt]);

  const dirty = useMemo(() => {
    if (!saved) return false;
    return (
      name !== saved.name ||
      garmentType !== saved.garmentType ||
      description !== saved.description ||
      JSON.stringify(fields) !== JSON.stringify(saved.fields)
    );
  }, [saved, name, garmentType, description, fields]);

  // Rescue unsaved edits. Keyed by template id, so editing two templates in one
  // session keeps two independent drafts rather than one clobbering the other.
  //
  // Only offered when the draft actually differs from what the server holds —
  // otherwise reopening a template you merely looked at would ask whether you
  // want to restore your own unchanged data, which teaches people to dismiss
  // the prompt without reading it.
  const { clear: clearDraft } = useDraft({
    key: draftKey('template', id),
    value: { name, garmentType, description, fields },
    hasContent: (d) =>
      !!saved &&
      (d.name !== saved.name ||
        d.garmentType !== saved.garmentType ||
        d.description !== saved.description ||
        JSON.stringify(d.fields) !== JSON.stringify(saved.fields)),
    describe: (d) => d.name || template?.name || null,
    onRestore: (d) => {
      setName(d.name);
      setGarmentType(d.garmentType);
      setDescription(d.description);
      setFields(d.fields);
    },
  });

  // Images save on change rather than waiting for the button: they are already
  // uploaded by the time they reach here, so holding the row back would leave
  // an object in the bucket that no template references.
  const onImagesChange = (next: EditableTemplateImage[]) => {
    setImages(next);
    updateM.mutate(
      { images: next.map(toTemplateImageInput) },
      { onError: (err) => void dialog.error(err) },
    );
  };

  const onSave = () => {
    if (!name.trim()) return;
    updateM.mutate(
      {
        name: name.trim(),
        garmentType: garmentType.trim() || null,
        description: description.trim() || null,
        fields: finalizeTemplateFields(fields),
      },
      {
        onSuccess: () => {
          clearDraft();
          void dialog.alert({ title: t('templates.savedTitle'), tone: 'success' });
        },
        onError: (err) => void dialog.error(err),
      },
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
      onSuccess: () => {
        clearDraft();
        router.back();
      },
      onError: (err) => void dialog.error(err),
    });
  };

  if (isLoading && !template) {
    return (
      <Screen>
        <ScreenHeader title={t('templates.detailTitle')} />
        <SkeletonForm fields={5} />
      </Screen>
    );
  }

  if (!template) {
    return (
      <Screen>
        <ScreenHeader title={t('templates.detailTitle')} />
        <Text variant="bodySm" tone="textMuted">
          {t('templates.notFound')}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={template.name} />
      <FormScroll
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <Input
          label={t('templates.nameLabel')}
          placeholder={t('templates.namePlaceholder')}
          value={name}
          onChangeText={setName}
        />
        <Input
          label={t('templates.garmentTypeLabel')}
          placeholder={t('templates.garmentTypePlaceholder')}
          value={garmentType}
          onChangeText={setGarmentType}
        />
        <Input
          label={t('templates.descriptionLabel')}
          placeholder={t('templates.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <TemplateImagesEditor
          tailorId={tailorId}
          images={images}
          onChange={onImagesChange}
        />

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <Text variant="h3" style={{ marginBottom: spacing.md }}>
          {t('templates.measurementFieldsCount', { count: fields.length })}
        </Text>
        <TemplateFieldsEditor fields={fields} onChange={setFields} />

        <View style={styles.actions}>
          <Button
            label={dirty ? t('templates.saveChanges') : t('templates.saved')}
            onPress={onSave}
            disabled={!dirty || !name.trim() || updateM.isPending}
            loading={updateM.isPending}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
        <Button label={t('templates.deleteTemplate')} variant="danger" onPress={onDelete} />
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  actions: { marginTop: spacing.lg },
});
