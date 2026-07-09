// ============================================================================
// <CountryPickerModal> — a searchable bottom-sheet dialog for choosing a
// country. Returns the ISO2 code via `onSelect`. Names come from the bundled
// COUNTRY_NAMES map (not Intl), so they render correctly under Hermes.
//
// Styling mirrors the phone-field's dial-code sheet (same linen/midnight
// surfaces, hairline rows, Fraunces heading) so the two pickers feel identical.
// ============================================================================

import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, spacing } from '@seamflow/ui';
import { ALL_COUNTRIES, flagEmoji } from '../lib/countries';

export interface CountryPickerModalProps {
  visible: boolean;
  /** Currently-selected ISO2 code (highlighted in the list). */
  selected?: string | null;
  onSelect: (cc: string) => void;
  onClose: () => void;
  title: string;
  searchPlaceholder: string;
}

export function CountryPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
  title,
  searchPlaceholder,
}: CountryPickerModalProps) {
  const { colors, radii } = useAtelierTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.cc.toLowerCase().includes(q),
    );
  }, [search]);

  const pick = (cc: string) => {
    onSelect(cc);
    setSearch('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.overlay }]} onStartShouldSetResponder={() => true}>
          <View style={styles.head}>
            <Text variant="h3">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.hairline,
                borderRadius: radii.m,
              },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCorrect={false}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(c) => c.cc}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => {
              const active = selected?.toUpperCase() === item.cc;
              return (
                <Pressable
                  style={[styles.row, { borderBottomColor: colors.hairline }]}
                  onPress={() => pick(item.cc)}
                  accessibilityRole="button"
                >
                  <Text variant="body" style={styles.rowFlag}>
                    {flagEmoji(item.cc)}
                  </Text>
                  <Text
                    variant="body"
                    tone={active ? 'primary' : 'text'}
                    style={styles.rowName}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  ) : (
                    <Text variant="bodySm" tone="textMuted">
                      {item.cc}
                    </Text>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
    // Definite height so the FlatList (flex:1) has room to render — an auto-
    // height sheet collapses a flex list to 0 and shows nothing.
    height: '82%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.l,
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xl,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    borderWidth: 1,
    paddingHorizontal: spacing.m,
    height: 44,
    marginBottom: spacing.s,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
  },
  rowFlag: { width: 28 },
  rowName: { flex: 1 },
  list: { flex: 1 },
});
