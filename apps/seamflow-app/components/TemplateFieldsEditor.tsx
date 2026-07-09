// ============================================================================
// <TemplateFieldsEditor> — build a template's measurement list.
//
// The tailor types (or taps) ONE thing per measurement — its name. There is no
// separate "key" input: the key is derived from the name at save time (see
// lib/measurements.ts → finalizeTemplateFields). A quick-add palette of common
// measurements (grouped by body region) makes it mostly tapping; a custom-field
// button covers anything unusual.
//
// Owns nothing — the parent holds the `EditableField[]` and persists it.
// Reused by the template create screen (and the edit screen once fields become
// editable there).
// ============================================================================

import { StyleSheet, View } from 'react-native';
import { Text, Chip, useAtelierTheme } from '@seamflow/ui';
import type { EditableField } from '../lib/measurements';
import { MEASUREMENT_GROUPS } from '../lib/measurements';
import { Card } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export function TemplateFieldsEditor({
  fields,
  onChange,
}: {
  fields: EditableField[];
  onChange: (next: EditableField[]) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();

  const update = (i: number, patch: Partial<EditableField>) =>
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));

  const addCustom = () => onChange([...fields, { label: '', unit: 'cm' }]);

  const has = (name: string) =>
    fields.some((f) => f.label.trim().toLowerCase() === name.toLowerCase());

  // Tap a chip: add the measurement, or remove it if it's already in the list.
  const toggle = (name: string) => {
    if (has(name)) {
      onChange(
        fields.filter((f) => f.label.trim().toLowerCase() !== name.toLowerCase()),
      );
    } else {
      onChange([...fields, { label: name, unit: 'cm' }]);
    }
  };

  return (
    <View>
      <Text variant="h3" style={styles.heading}>
        {t('templates.measurementFields')}
      </Text>

      {fields.length === 0 ? (
        <Text variant="bodySm" tone="textMuted">
          {t('templates.noFieldsYet')}
        </Text>
      ) : (
        fields.map((f, i) => (
          <Card key={i}>
            <Input
              label={t('templates.fieldNameLabel')}
              value={f.label}
              onChangeText={(v) => update(i, { label: v })}
              placeholder={t('templates.fieldNamePlaceholder')}
            />
            <View style={styles.row}>
              <Button
                label={f.required ? t('templates.required') : t('templates.optional')}
                variant="secondary"
                onPress={() => update(i, { required: !f.required })}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                label={f.unit === 'in' ? 'in' : 'cm'}
                variant="secondary"
                onPress={() => update(i, { unit: f.unit === 'in' ? 'cm' : 'in' })}
              />
            </View>
            <View style={{ height: spacing.sm }} />
            <Button
              label={t('templates.removeField')}
              variant="danger"
              onPress={() => remove(i)}
            />
          </Card>
        ))
      )}

      <Button
        label={t('templates.addCustomField')}
        variant="secondary"
        onPress={addCustom}
      />

      {/* Quick-add palette */}
      <View style={styles.paletteHead}>
        <Text variant="label" tone="textMuted">
          {t('templates.quickAddHeading')}
        </Text>
        <Text variant="bodySm" tone="textMuted" style={{ marginTop: 2 }}>
          {t('templates.quickAddHelp')}
        </Text>
      </View>

      {MEASUREMENT_GROUPS.map((group) => (
        <View key={group.titleKey} style={styles.group}>
          <Text variant="label" tone="textMuted" style={styles.groupTitle}>
            {t(group.titleKey)}
          </Text>
          <View style={styles.chips}>
            {group.keys.map((mkey) => {
              const name = t(`measurements.${mkey}`);
              const added = has(name);
              return (
                <Chip
                  key={mkey}
                  label={added ? `✓ ${name}` : `+ ${name}`}
                  tone={added ? 'success' : 'primary'}
                  onPress={() => toggle(name)}
                />
              );
            })}
          </View>
        </View>
      ))}

      {/* soft rule so the palette doesn't butt against the save button */}
      <View style={[styles.rule, { backgroundColor: colors.hairline }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.sm },
  row: { flexDirection: 'row' },
  paletteHead: { marginTop: spacing.xl },
  group: { marginTop: spacing.md },
  groupTitle: { marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rule: { height: 1, marginTop: spacing.lg },
});
