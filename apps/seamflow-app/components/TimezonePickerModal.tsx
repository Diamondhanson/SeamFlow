// ============================================================================
// <TimezonePickerModal> — override the reminder timezone (or reset to auto).
// Passing null from onSelect means "automatic" (server derives from country).
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
import { Text, useAtelierTheme } from '@seamflow/ui';
import { TIMEZONES } from '../lib/timezones';
import { useTranslation } from '../lib/i18n';
import { spacing } from '../lib/theme';

interface Props {
  visible: boolean;
  current: string | null;
  onClose: () => void;
  onSelect: (tz: string | null) => void;
}

export function TimezonePickerModal({ visible, current, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors, radii } = useAtelierTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TIMEZONES;
    return TIMEZONES.filter((z) => z.toLowerCase().includes(q));
  }, [search]);

  const Row = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <Pressable style={[styles.row, { borderBottomColor: colors.hairline }]} onPress={onPress}>
      <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </Text>
      {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.overlay }]} onStartShouldSetResponder={() => true}>
          <View style={styles.head}>
            <Text variant="h3">{t('settings.timezone')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View
            style={[
              styles.searchWrap,
              { backgroundColor: colors.surface, borderColor: colors.hairline, borderRadius: radii.m },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('common.search')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(z) => z}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            ListHeaderComponent={
              <Row
                label={t('settings.timezoneAuto')}
                active={current === null}
                onPress={() => onSelect(null)}
              />
            }
            renderItem={({ item }) => (
              <Row label={item} active={current === item} onPress={() => onSelect(item)} />
            )}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
    width: '95%',
    height: '75%',
    borderRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
});
