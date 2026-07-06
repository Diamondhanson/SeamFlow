import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { useTranslation } from '../lib/i18n';
import { radii, spacing, useThemeColors } from '../lib/theme';

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  // iOS keeps a draft so a scroll doesn't commit until the user taps Done.
  const [iosDraft, setIosDraft] = useState<Date | null>(null);
  const colors = useThemeColors();
  const theme = useAtelierTheme();
  const isIOS = Platform.OS === 'ios';
  const placeholderText = placeholder ?? t('misc.pickADate');

  const openPicker = () => {
    if (isIOS) setIosDraft(value ?? new Date());
    setShowPicker(true);
  };

  // Android: the OS renders a one-shot modal dialog that fires 'set' or
  // 'dismissed' and closes itself.
  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selected) onChange(selected);
  };

  // iOS: the spinner fires on every turn — hold the value in a draft and only
  // commit when the user confirms.
  const handleIosChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setIosDraft(selected);
  };

  const confirmIos = () => {
    onChange(iosDraft ?? new Date());
    setShowPicker(false);
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="textMuted" style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.field, { backgroundColor: colors.card, borderColor: colors.hairline }]}
          onPress={openPicker}
        >
          <Text variant="body" tone={value ? 'text' : 'textMuted'}>
            {value ? formatDate(value) : placeholderText}
          </Text>
        </Pressable>
        {value ? (
          <Pressable
            style={[styles.clear, { borderColor: colors.hairline }]}
            onPress={() => onChange(null)}
          >
            <Text variant="bodySm">{t('common.clear')}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Android renders the native dialog inline. */}
      {showPicker && !isIOS ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      {/* iOS: the native picker has no Done/Cancel of its own and won't
          dismiss on tap-outside, so we host it in a bottom sheet with explicit
          actions — otherwise the user gets stuck in the picker. */}
      {isIOS ? (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable
            style={[styles.backdrop, { backgroundColor: theme.colors.scrim }]}
            onPress={() => setShowPicker(false)}
          >
            <View
              style={[styles.sheet, { backgroundColor: theme.colors.overlay }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.hairline }]}>
                <Pressable hitSlop={8} onPress={() => setShowPicker(false)}>
                  <Text variant="body" tone="textMuted">{t('common.cancel')}</Text>
                </Pressable>
                <Text variant="label">{label}</Text>
                <Pressable hitSlop={8} onPress={confirmIos}>
                  <Text variant="body" style={{ color: theme.colors.primary }}>
                    {t('common.done')}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosDraft ?? value ?? new Date()}
                mode="date"
                display="spinner"
                themeVariant={theme.mode === 'midnight' ? 'dark' : 'light'}
                accentColor={theme.colors.primary}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleIosChange}
                style={styles.iosPicker}
              />
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

function formatDate(d: Date): string {
  // Locale-friendly display, e.g. "Aug 15, 2026"
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  field: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 50,
    justifyContent: 'center',
  },
  clear: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  iosPicker: {
    alignSelf: 'stretch',
  },
});
