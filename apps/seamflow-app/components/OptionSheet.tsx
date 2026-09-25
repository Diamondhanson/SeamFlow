// ============================================================================
// <OptionSheet> — a centered card menu for single-select lists.
//
// Collapses a sprawling row of chips into one tidy control: a trigger pill
// opens this centered card listing the options, each with a tone dot and a
// checkmark on the active one. Long lists scroll inside the card. Tap an
// option (or the backdrop) to dismiss. Uses the shared `overlay` / `scrim`
// tokens so the layering matches every other dialog.
// ============================================================================

import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { activeFontFamilies,
  Text,
  useAtelierTheme,
  withAlpha,
  spacing,
  type SemanticColors, squircle } from '@seamflow/ui';

export interface SheetOption {
  key: string;
  label: string;
  /** Optional semantic tone for the leading dot (e.g. a status color). */
  tone?: keyof SemanticColors;
}

export function OptionSheet({
  visible,
  title,
  options,
  selectedKey,
  onSelect,
  onClose,
  onCreate,
  createLabel,
  emptyText,
}: {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  /** When set, a "＋ createLabel" row sits above the list so the user can add a
   *  new item instead of hitting a dead end (especially when the list is empty). */
  onCreate?: () => void;
  createLabel?: string;
  /** Shown in place of the list when there are no options. */
  emptyText?: string;
}) {
  const { colors } = useAtelierTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
        onPress={onClose}
      >
        {/* Swallow taps on the sheet so they don't dismiss. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.overlay }, {
            // Clear of the home indicator. A bottom sheet whose last row sits
            // under that bar is reachable on Android and not on an iPhone.
            paddingBottom: insets.bottom + spacing.l,
          }]}
          onPress={() => {}}
        >
          <View style={styles.head}>
            <Text variant="h3">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Create row — above the list so it's reachable without scrolling past
              a long library, and the way out when the list is empty. */}
          {onCreate && createLabel ? (
            <Pressable
              style={[styles.createRow, { borderColor: colors.hairline }]}
              onPress={onCreate}
              accessibilityRole="button"
            >
              <View style={[styles.createIcon, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </View>
              <Text variant="body" tone="primary" style={styles.createLabel}>
                {createLabel}
              </Text>
            </Pressable>
          ) : null}

          {options.length === 0 && emptyText ? (
            <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
              {emptyText}
            </Text>
          ) : null}

          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {options.map((opt, i) => {
            const active = opt.key === selectedKey;
            const dot = opt.tone ? colors[opt.tone] : colors.textMuted;
            return (
              <Pressable
                key={opt.key}
                style={[
                  styles.row,
                  i > 0 && { borderTopColor: colors.hairline, borderTopWidth: 1 },
                ]}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
                accessibilityRole="button"
              >
                <View style={[styles.dot, { backgroundColor: dot }]} />
                <Text
                  variant="body"
                  tone={active ? 'primary' : 'text'}
                  style={styles.rowLabel}
                >
                  {opt.label}
                </Text>
                {active ? (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '72%',
    alignSelf: 'center',
    borderRadius: 24,
    paddingTop: spacing.l,
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.l,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
    ...squircle,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m + 2,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { flex: 1 },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    marginBottom: spacing.xs,
  },
  createIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createLabel: { flex: 1, fontFamily: activeFontFamilies.bodySemibold },
  emptyText: { textAlign: 'center', paddingVertical: spacing.l },
});
