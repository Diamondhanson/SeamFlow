// ============================================================================
// <PhoneInput> — rich international phone field.
//
//   [ 🇳🇬 +234 ▾ ] [ 803 123 4567 ............ ]
//
// - Tap the country chip to pick a dial code from a searchable list.
// - As you type, the number formats to the selected country's convention
//   (via libphonenumber-js `AsYouType`).
// - Emits an E.164 string ("+2348031234567") to `onChangeText`, so callers
//   store a normalized number regardless of how the user typed it.
//
// Defaults the country to the tailor's profile country (falls back to NG).
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
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { useMe } from '../lib/queries';
import { useTranslation } from '../lib/i18n';
import { spacing } from '../lib/theme';
import { COUNTRY_NAMES } from '../lib/countryNames';

// Country names come from a bundled ISO map rather than Intl.DisplayNames,
// which is not reliably available under Hermes (it would fall back to showing
// the raw ISO code). Falls back to the code only for any unknown region.
function countryName(cc: string): string {
  return COUNTRY_NAMES[cc] ?? cc;
}

// Regional-indicator flag emoji from an ISO2 code. (On Android the system font
// may render the two letters instead of a flag — still informative.)
function flagEmoji(cc: string): string {
  return cc
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

interface Country {
  cc: CountryCode;
  name: string;
  dial: string;
}

// Built once — the full country list with dial codes, sorted by name.
const ALL_COUNTRIES: Country[] = getCountries()
  .map((cc) => ({ cc, name: countryName(cc), dial: getCountryCallingCode(cc) }))
  .sort((a, b) => a.name.localeCompare(b.name));

export interface PhoneInputProps {
  label: string;
  value: string;
  onChangeText: (e164: string) => void;
  defaultCountry?: CountryCode;
  placeholder?: string;
}

export function PhoneInput({
  label,
  onChangeText,
  defaultCountry,
  placeholder,
}: PhoneInputProps) {
  const { t } = useTranslation();
  const { colors, radii } = useAtelierTheme();
  const { data: me } = useMe();
  const placeholderText = placeholder ?? t('misc.phoneNumber');
  const initialCountry =
    defaultCountry ?? ((me?.tailor?.countryCode as CountryCode) || 'NG');

  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [raw, setRaw] = useState(''); // digits only
  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Formatted national display for the current raw digits + country.
  const display = useMemo(
    () => new AsYouType(country).input(raw),
    [raw, country],
  );

  const emit = (digits: string, cc: CountryCode) => {
    if (!digits) {
      onChangeText('');
      return;
    }
    const f = new AsYouType(cc);
    f.input(digits);
    onChangeText(f.getNumberValue() ?? `+${getCountryCallingCode(cc)}${digits}`);
  };

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setRaw(digits);
    emit(digits, country);
  };

  const pick = (cc: CountryCode) => {
    setCountry(cc);
    setPickerOpen(false);
    setSearch('');
    emit(raw, cc);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.cc.toLowerCase().includes(q) ||
        c.dial.includes(q.replace('+', '')),
    );
  }, [search]);

  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="textMuted" style={styles.label}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          {
            borderColor: focused ? colors.primary : colors.hairline,
            borderRadius: radii.m,
          },
        ]}
      >
        <Pressable
          style={[styles.ccBtn, { borderRightColor: colors.hairline }]}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('misc.selectCountryDialCode')}
        >
          <Text variant="body">
            {flagEmoji(country)} +{getCountryCallingCode(country)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
        <TextInput
          value={display}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="phone-pad"
          placeholder={placeholderText}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
        />
      </View>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={() => setPickerOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.overlay }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHead}>
              <Text variant="h3">{t('misc.selectCountry')}</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
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
                placeholder={t('misc.searchCountryOrCode')}
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.cc}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.row, { borderBottomColor: colors.hairline }]}
                  onPress={() => pick(item.cc)}
                >
                  <Text variant="body" style={styles.rowFlag}>
                    {flagEmoji(item.cc)}
                  </Text>
                  <Text variant="body" style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="body" tone="textMuted">
                    +{item.dial}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 50,
  },
  ccBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRightWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
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
    // Definite height so the dial-code FlatList (flex:1) has room — an auto-
    // height sheet collapses a flex list to 0 and shows no countries.
    height: '85%',
    borderRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  list: { flex: 1 },
  sheetHead: {
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
  rowFlag: { width: 28 },
  rowName: { flex: 1 },
});
