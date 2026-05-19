import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radii, spacing } from '../lib/theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const style = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'danger' && styles.danger,
    (disabled || loading) && styles.disabled,
  ];
  const textStyle = [
    styles.text,
    variant === 'secondary' && styles.secondaryText,
    variant === 'danger' && styles.dangerText,
  ];
  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={textStyle}>{label}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  inner: { alignItems: 'center', justifyContent: 'center', minHeight: 22 },
  text: {
    color: colors.accentText,
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryText: { color: colors.text },
  dangerText: { color: colors.accentText },
});
