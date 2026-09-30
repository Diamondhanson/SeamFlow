// ============================================================================
// "Like this, but…" — the change picker on an enquiry.
//
// A customer looking at a design almost never wants exactly that design. They
// want it with sleeves, or shorter, or in blue. Today they have to write that
// sentence themselves, and "can you make it a bit shorter?" is not something a
// tailor can cut from.
//
// WHY THIS IS TAPS AND NOT A TEXT BOX
//
// The whole vocabulary already exists (design-attributes.ts) and is already
// translated into six languages. Because it stores KEYS rather than words, a
// customer tapping "Manches courtes" in French is read by an English tailor as
// "Short sleeve" — no translation, and no arguing later about what was meant.
// A free-text box throws all of that away and hands the tailor a sentence to
// interpret.
//
// WHY IT SHOWS THE CURRENT VALUE
//
// Every row reads "Length — Maxi", and tapping it offers the alternatives. That
// is only possible because the design is TAGGED, and it is the difference
// between a form ("what length do you want?") and an adjustment ("not that one,
// this one"). People are far better at the second.
//
// An untagged axis still works — it reads "Length — not set" and the customer
// picks from scratch — so a design the classifier could not describe is
// degraded, not broken.
//
// THIS IS A BRIEF, NOT A NEW DESIGN. It goes to the designer who made the
// original, inside the enquiry. There is deliberately nothing to download and
// nothing to take elsewhere.
// ============================================================================

import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ATTRIBUTE_GROUP_LABELS,
  attributeLabel,
  attributesByGroup,
  colorLabel,
  DESIGN_COLORS,
  type DesignChange,
} from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { useDialog } from '../lib/dialog';
import { useTranslation } from '../lib/i18n';
import { spacing } from '../lib/theme';

/** The axes a customer may change, in the order they matter when choosing. */
const GROUPS = ['length', 'sleeve', 'neckline', 'silhouette', 'color'] as const;
type ChangeGroup = (typeof GROUPS)[number];

export interface DesignChangePickerProps {
  /** The design's own attribute keys, as published. */
  attributes: string[];
  /** The design's own colour keys. */
  colors: string[];
  changes: DesignChange[];
  onChange: (next: DesignChange[]) => void;
}

export function DesignChangePicker({
  attributes,
  colors,
  changes,
  onChange,
}: DesignChangePickerProps) {
  const { t, language } = useTranslation();
  const { colors: atelier } = useAtelierTheme();
  const dialog = useDialog();

  const byGroup = useMemo(() => attributesByGroup(), []);

  /** What the design is on this axis, or null when it was never tagged. */
  const currentOf = (group: ChangeGroup): string | null => {
    if (group === 'color') return colors[0] ?? null;
    const items = byGroup.find((g) => g.group === group)?.items ?? [];
    return attributes.find((a) => items.some((i) => i.key === a)) ?? null;
  };

  const labelOf = (group: ChangeGroup, key: string): string =>
    group === 'color' ? colorLabel(key, language) : attributeLabel(key, language);

  const groupTitle = (group: ChangeGroup): string =>
    group === 'color'
      ? t('discover.changeColor')
      : ATTRIBUTE_GROUP_LABELS[group][language];

  const pick = async (group: ChangeGroup) => {
    const current = currentOf(group);
    const options =
      group === 'color'
        ? DESIGN_COLORS.map((c) => ({ key: c.key, label: colorLabel(c.key, language) }))
        : (byGroup.find((g) => g.group === group)?.items ?? []).map((i) => ({
            key: i.key,
            label: attributeLabel(i.key, language),
          }));

    const existing = changes.find((c) => c.group === group);
    const picked = await dialog.pick({
      title: groupTitle(group),
      options,
      selectedKey: existing?.to ?? current ?? undefined,
    });
    if (!picked) return;

    const rest = changes.filter((c) => c.group !== group);
    // Picking what it already is means "no change", not "change it to itself".
    // Without this the tailor gets a brief saying "Maxi instead of Maxi".
    if (picked === current) {
      onChange(rest);
      return;
    }
    onChange([...rest, { group, from: current, to: picked }]);
  };

  return (
    <View>
      {GROUPS.map((group) => {
        const current = currentOf(group);
        const change = changes.find((c) => c.group === group);
        const shown = change?.to ?? current;
        return (
          <Pressable
            key={group}
            onPress={() => pick(group)}
            style={[styles.row, { borderColor: atelier.hairline }]}
          >
            <Text variant="bodySm" tone="textMuted" style={styles.group}>
              {groupTitle(group)}
            </Text>
            <Text
              variant="bodySm"
              tone={change ? 'primary' : 'text'}
              style={styles.value}
              numberOfLines={1}
            >
              {shown ? labelOf(group, shown) : t('discover.changeNotSet')}
            </Text>
            {change ? (
              <Ionicons name="pencil" size={13} color={atelier.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={14} color={atelier.textMuted} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  group: { width: 92 },
  value: { flex: 1 },
});
