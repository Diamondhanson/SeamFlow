import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { HelpCard } from '../../../components/HelpCard';
import { ScanOverlay } from '../../../components/ScanOverlay';
import {
  TemplateImagesEditor,
  toTemplateImageInput,
  type EditableTemplateImage,
} from '../../../components/TemplateImagesEditor';
import { TemplateFieldsEditor } from '../../../components/TemplateFieldsEditor';
import {
  finalizeTemplateFields,
  matchMeasurementLabel,
  type EditableField,
} from '../../../lib/measurements';
import {
  discardScanUpload,
  scanMeasurementPage,
} from '../../../lib/measurement-scan';
import { useCreateTemplate, useMe } from '../../../lib/queries';
import { ApiError } from '../../../lib/api';
import { alertIfOffline, alertIfPermissionDenied } from '../../../lib/permissions';
import { spacing } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';
import { draftKey, useDraft } from '../../../lib/drafts';
import { useDialog } from '../../../lib/dialog';

export default function NewTemplate() {
  const { t } = useTranslation();
  // Starter chips on the templates list pass a `garment` param to pre-fill;
  // the "Scan a template" shortcut passes `scan=1` to open the scanner.
  const { garment, scan } = useLocalSearchParams<{ garment?: string; scan?: string }>();
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
  // Scan-to-template state: the "Reading…" overlay + the review banner.
  const [scanningUri, setScanningUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanBanner, setScanBanner] = useState(false);
  const create = useCreateTemplate();
  const { data: me } = useMe();
  const tailorId = me?.tailor?.id;
  const dialog = useDialog();
  const { colors } = useAtelierTheme();

  const startScan = async () => {
    if (!tailorId) return;
    const source = await dialog.choose<'camera' | 'library'>({
      title: t('templates.scanSourceTitle'),
      message: t('templates.scanSourceBody'),
      actions: [
        { label: t('templates.takePhoto'), value: 'camera' },
        { label: t('templates.chooseFromGallery'), value: 'library' },
      ],
    });
    if (!source) return;

    setScanning(true);
    try {
      const result = await scanMeasurementPage({
        tailorId,
        source,
        mode: 'template',
        onPicked: setScanningUri,
      });
      if (!result) return; // picker cancelled

      const { extraction, image, previewUri } = result;
      if (extraction.items.length === 0) {
        void discardScanUpload(image);
        await dialog.alert({
          title: t('templates.scanEmptyTitle'),
          message: t('templates.scanEmptyBody'),
          tone: 'warning',
        });
        return;
      }

      // Map extracted rows onto editor fields: normalize each label against
      // the app vocabulary, resolve the unit (row → page → cm), dedupe
      // repeats, and flag rows the model wasn't sure about.
      const seen = new Set<string>();
      const scanned: EditableField[] = [];
      for (const item of extraction.items) {
        const { label } = matchMeasurementLabel(item.label, t);
        const dedupeKey = label.toLowerCase();
        if (!label || seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        scanned.push({
          label,
          unit: item.unit ?? extraction.detectedUnit ?? 'cm',
          lowConfidence: item.confidence === 'low' || undefined,
        });
      }
      setFields(scanned);
      setScanBanner(true);

      // Extract → review → save: the fields land in the normal editor above;
      // the photo itself is optional — attach as a reference image or discard.
      const attach = await dialog.confirm({
        title: t('templates.scanAttachTitle'),
        message: t('templates.scanAttachBody'),
        confirmLabel: t('templates.scanAttachConfirm'),
      });
      if (attach) {
        setImages((imgs) => [...imgs, { ...image, previewUri }]);
      } else {
        void discardScanUpload(image);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        await dialog.alert({
          title: t('templates.scanUnavailableTitle'),
          message: t('templates.scanUnavailableBody'),
          tone: 'warning',
        });
      } else if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      ) {
        await dialog.error(err);
      }
    } finally {
      setScanning(false);
      setScanningUri(null);
    }
  };

  // The templates list's "Scan a template" shortcut lands here with scan=1 —
  // open the scanner immediately (once).
  const autoScanned = useRef(false);
  useEffect(() => {
    if (scan === '1' && tailorId && !autoScanned.current) {
      autoScanned.current = true;
      void startScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan, tailorId]);

  // Rescue an unfinished template. A scanned form is the case that matters:
  // the tailor has already spent a photo and a round-trip to the model, and
  // losing that to a phone call means doing the whole thing again.
  //
  // One key for the whole screen — a half-built template is not tied to any
  // record yet, so there is nothing to namespace it by.
  const { clear: clearDraft } = useDraft({
    key: draftKey('template-new'),
    value: { name, garmentType, description, fields },
    // A bare screen is not work. Without this, opening "New template" a second
    // time would offer to restore an empty form, which reads as a bug.
    hasContent: (d) =>
      d.name.trim() !== '' ||
      d.garmentType.trim() !== '' ||
      d.description.trim() !== '' ||
      d.fields.some((f) => f.label.trim() !== ''),
    describe: (d) => d.name.trim() || null,
    onRestore: (d) => {
      setName(d.name);
      setGarmentType(d.garmentType);
      setDescription(d.description);
      setFields(d.fields);
    },
    // Arriving with `scan=1` opens the scanner immediately; a restore prompt
    // would land on top of it and fight for the same decision.
    skipRestore: scan === '1',
  });

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
          clearDraft();
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
      <FormScroll keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <HelpCard
          guideKey="flow.scanTemplate"
          icon="camera-outline"
          title={t('guides.scanTemplateTitle')}
          message={t('guides.scanTemplateBody')}
        />
        <View style={styles.scanEntry}>
          <Button
            label={t('templates.scanTemplate')}
            variant="secondary"
            onPress={startScan}
            disabled={!tailorId || scanning}
          />
        </View>

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

        {scanBanner ? (
          <Card>
            <View style={styles.bannerRow}>
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              <Text variant="bodySm" style={styles.bannerText}>
                {t('templates.scanBanner')}
              </Text>
            </View>
          </Card>
        ) : null}

        <View style={styles.section}>
          <TemplateFieldsEditor fields={fields} onChange={setFields} />
        </View>

        <Button
          label={t('templates.saveTemplate')}
          onPress={submit}
          loading={create.isPending}
          disabled={!name.trim()}
        />
      </FormScroll>

      <ScanOverlay
        visible={scanning && scanningUri !== null}
        imageUri={scanningUri}
        label={t('templates.scanReading')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  scanEntry: { marginBottom: spacing.md },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bannerText: { flex: 1 },
});
