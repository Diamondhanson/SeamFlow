// Customer-owned measurements — create or edit (client app). Reuses the same
// free-form attribute/value editor the tailor uses, so a customer can enter
// their own numbers (or the ones a local tailor measured for them) and keep
// them in their locker to forward to a tailor in chat.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, useAtelierTheme } from '@seamflow/ui';
import type { MeasurementUnit } from '@seamflow/schemas';
import { Screen } from '../../../../components/Screen';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { FormScroll } from '../../../../components/FormScroll';
import { Input } from '../../../../components/Input';
import { Button } from '../../../../components/Button';
import {
  MeasurementsEditor,
  numericMeasurements,
  NO_PENDING,
  type PendingMeasurement,
} from '../../../../components/MeasurementsEditor';
import {
  useConsumerMeasurements,
  useCreateConsumerMeasurement,
  useUpdateConsumerMeasurement,
} from '../../../../lib/consumer-queries';
import { useDialog } from '../../../../lib/dialog';
import { spacing, radii } from '../../../../lib/theme';
import { useTranslation } from '../../../../lib/i18n';

const UNITS: MeasurementUnit[] = ['cm', 'in'];

export default function EditMeasurements() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data } = useConsumerMeasurements();
  const existing = useMemo(
    () => (id ? data?.items.find((m) => m.id === id && m.owned) : undefined),
    [data, id],
  );

  const [label, setLabel] = useState(existing?.label ?? '');
  const [unit, setUnit] = useState<MeasurementUnit>(existing?.unitPreference ?? 'cm');
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    if (existing) for (const [k, v] of Object.entries(existing.values)) out[k] = String(v);
    return out;
  });
  const [pending, setPending] = useState<PendingMeasurement>(NO_PENDING);

  const createM = useCreateConsumerMeasurement();
  const updateM = useUpdateConsumerMeasurement();
  const saving = createM.isPending || updateM.isPending;

  // Fold a half-typed row into the values on save, so nothing is lost.
  const collect = () => {
    const merged = { ...values };
    if (pending.name.trim() && pending.value.trim()) merged[pending.name.trim()] = pending.value.trim();
    return numericMeasurements(merged);
  };

  const save = () => {
    const finalValues = collect();
    if (Object.keys(finalValues).length === 0) {
      void dialog.alert({
        title: t('cmeasurements.newTitle'),
        message: t('cmeasurements.needOne'),
        tone: 'info',
      });
      return;
    }
    const input = { label: label.trim() || null, values: finalValues, unitPreference: unit };
    const onDone = () => router.back();
    if (existing) {
      updateM.mutate({ id: existing.id, input }, { onSuccess: onDone, onError: (e) => void dialog.error(e) });
    } else {
      createM.mutate(input, { onSuccess: onDone, onError: (e) => void dialog.error(e) });
    }
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.padded}>
        <ScreenHeader title={existing ? t('cmeasurements.editTitle') : t('cmeasurements.newTitle')} />
      </View>
      <FormScroll contentContainerStyle={styles.body}>
        <Input
          label={t('cmeasurements.labelLabel')}
          value={label}
          onChangeText={setLabel}
          placeholder={t('cmeasurements.labelPlaceholder')}
        />

        <View style={styles.unitRow}>
          <Text variant="bodySm" tone="textMuted">
            {t('cmeasurements.unit')}
          </Text>
          <View style={styles.unitChips}>
            {UNITS.map((u) => (
              <Pressable
                key={u}
                onPress={() => setUnit(u)}
                style={[
                  styles.unitChip,
                  { borderColor: colors.hairline },
                  unit === u && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text variant="bodySm" style={{ color: unit === u ? colors.textOnPrimary : colors.text }}>
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <MeasurementsEditor
            values={values}
            setValues={setValues}
            pending={pending}
            setPending={setPending}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Button label={t('ccommon.save')} onPress={save} disabled={saving} loading={saving} />
        </View>
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  unitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  unitChips: { flexDirection: 'row', gap: spacing.sm },
  unitChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.md, borderWidth: 1 },
});
