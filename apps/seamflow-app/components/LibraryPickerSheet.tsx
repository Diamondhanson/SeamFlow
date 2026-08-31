// ============================================================================
// <LibraryPickerSheet> — attach photos an order can already reach.
//
// Before this, a photo could only join an order from the camera or the phone's
// gallery. So a tailor who had saved an inspiration shot into Design Studio had
// to save it to their gallery as well and re-pick it from there: the app held
// the image and made you fetch it back from outside.
//
// Two sources, one grid:
//
//   Design Studio  inspiration collected elsewhere (the `designs` table)
//   My Designs     work the tailor made (`tailor_works`)
//
// Multi-select, because "add the three references the client sent" is one
// action, not three.
//
// Nothing is uploaded when you confirm. The server copies the objects inside
// Storage and returns the new order photos — see the API's attachFromLibrary.
// The originals stay exactly where they were; this is a copy, never a move.
// ============================================================================

import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Button } from './Button';
import { useDesigns, useWorks } from '../lib/queries';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export type LibrarySelection = { designIds: string[]; workIds: string[] };

type Tab = 'designs' | 'works';

/** One selectable image, flattened from either source. */
interface Item {
  id: string;
  uri: string | undefined;
  label: string | null;
}

export function LibraryPickerSheet({
  visible,
  onClose,
  onConfirm,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selection: LibrarySelection) => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  // Atelier theme rather than useThemeColors: this is a bottom sheet, and
  // `overlay`/`scrim` (the layering tokens <OptionSheet> uses) only live there.
  const { colors } = useAtelierTheme();
  const [tab, setTab] = useState<Tab>('designs');
  const [picked, setPicked] = useState<LibrarySelection>({ designIds: [], workIds: [] });

  const designsQ = useDesigns();
  const worksQ = useWorks();

  const designs: Item[] = (designsQ.data?.items ?? []).map((d) => ({
    id: d.id,
    uri: d.thumbnailUrl ?? d.signedUrl,
    label: d.caption,
  }));
  const works: Item[] = (worksQ.data?.pages ?? []).flatMap((page) =>
    page.items.map((w) => ({ id: w.id, uri: w.thumbnailUrl ?? w.signedUrl, label: w.title })),
  );

  const items = tab === 'designs' ? designs : works;
  const loading = tab === 'designs' ? designsQ.isLoading : worksQ.isLoading;
  const selectedIds = tab === 'designs' ? picked.designIds : picked.workIds;
  const total = picked.designIds.length + picked.workIds.length;

  const toggle = (id: string) =>
    setPicked((cur) => {
      const key = tab === 'designs' ? 'designIds' : 'workIds';
      const list = cur[key];
      return {
        ...cur,
        [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      };
    });

  const close = () => {
    setPicked({ designIds: [], workIds: [] });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: colors.overlay }]}>
          <View style={styles.header}>
            <Text variant="h3">{t('orders.attachFromLibraryTitle')}</Text>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Two sources, and the labels are the ones on the home screen — a
              picker that renames them would be a third vocabulary to learn. */}
          <View style={styles.tabs}>
            {(['designs', 'works'] as Tab[]).map((key) => {
              const active = tab === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTab(key)}
                  style={[
                    styles.tab,
                    { borderBottomColor: active ? colors.accent : 'transparent' },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    variant="bodySm"
                    tone={active ? 'text' : 'textMuted'}
                    style={active ? styles.tabActive : undefined}
                  >
                    {key === 'designs' ? t('home.designStudio') : t('feed.worksTitle')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.center}>
              <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
                {tab === 'designs'
                  ? t('orders.attachNoDesigns')
                  : t('orders.attachNoWorks')}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.grid}>
              {items.map((item) => {
                const on = selectedIds.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggle(item.id)}
                    style={[
                      styles.cell,
                      { borderColor: on ? colors.accent : colors.border },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={item.label ?? t('orders.attachUntitled')}
                  >
                    {item.uri ? (
                      <Image source={{ uri: item.uri }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, { backgroundColor: colors.surface }]} />
                    )}
                    {on ? (
                      <View style={[styles.check, { backgroundColor: colors.accent }]}>
                        <Ionicons name="checkmark" size={16} color={colors.bg} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Button
              label={
                total > 0
                  ? t('orders.attachCount', { count: total })
                  : t('orders.attachNothingPicked')
              }
              onPress={() => onConfirm(picked)}
              disabled={total === 0 || busy}
              loading={busy}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.lg },
  tab: { paddingVertical: spacing.sm, borderBottomWidth: 2 },
  tabActive: { fontWeight: '600' },
  center: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  check: {
    position: 'absolute',
    top: 6,
    end: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
