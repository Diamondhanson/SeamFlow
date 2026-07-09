// ============================================================================
// <ContactPickerModal> — pick a person from the device address book.
//
// Handles the permission prompt, loads + normalizes contacts, and offers a
// searchable list. Reused by the new-order client step and the group-order
// owner step. Selecting a contact hands back { name, phone } — the caller
// decides whether that maps to an existing client or a new one.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import type { CountryCode } from 'libphonenumber-js';
import {
  ensureContactsPermission,
  fetchDeviceContacts,
  type DeviceContact,
} from '../lib/contacts';
import { useTranslation } from '../lib/i18n';
import { spacing } from '../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (contact: DeviceContact) => void;
  defaultCountry: CountryCode;
}

export function ContactPickerModal({
  visible,
  onClose,
  onSelect,
  defaultCountry,
}: Props) {
  const { t } = useTranslation();
  const { colors, radii } = useAtelierTheme();
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setDenied(false);
      setSearch('');
      const ok = await ensureContactsPermission();
      if (cancelled) return;
      if (!ok) {
        setDenied(true);
        setLoading(false);
        return;
      }
      try {
        const list = await fetchDeviceContacts(defaultCountry);
        if (!cancelled) setContacts(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, defaultCountry]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    const digits = q.replace(/\D/g, '');
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (digits.length > 0 && c.phone.includes(digits)),
    );
  }, [search, contacts]);

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
            <Text variant="h3">{t('misc.selectFromContacts')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerFill}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : denied ? (
            <View style={styles.centerFill}>
              <Text variant="body" tone="textMuted" style={styles.deniedText}>
                {t('misc.contactsAccessOff')}
              </Text>
              <Pressable
                hitSlop={8}
                style={[styles.settingsBtn, { borderColor: colors.hairline }]}
                onPress={() => void Linking.openSettings()}
              >
                <Text variant="label" style={{ color: colors.primary }}>
                  {t('misc.openSettings')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
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
                  placeholder={t('misc.searchNameOrNumber')}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  style={[styles.searchInput, { color: colors.text }]}
                />
              </View>
              <FlatList
                data={filtered}
                keyExtractor={(c) => c.id}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                ListEmptyComponent={
                  <Text variant="bodySm" tone="textMuted" style={styles.empty}>
                    {t('misc.noContactsMatch')}
                  </Text>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.row, { borderBottomColor: colors.hairline }]}
                    onPress={() => onSelect(item)}
                  >
                    <View style={styles.rowText}>
                      <Text variant="body" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text variant="bodySm" tone="textMuted">
                        {item.phone}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textMuted}
                    />
                  </Pressable>
                )}
              />
            </>
          )}
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
    maxWidth: 600,
    // Definite height (not just maxHeight) so the FlatList's flex:1 has room —
    // a flex list inside an auto-height sheet collapses to 0 and renders nothing.
    height: '85%',
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
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deniedText: { textAlign: 'center' },
  settingsBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 9999,
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
  list: { flex: 1 },
  empty: { textAlign: 'center', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  rowText: { flex: 1 },
});
