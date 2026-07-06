// ============================================================================
// <OptionSheet> — a compact bottom-sheet menu for single-select filters.
//
// Collapses a sprawling row of chips into one tidy control: a trigger pill
// opens this sheet listing the options, each with a tone dot and a checkmark on
// the active one. Tap an option (or the backdrop) to dismiss. Uses the shared
// `overlay` / `scrim` tokens so the layering matches every other dialog.
// ============================================================================

import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  useAtelierTheme,
  spacing,
  type SemanticColors,
} from '@seamflow/ui';

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
}: {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const { colors } = useAtelierTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
        onPress={onClose}
      >
        {/* Swallow taps on the sheet so they don't dismiss. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.overlay }]}
          onPress={() => {}}
        >
          <View style={styles.head}>
            <Text variant="h3">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.l,
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
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
});
