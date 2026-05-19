import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing } from '../lib/theme';

interface TileProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accent?: boolean;
  description?: string;
}

export function Tile({ label, icon, onPress, accent, description }: TileProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.tile, accent && styles.accentTile]}
    >
      <View
        style={[styles.iconWrap, accent ? styles.accentIconWrap : styles.iconWrapDefault]}
      >
        <Ionicons
          name={icon}
          size={28}
          color={accent ? colors.accentText : colors.accent}
        />
      </View>
      <Text style={[styles.label, accent && styles.accentLabel]}>{label}</Text>
      {description ? (
        <Text style={[styles.desc, accent && styles.accentDesc]}>{description}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
  },
  accentTile: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDefault: { backgroundColor: colors.cardElevated },
  accentIconWrap: { backgroundColor: 'rgba(255,255,255,0.15)' },
  label: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  accentLabel: { color: colors.accentText },
  desc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  accentDesc: { color: 'rgba(255,255,255,0.85)' },
});
