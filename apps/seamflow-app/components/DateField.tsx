import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Text } from '@seamflow/ui';
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
  placeholder = 'Pick a date',
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const colors = useThemeColors();

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // On Android the picker is modal and fires once. On iOS with display=inline
    // it fires on every scroll — we only update on 'set'.
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && selected) {
      onChange(selected);
      if (Platform.OS !== 'android') setShowPicker(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="textMuted" style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowPicker(true)}
        >
          <Text variant="body" tone={value ? 'text' : 'textMuted'}>
            {value ? formatDate(value) : placeholder}
          </Text>
        </Pressable>
        {value ? (
          <Pressable
            style={[styles.clear, { borderColor: colors.border }]}
            onPress={() => onChange(null)}
          >
            <Text variant="bodySm">Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {showPicker ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
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
});
