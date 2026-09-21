// ============================================================================
// <TemplateFieldsEditor> — build a template's measurement list.
//
// The tailor types (or taps) ONE thing per measurement — its name. There is no
// separate "key" input: the key is derived from the name at save time (see
// lib/measurements.ts → finalizeTemplateFields). A quick-add palette of common
// measurements (grouped by body region) makes it mostly tapping; a custom-field
// button covers anything unusual.
//
// WHAT EACH FIELD CARD USED TO HAVE, AND WHY IT IS GONE
// Two buttons sat in a row under every name: Optional/Required and cm/in.
// Both defaulted to full width, so the second was shoved off-screen — tailors
// saw a half-visible button and reasonably assumed it was "Required".
//
// Neither did anything. `required` was saved and read back but never checked
// by any screen or by the API, and the per-field unit was never read by the
// measurement editor, which enters and labels everything in centimetres. The
// unit toggle was worse than dead: a tailor who set a field to inches would
// believe they were recording inches while every value was stored as cm.
// Both are removed. Existing templates keep their old values in storage,
// harmlessly; nothing reads them.
//
// Owns nothing — the parent holds the `EditableField[]` and persists it.
// Reused by the template create screen (and the edit screen once fields become
// editable there).
// ============================================================================

import { useState } from 'react';
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

  // The full palette is four groups and dozens of chips — on a phone it was
  // longer than the template it was helping to build. Collapsed, it shows the
  // most-asked-for measurements (the groups are ordered that way, upper body
  // first) and nothing else.
  const [showAllQuick, setShowAllQuick] = useState(false);
  const allQuickKeys = MEASUREMENT_GROUPS.flatMap((g) => g.keys);
  const hiddenCount = Math.max(0, allQuickKeys.length - QUICK_ADD_COLLAPSED);

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
              onChangeText={(v) => update(i, { label: v, lowConfidence: false })}
              placeholder={t('templates.fieldNamePlaceholder')}
            />
            {f.lowConfidence ? (
              <Text variant="bodySm" tone="warning" style={styles.lowConfidence}>
                {t('templates.scanLowConfidence')}
              </Text>
            ) : null}
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

      {showAllQuick ? (
        MEASUREMENT_GROUPS.map((group) => (
          <View key={group.titleKey} style={styles.group}>
            <Text variant="label" tone="textMuted" style={styles.groupTitle}>
              {t(group.titleKey)}
            </Text>
            <View style={styles.chips}>
              {group.keys.map((mkey) => (
                <QuickChip key={mkey} mkey={mkey} has={has} toggle={toggle} />
              ))}
            </View>
          </View>
        ))
      ) : (
        // Collapsed: no group headings. With seven chips a heading per region
        // is more structure than content.
        <View style={[styles.chips, styles.group]}>
          {allQuickKeys.slice(0, QUICK_ADD_COLLAPSED).map((mkey) => (
            <QuickChip key={mkey} mkey={mkey} has={has} toggle={toggle} />
          ))}
        </View>
      )}

      {hiddenCount > 0 ? (
        <View style={styles.more}>
          <Button
            label={
              showAllQuick
                ? t('templates.quickAddLess')
                : t('templates.quickAddMore', { count: hiddenCount })
            }
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => setShowAllQuick((v) => !v)}
          />
        </View>
      ) : null}

      {/* soft rule so the palette doesn't butt against the save button */}
      <View style={[styles.rule, { backgroundColor: colors.hairline }]} />
    </View>
  );
}

/**
 * Seven: enough to cover a typical top (chest, waist, shoulder, sleeve…) in one
 * glance, few enough to fit in about two rows on a phone.
 */
const QUICK_ADD_COLLAPSED = 7;

function QuickChip({
  mkey,
  has,
  toggle,
}: {
  mkey: string;
  has: (name: string) => boolean;
  toggle: (name: string) => void;
}) {
  const { t } = useTranslation();
  const name = t(`measurements.${mkey}`);
  const added = has(name);
  return (
    <Chip
      label={added ? `✓ ${name}` : `+ ${name}`}
      tone={added ? 'success' : 'primary'}
      onPress={() => toggle(name)}
    />
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.sm },
  lowConfidence: { marginBottom: spacing.sm },
  paletteHead: { marginTop: spacing.xl },
  group: { marginTop: spacing.md },
  groupTitle: { marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  more: { marginTop: spacing.sm, alignItems: 'flex-start' },
  rule: { height: 1, marginTop: spacing.lg },
});
