// ============================================================================
// <MeasurementsEditor> — attribute/value rows plus a quick-add palette.
//
// Extracted from the new-order flow so the order DETAIL screen edits
// measurements exactly the same way. Two different editors for one concept is
// how they drift, and this one took three attempts to get right — see the note
// below on why both inputs are visible from the start.
// ============================================================================

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chip, Text } from '@seamflow/ui';
import { Input } from './Input';
import { Button } from './Button';
import { MeasurementValueInput } from './MeasurementValueInput';
import { parseMeasurementValue, QUICK_MEASUREMENT_KEYS } from '../lib/measurements';
import { spacing, useThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';
import type { MeasurementValues } from '@seamflow/schemas';

/**
 * Turn the editor's raw string inputs into storable measurements.
 *
 * A value is a positive number, or a compound of numbers like "32-42-12" for
 * the attributes that genuinely have several parts. Anything blank or
 * unparseable is dropped rather than sent — a blank attribute is one the
 * tailor chose not to record, not a measurement of zero.
 *
 * Lives here so the new-order flow and the order screen apply the same rule.
 */
export function numericMeasurements(values: Record<string, string>): MeasurementValues {
  const out: MeasurementValues = {};
  for (const [k, v] of Object.entries(values)) {
    // Keeps compound values like "32-42-12" intact; a lone number still
    // stores as a number. Anything unparseable is dropped, as before.
    const parsed = parseMeasurementValue(v);
    if (parsed != null) out[k] = parsed;
  }
  return out;
}

/**
 * Manual measurements, when no template is chosen.
 *
 * Two earlier attempts got this wrong in the same way: the value field only
 * existed AFTER you had committed a name, so the first thing a tailor saw was
 * one lone box with no clue what came next. The original required a hidden
 * keyboard Enter to advance; the second added a button but still hid the value.
 *
 * Now the draft row shows BOTH inputs from the start — attribute and value,
 * side by side — with an "Add attribute" button under them. Nothing is hidden
 * and nothing depends on a keystroke you have to guess.
 *
 * The chips underneath stay as an accelerator: one tap fills the attribute for
 * the measurements almost every order needs.
 */
/** The half-typed row: an attribute named but not yet added to the list. */
export type PendingMeasurement = { name: string; value: string };

export const NO_PENDING: PendingMeasurement = { name: '', value: '' };

export function MeasurementsEditor({
  values,
  setValues,
  pending,
  setPending,
}: {
  values: Record<string, string>;
  setValues: (cb: (cur: Record<string, string>) => Record<string, string>) => void;
  /**
   * The draft row, lifted out of this component.
   *
   * It used to live in local state here, which quietly defeated the whole
   * unsaved-work rescue: a tailor types "Chest" and "94.5", is interrupted
   * before tapping "Add attribute", and that measurement is nowhere — not in
   * `values`, so not in the saved draft either. The row a tailor is *currently
   * typing* is the single most likely thing to be lost, so it has to live with
   * the rest of the form.
   *
   * Optional, with internal state as the fallback, so a caller that has no
   * draft to persist stays unchanged.
   */
  pending?: PendingMeasurement;
  setPending?: (next: PendingMeasurement) => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [ownPending, setOwnPending] = useState<PendingMeasurement>(NO_PENDING);

  const row = pending ?? ownPending;
  const setRow = setPending ?? setOwnPending;
  const draftName = row.name;
  const draftValue = row.value;
  const setDraftName = (name: string) => setRow({ ...row, name });
  const setDraftValue = (value: string) => setRow({ ...row, value });

  const valueRef = useRef<TextInput>(null);

  const commit = () => {
    const key = draftName.trim();
    if (!key) return;
    setValues((cur) => ({ ...cur, [key]: draftValue.trim() }));
    setRow(NO_PENDING);
  };

  const remove = (key: string) =>
    setValues((cur) => {
      const next = { ...cur };
      delete next[key];
      return next;
    });

  const entries = Object.entries(values);

  return (
    <View>
      <Text variant="label" tone="textMuted" style={styles.section}>
        {t('orders.manualMeasurementsCm')}
      </Text>
      <Text variant="bodySm" tone="textMuted" style={styles.measureHint}>
        {t('orders.manualMeasurementsHint')}
      </Text>

      {/* Already added — still editable, with a way back out. */}
      {entries.map(([k, v]) => (
        <View key={k} style={styles.measureRow}>
          <View style={styles.measureName}>
            <Input
              label={t('orders.attributeLabel')}
              value={k}
              editable={false}
            />
          </View>
          <View style={styles.measureValue}>
            <MeasurementValueInput
              label={t('orders.valueLabel')}
              value={v}
              onChangeText={(val) => setValues((cur) => ({ ...cur, [k]: val }))}
            />
          </View>
          <Pressable
            onPress={() => remove(k)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('orders.removeMeasurement', { name: k })}
            style={styles.measureRemove}
          >
            <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      {/* The draft row. Both boxes visible before you type anything. */}
      <View style={styles.measureRow}>
        <View style={styles.measureName}>
          <Input
            label={t('orders.attributeLabel')}
            value={draftName}
            onChangeText={setDraftName}
            autoCapitalize="words"
            placeholder={t('orders.attributePlaceholder')}
            returnKeyType="next"
            onSubmitEditing={() => valueRef.current?.focus()}
          />
        </View>
        <View style={styles.measureValue}>
          <MeasurementValueInput
            inputRef={valueRef}
            label={t('orders.valueLabel')}
            value={draftValue}
            onChangeText={setDraftValue}
            placeholder={t('orders.measurementValuePlaceholder')}
            returnKeyType="done"
            onSubmitEditing={commit}
          />
        </View>
        {/* Spacer keeps the draft row's inputs aligned with the rows above,
            which each carry a remove button in this column. */}
        {entries.length > 0 ? <View style={styles.measureRemoveSpacer} /> : null}
      </View>

      <Button
        label={t('orders.addAttribute')}
        variant="secondary"
        onPress={commit}
        disabled={!draftName.trim()}
      />

      {/* One tap fills the attribute for the usual suspects. */}
      <Text variant="bodySm" tone="textMuted" style={styles.measureQuickHint}>
        {t('orders.quickAddMeasurements')}
      </Text>
      <View style={styles.measureChips}>
        {QUICK_MEASUREMENT_KEYS.map((mkey) => {
          const name = t(`measurements.${mkey}`);
          const added = name in values;
          return (
            <Chip
              key={mkey}
              label={added ? `✓ ${name}` : `+ ${name}`}
              tone={added ? 'success' : 'primary'}
              onPress={() => {
                if (added) return remove(name);
                // Fill the draft rather than committing blind, so the tailor
                // lands on the value box with the attribute already set.
                setDraftName(name);
                valueRef.current?.focus();
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.md, marginBottom: spacing.sm },
  measureHint: { marginBottom: spacing.sm },
  measureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  measureName: { flex: 3 },
  measureValue: { flex: 2 },
  // Nudged down so the icon sits against the field, not its floating label.
  measureRemove: { paddingTop: 18 },
  measureRemoveSpacer: { width: 22 },
  measureQuickHint: { marginTop: spacing.md, marginBottom: spacing.sm },
  measureChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
