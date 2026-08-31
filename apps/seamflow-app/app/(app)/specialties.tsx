// ============================================================================
// "What do you make?" — the tailor's specialties, as taps rather than typing.
//
// This used to be a comma-separated text box on the storefront screen, and the
// result was predictable: 0 of 9 tailors had set anything, and the garment
// names that did exist elsewhere in the app had drifted into "Caftan" vs
// "kaftan" vs "all garments. ".
//
// Specialties are the input to matching — which tailors hear about a client's
// request, and how offers get ranked (ROADMAP appendix H). Free text cannot do
// that job, so this writes canonical keys from the shared taxonomy.
//
// It is also the first task in the getting-started checklist, and it resurfaces
// for tailors who signed up before it existed. See <GettingStarted>.
// ============================================================================

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import {
  GARMENT_CATEGORY_LABELS,
  garmentsByCategory,
  type GarmentCategory,
} from '@seamflow/schemas';
import { Chip, Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { FormScroll } from '../../components/FormScroll';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';
import { useMe, useUpdateTailorProfile } from '../../lib/queries';
import { spacing } from '../../lib/theme';
import { useDialog } from '../../lib/dialog';
import { useTranslation } from '../../lib/i18n';

/** Matches the cap in TailorProfileUpdateSchema. A tailor who claims to make
 *  everything is telling matching nothing. */
const MAX_SPECIALTIES = 12;

export default function SpecialtiesScreen() {
  const { t, language } = useTranslation();
  const dialog = useDialog();
  const { data: me } = useMe();
  const update = useUpdateTailorProfile();

  const [picked, setPicked] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Seed once from the server, then leave the selection alone — a refetch
  // mid-edit must not wipe taps the tailor has already made.
  useEffect(() => {
    if (seeded || !me?.tailor) return;
    setPicked(me.tailor.specialties ?? []);
    setSeeded(true);
  }, [me?.tailor, seeded]);

  const groups = garmentsByCategory();
  const atCap = picked.length >= MAX_SPECIALTIES;

  const toggle = (key: string) =>
    setPicked((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key);
      if (cur.length >= MAX_SPECIALTIES) return cur;
      return [...cur, key];
    });

  const save = () => {
    update.mutate(
      { specialties: picked },
      {
        onSuccess: () => router.back(),
        onError: (err) => void dialog.error(err),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title={t('specialties.title')} />
      <FormScroll contentContainerStyle={{ paddingBottom: 120 }}>
        <Text variant="bodySm" tone="textMuted">
          {t('specialties.intro')}
        </Text>
        <Text variant="caption" tone={atCap ? 'warning' : 'textMuted'} style={styles.count}>
          {atCap
            ? t('specialties.atCap', { max: MAX_SPECIALTIES })
            : t('specialties.count', { count: picked.length, max: MAX_SPECIALTIES })}
        </Text>

        {groups.map(({ category, items }) => (
          <View key={category} style={styles.group}>
            <Text variant="label" tone="textMuted" style={styles.groupTitle}>
              {GARMENT_CATEGORY_LABELS[category as GarmentCategory][language]}
            </Text>
            <View style={styles.chips}>
              {items.map((g) => {
                const on = picked.includes(g.key);
                return (
                  <Chip
                    key={g.key}
                    label={on ? `✓ ${g[language]}` : g[language]}
                    tone={on ? 'success' : 'primary'}
                    onPress={() => toggle(g.key)}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </FormScroll>

      <View style={styles.footer}>
        <Button
          label={t('common.save')}
          onPress={save}
          loading={update.isPending}
          disabled={picked.length === 0}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: { marginTop: spacing.xs, marginBottom: spacing.md },
  group: { marginTop: spacing.lg },
  groupTitle: { marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
