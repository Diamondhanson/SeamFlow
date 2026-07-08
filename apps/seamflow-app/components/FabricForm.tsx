// ============================================================================
// <FabricForm> — the shared create/edit form for a fabric. Owns local field
// state; hands a clean payload to `onSubmit`. Used by fabrics/new.tsx and
// fabrics/[id].tsx.
// ============================================================================

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FabricCreateInput } from '@seamflow/schemas';
import { Input } from './Input';
import { Button } from './Button';
import { FabricPhotoField, type FabricPhotoValue } from './FabricPhotoField';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export interface FabricFormInitial {
  name?: string;
  supplier?: string | null;
  color?: string | null;
  composition?: string | null;
  yardageMeters?: string | null;
  costPerMeter?: string | null;
  photo?: FabricPhotoValue;
}

/** Trim → null so empty inputs don't persist as empty strings. */
function clean(v: string): string | null {
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export function FabricForm({
  tailorId,
  initial,
  submitLabel,
  onSubmit,
  submitting,
  footer,
}: {
  tailorId: string | undefined;
  initial?: FabricFormInitial;
  submitLabel: string;
  onSubmit: (payload: FabricCreateInput) => void;
  submitting: boolean;
  /** Extra actions rendered below the save button (e.g. Delete). */
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [color, setColor] = useState(initial?.color ?? '');
  const [composition, setComposition] = useState(initial?.composition ?? '');
  const [yardage, setYardage] = useState(initial?.yardageMeters ?? '');
  const [cost, setCost] = useState(initial?.costPerMeter ?? '');
  const [photo, setPhoto] = useState<FabricPhotoValue>(
    initial?.photo ?? { photoKey: null, photoThumbKey: null },
  );

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      supplier: clean(supplier),
      color: clean(color),
      composition: clean(composition),
      yardageMeters: clean(yardage),
      costPerMeter: clean(cost),
      photoKey: photo.photoKey,
      photoThumbKey: photo.photoThumbKey,
    });
  };

  return (
    <View>
      <Input
        label={t('fabrics.nameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={t('fabrics.namePlaceholder')}
      />
      <Input
        label={t('fabrics.colorLabel')}
        value={color}
        onChangeText={setColor}
        placeholder={t('fabrics.colorPlaceholder')}
      />
      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <Input
            label={t('fabrics.yardageLabel')}
            value={yardage}
            onChangeText={setYardage}
            placeholder={t('fabrics.yardagePlaceholder')}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.pairItem}>
          <Input
            label={t('fabrics.costLabel')}
            value={cost}
            onChangeText={setCost}
            placeholder={t('fabrics.costPlaceholder')}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      <Input
        label={t('fabrics.compositionLabel')}
        value={composition}
        onChangeText={setComposition}
        placeholder={t('fabrics.compositionPlaceholder')}
      />
      <Input
        label={t('fabrics.supplierLabel')}
        value={supplier}
        onChangeText={setSupplier}
        placeholder={t('fabrics.supplierPlaceholder')}
      />

      <View style={styles.section}>
        <FabricPhotoField tailorId={tailorId} value={photo} onChange={setPhoto} />
      </View>

      <View style={styles.section}>
        <Button
          label={submitLabel}
          onPress={submit}
          loading={submitting}
          disabled={!name.trim()}
        />
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1 },
  section: { marginTop: spacing.md },
});
