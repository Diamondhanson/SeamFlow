// ============================================================================
// <FabricField> — attach a fabric (from the library) to an order or group.
// Shows the currently-selected fabric as a swatch card with Change / Remove,
// or a "Choose fabric" button that opens a modal picker of the library.
//
// Used by the new-order wizard, the order detail screen, and the group form.
// The parent owns the selected id; this resolves display from useFabrics().
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@seamflow/utils';
import type { FabricResponse } from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Button } from './Button';
import { useFabrics, useMe } from '../lib/queries';
import {
  claimFabricHandoff,
  releaseFabricHandoff,
  takeFabric,
} from '../lib/fabric-handoff';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

function fabricMeta(
  f: FabricResponse,
  currency: string | null,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const bits: string[] = [];
  if (f.color) bits.push(f.color);
  if (f.costPerMeter != null && currency) {
    bits.push(t('fabrics.perMeter', { price: formatCurrency(Number(f.costPerMeter), currency) }));
  }
  return bits.join('  ·  ');
}

export function FabricField({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (fabricId: string | null) => void;
  /** Already-translated field label. Defaults to the generic "Fabric". */
  label?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const { data } = useFabrics();
  const { data: me } = useMe();
  const currency = me?.tailor?.currency ?? null;
  const [open, setOpen] = useState(false);

  // Identity for the handoff mailbox, so that when several pickers are alive at
  // once only the one that sent the tailor to the form takes the result back.
  const tokenRef = useRef<symbol>(Symbol('fabric-picker'));

  const goCreateFabric = () => {
    claimFabricHandoff(tokenRef.current);
    setOpen(false);
    router.push('/(app)/fabrics/new');
  };

  // Coming back from the create form: select what they just made. useFocusEffect
  // rather than a mount effect — this screen was never unmounted, only covered.
  useFocusEffect(
    useCallback(() => {
      const created = takeFabric(tokenRef.current);
      if (created) onChange(created);
    }, [onChange]),
  );

  useEffect(() => () => releaseFabricHandoff(tokenRef.current), []);

  const fabrics = data?.items ?? [];
  const selected = useMemo(
    () => (data?.items ?? []).find((f) => f.id === value) ?? null,
    [data?.items, value],
  );

  const swatch = (f: FabricResponse, size: number) =>
    f.photoThumbUrl ?? f.photoUrl ? (
      <Image
        source={{ uri: f.photoThumbUrl ?? f.photoUrl! }}
        style={{ width: size, height: size, borderRadius: radii.sm }}
      />
    ) : (
      <View
        style={[
          styles.swatchPlaceholder,
          { width: size, height: size, backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="layers-outline" size={size * 0.4} color={colors.textMuted} />
      </View>
    );

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="textMuted" style={styles.label}>
        {label ?? t('fabrics.fabricLabel')}
      </Text>

      {selected ? (
        <View style={[styles.selectedCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {swatch(selected, 48)}
          <View style={styles.selectedText}>
            <Text variant="body" tone="text" numberOfLines={1}>{selected.name}</Text>
            {fabricMeta(selected, currency, t) ? (
              <Text variant="bodySm" tone="textMuted" numberOfLines={1}>
                {fabricMeta(selected, currency, t)}
              </Text>
            ) : null}
          </View>
          <View style={styles.selectedActions}>
            <Pressable onPress={() => setOpen(true)} hitSlop={8}>
              <Text variant="bodySm" tone="primary" style={styles.action}>{t('fabrics.changeFabric')}</Text>
            </Pressable>
            <Pressable onPress={() => onChange(null)} hitSlop={8}>
              <Text variant="bodySm" tone="danger" style={styles.action}>{t('common.remove')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Button
          label={t('fabrics.chooseFabric')}
          variant="secondary"
          onPress={() => setOpen(true)}
        />
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.overlay }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHead}>
              <Text variant="h3" tone="text">{t('fabrics.pickerTitle')}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Above the list, not buried under it: the roll a tailor wants is
                most often the one they just bought and never entered, and with
                a long library they would have to scroll past everything they
                don't want to reach the way out. */}
            <View style={styles.newFabricRow}>
              <Button
                label={t('fabrics.newFabric')}
                variant="secondary"
                iconStart={<Ionicons name="add" size={18} color={colors.text} />}
                onPress={goCreateFabric}
              />
            </View>

            <FlatList
              data={fabrics}
              keyExtractor={(f) => f.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
                    {t('fabrics.pickerEmpty')}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.row, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  {swatch(item, 40)}
                  <View style={styles.rowText}>
                    <Text variant="body" tone="text" numberOfLines={1}>{item.name}</Text>
                    {fabricMeta(item, currency, t) ? (
                      <Text variant="bodySm" tone="textMuted" numberOfLines={1}>
                        {fabricMeta(item, currency, t)}
                      </Text>
                    ) : null}
                  </View>
                  {item.id === value ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // marginBottom matters: the picked-fabric card sits directly above the
  // "Meters used" input on the order screen, and Atelier's Input carries only
  // a bottom margin — so without this the two boxes share an edge.
  wrap: { marginTop: spacing.sm, marginBottom: spacing.md },
  label: { marginBottom: spacing.xs },
  swatchPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  selectedText: { flex: 1, minWidth: 0 },
  selectedActions: { alignItems: 'flex-end', gap: spacing.xs },
  action: { fontWeight: '600' },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  newFabricRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  rowText: { flex: 1, minWidth: 0 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyText: { textAlign: 'center' },
});
