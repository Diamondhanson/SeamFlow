// ============================================================================
// Tile — home-screen card-with-icon, restyled to Atelier.
//
// Internal text now uses the Atelier <Text> primitive so labels render in
// Inter (semibold for the title, regular for the description). Background
// + border use Atelier semantic tokens via theme.colors so the visual
// identity matches the rest of the system.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { radii, spacing } from '../lib/theme';

interface TileProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accent?: boolean;
  description?: string;
}

export function Tile({ label, icon, onPress, accent, description }: TileProps) {
  const theme = useAtelierTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.tile,
        {
          backgroundColor: accent ? theme.colors.primary : theme.colors.surface,
          borderColor: accent ? theme.colors.primary : theme.colors.hairline,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: accent
              ? 'rgba(16,16,26,0.18)' // dark wash on the primary fill
              : theme.colors.surfaceElevated,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={28}
          color={accent ? theme.colors.textOnPrimary : theme.colors.primary}
        />
      </View>
      <Text
        variant="h3"
        tone={accent ? 'textOnPrimary' : 'text'}
        style={{ marginTop: spacing.sm }}
      >
        {label}
      </Text>
      {description ? (
        <Text
          variant="caption"
          tone={accent ? 'textOnPrimary' : 'textMuted'}
          style={{ marginTop: 2 }}
        >
          {description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
