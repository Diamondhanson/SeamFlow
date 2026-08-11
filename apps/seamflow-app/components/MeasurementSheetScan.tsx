// ============================================================================
// <MeasurementSheetScan> — Feature B of the scan-to-measurement plan: scan a
// client's FILLED measurement sheet into a MeasurementSet.
//
// Mount with `visible` to start: pick/take photo → upload → AI extraction →
// a review screen showing the parsed label↔value rows NEXT TO the original
// photo (handwritten digits get misread; the tailor eyeballs the page against
// the numbers and fixes anything in seconds). Saving creates a normal
// measurement set on the client — never auto-saved — and then offers to
// promote the sheet's layout to a reusable template (values stripped,
// deduped against existing templates).
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from './Screen';
import { Card } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { FormScroll } from './FormScroll';
import { ScanOverlay } from './ScanOverlay';
import {
  discardScanUpload,
  scanMeasurementPage,
  type MeasurementScan,
} from '../lib/measurement-scan';
import {
  finalizeTemplateFields,
  matchMeasurementLabel,
} from '../lib/measurements';
import { useCreateMeasurementSet, qk } from '../lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { alertIfOffline, alertIfPermissionDenied } from '../lib/permissions';
import { parseDecimal } from '../lib/numeric';
import { spacing, radii } from '../lib/theme';
import { useTranslation } from '../lib/i18n';
import { useDialog } from '../lib/dialog';

interface ReviewRow {
  label: string;
  /** Kept as text while editing; parsed on save. '' = blank cell on the sheet. */
  value: string;
  lowConfidence: boolean;
}

export function MeasurementSheetScan({
  clientId,
  tailorId,
  visible,
  onClose,
  onManualFallback,
}: {
  clientId: string;
  tailorId: string | undefined;
  visible: boolean;
  onClose: () => void;
  /** Called when scanning can't proceed (503 / unreadable photo) so the
   *  parent can open the hand-entry form instead. */
  onManualFallback?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const qc = useQueryClient();
  const createSet = useCreateMeasurementSet(clientId);

  const [phase, setPhase] = useState<'idle' | 'scanning' | 'review'>('idle');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<MeasurementScan | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const [setLabel, setSetLabel] = useState('');

  const close = () => {
    setPhase('idle');
    setPreviewUri(null);
    setScanResult(null);
    setRows([]);
    onClose();
  };

  const begin = async () => {
    if (!tailorId) return close();
    const source = await dialog.choose<'camera' | 'library'>({
      title: t('clients.scanSourceTitle'),
      message: t('clients.scanSourceBody'),
      actions: [
        { label: t('templates.takePhoto'), value: 'camera' },
        { label: t('templates.chooseFromGallery'), value: 'library' },
      ],
    });
    if (!source) return close();

    setPhase('scanning');
    try {
      const result = await scanMeasurementPage({
        tailorId,
        source,
        mode: 'measurements',
        onPicked: setPreviewUri,
      });
      if (!result) return close(); // picker cancelled

      if (result.extraction.items.length === 0) {
        void discardScanUpload(result.image);
        await dialog.alert({
          title: t('clients.scanEmptyTitle'),
          message: t('clients.scanEmptyBody'),
          tone: 'warning',
        });
        close();
        onManualFallback?.();
        return;
      }

      // Normalize labels onto the app vocabulary and seed the review rows.
      setRows(
        result.extraction.items.map((item) => ({
          label: matchMeasurementLabel(item.label, t).label,
          value: item.value != null ? String(item.value) : '',
          lowConfidence: item.confidence === 'low',
        })),
      );
      // A bare "38" doesn't say cm or inches — default the set-level unit
      // from what the page states, falling back to cm.
      setUnit(
        result.extraction.detectedUnit ??
          result.extraction.items.find((i) => i.unit)?.unit ??
          'cm',
      );
      setSetLabel(t('clients.scanDefaultSetLabel'));
      setScanResult(result);
      setPhase('review');
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        await dialog.alert({
          title: t('clients.scanUnavailableTitle'),
          message: t('clients.scanUnavailableBody'),
          tone: 'warning',
        });
        close();
        onManualFallback?.();
        return;
      }
      if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      ) {
        await dialog.error(err);
      }
      close();
    }
  };

  // Kick the flow off when the parent flips `visible` on.
  const started = useRef(false);
  useEffect(() => {
    if (visible && !started.current) {
      started.current = true;
      void begin();
    }
    if (!visible) started.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const updateRow = (i: number, patch: Partial<ReviewRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  /** Offer "also save as a template": strip values, dedupe against existing
   *  templates by field-key set, attach the sheet photo as reference. */
  const offerPromote = async () => {
    const promote = await dialog.confirm({
      title: t('clients.promoteTitle'),
      message: t('clients.promoteBody'),
      confirmLabel: t('clients.promoteAction'),
    });
    if (!promote) return;

    // Same save path as a hand-built template: labels+units only.
    const tplFields = finalizeTemplateFields(
      rows.filter((r) => r.label.trim()).map((r) => ({ label: r.label, unit })),
    );
    const sig = tplFields.map((f) => f.key.toLowerCase()).sort().join('|');
    try {
      const existing = await api.measurementTemplates.list();
      const dup = existing.items.find(
        (tpl) => tpl.fields.map((f) => f.key.toLowerCase()).sort().join('|') === sig,
      );
      if (dup) {
        await dialog.alert({
          title: t('clients.duplicateTemplateTitle'),
          message: t('clients.duplicateTemplateBody', { name: dup.name }),
        });
        return;
      }
      const name = await dialog.prompt({
        title: t('clients.promoteNameTitle'),
        placeholder: t('clients.promoteNamePlaceholder'),
        defaultValue: setLabel,
      });
      if (!name) return;
      await api.measurementTemplates.create({
        name,
        fields: tplFields,
        images: scanResult
          ? [
              {
                id: scanResult.image.id,
                storagePath: scanResult.image.storagePath,
                thumbnailPath: scanResult.image.thumbnailPath,
                contentType: scanResult.image.contentType,
              },
            ]
          : [],
      });
      qc.invalidateQueries({ queryKey: qk.templates() });
      await dialog.alert({
        title: t('clients.promoteSavedTitle'),
        message: t('clients.promoteSavedBody', { name }),
        tone: 'success',
      });
    } catch (err) {
      await dialog.error(err);
    }
  };

  const save = async () => {
    // Keep only rows with a name and a usable positive number; keys are
    // derived from labels exactly like templates derive theirs, so a set and
    // a template built from the same page line up.
    const withNums = rows
      .map((r) => ({ ...r, num: parseDecimal(r.value) ?? NaN }))
      .filter((r) => r.label.trim() && Number.isFinite(r.num) && r.num > 0);
    if (withNums.length === 0) {
      await dialog.alert({
        title: t('clients.scanNoValuesTitle'),
        message: t('clients.scanNoValuesBody'),
        tone: 'warning',
      });
      return;
    }
    const fields = finalizeTemplateFields(
      withNums.map((r) => ({ label: r.label, unit })),
    );
    const values: Record<string, number> = {};
    fields.forEach((f, i) => {
      values[f.key] = withNums[i].num;
    });

    createSet.mutate(
      {
        label: setLabel.trim() || t('clients.scanDefaultSetLabel'),
        values,
        unitPreference: unit,
      },
      {
        onSuccess: async () => {
          // The sheet photo stays in storage as provenance of the numbers.
          await offerPromote();
          close();
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  const cancelReview = () => {
    if (scanResult) void discardScanUpload(scanResult.image);
    close();
  };

  return (
    <>
      <ScanOverlay
        visible={phase === 'scanning' && previewUri !== null}
        imageUri={previewUri}
        label={t('clients.scanReadingSheet')}
      />

      <Modal
        visible={phase === 'review'}
        animationType="slide"
        onRequestClose={cancelReview}
      >
        <Screen>
          <Text variant="h2" style={styles.title}>
            {t('clients.scanReviewTitle')}
          </Text>
          <FormScroll contentContainerStyle={{ paddingBottom: spacing.xl }}>
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={[styles.photo, { backgroundColor: colors.surface }]}
                resizeMode="contain"
                accessibilityLabel={t('clients.scanPhotoA11y')}
              />
            ) : null}
            <Text variant="bodySm" tone="textMuted" style={styles.help}>
              {t('clients.scanReviewHelp')}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaLabel}>
                <Input
                  label={t('clients.scanSetLabelLabel')}
                  value={setLabel}
                  onChangeText={setSetLabel}
                />
              </View>
              <View style={styles.metaUnit}>
                <Text variant="label" tone="textMuted" style={styles.unitCaption}>
                  {t('clients.scanUnitLabel')}
                </Text>
                <Button
                  label={unit}
                  variant="secondary"
                  onPress={() => setUnit(unit === 'in' ? 'cm' : 'in')}
                />
              </View>
            </View>

            {rows.map((row, i) => (
              <Card key={i}>
                <View style={styles.rowInputs}>
                  <View style={styles.rowLabel}>
                    <Input
                      label={t('clients.scanMeasurementLabel')}
                      value={row.label}
                      onChangeText={(v) => updateRow(i, { label: v })}
                    />
                  </View>
                  <View style={styles.rowValue}>
                    <Input
                      label={t('clients.scanValueLabel')}
                      value={row.value}
                      onChangeText={(v) => updateRow(i, { value: v, lowConfidence: false })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                {row.lowConfidence ? (
                  <Text variant="bodySm" tone="warning" style={styles.lowConfidence}>
                    {t('clients.scanLowConfidence')}
                  </Text>
                ) : null}
                <Button
                  label={t('common.remove')}
                  variant="ghost"
                  size="sm"
                  onPress={() => removeRow(i)}
                />
              </Card>
            ))}

            <Button
              label={t('clients.saveSet')}
              onPress={save}
              loading={createSet.isPending}
            />
            <View style={{ height: spacing.sm }} />
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={cancelReview}
            />
          </FormScroll>
        </Screen>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md },
  photo: { width: '100%', height: 220, borderRadius: radii.md, marginBottom: spacing.sm },
  help: { marginBottom: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  metaLabel: { flex: 1 },
  metaUnit: { width: 88 },
  unitCaption: { marginBottom: spacing.xs },
  rowInputs: { flexDirection: 'row', gap: spacing.sm },
  rowLabel: { flex: 2 },
  rowValue: { flex: 1 },
  lowConfidence: { marginBottom: spacing.sm },
});
