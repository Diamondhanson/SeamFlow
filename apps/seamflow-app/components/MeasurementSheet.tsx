// ============================================================================
// <MeasurementSheet> — one garment's measurements, template or free-form.
//
// There are two ways to take measurements in this app and exactly one place
// that decides between them:
//
//   with a template     the template's fields, in its order, nothing else
//   without a template  the attribute/value editor, add what you need
//
// This used to live inline in the new-order wizard, which meant the group-order
// screen had no measurement entry at all — a bridesmaid who wasn't a client
// could be added to a wedding party and then never measured. Rather than write
// a second copy of the logic (the note on MeasurementsEditor already warns that
// two editors for one concept is how they drift), the decision moved here and
// both screens call it.
// ============================================================================

import type { MeasurementTemplate } from '@seamflow/schemas';
import { View } from 'react-native';
import { Text } from '@seamflow/ui';
import { MeasurementValueInput } from './MeasurementValueInput';
import {
  MeasurementsEditor,
  NO_PENDING,
  type PendingMeasurement,
} from './MeasurementsEditor';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export function MeasurementSheet({
  template,
  values,
  setValues,
  pending,
  setPending,
}: {
  /** Null renders the free-form editor. */
  template: MeasurementTemplate | null;
  values: Record<string, string>;
  setValues: (cb: (cur: Record<string, string>) => Record<string, string>) => void;
  /** The half-typed row, lifted so a draft can persist it. Free-form only. */
  pending?: PendingMeasurement;
  setPending?: (next: PendingMeasurement) => void;
}) {
  const { t } = useTranslation();

  if (template && template.fields.length > 0) {
    return (
      <>
        <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
          {t('orders.measurementsCm')}
        </Text>
        {template.fields.map((f) => (
          <MeasurementValueInput
            key={f.key}
            // No asterisk on "required" fields: nothing here is enforced, and a
            // marker that gates nothing only misleads. A tailor half-way
            // through a fitting must be able to save what they have.
            label={f.label}
            value={values[f.key] ?? ''}
            onChangeText={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))}
            placeholder={t('orders.measurementPlaceholder')}
          />
        ))}
      </>
    );
  }

  return (
    <View>
      <MeasurementsEditor
        values={values}
        setValues={setValues}
        pending={pending ?? NO_PENDING}
        setPending={setPending}
      />
    </View>
  );
}
