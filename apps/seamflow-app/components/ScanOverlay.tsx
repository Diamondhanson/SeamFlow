// ============================================================================
// <ScanOverlay> — labeled progress state for the AI scan step.
//
// Per the skeleton rule this is an async AI job, not a data fetch, so it gets
// a progress message ("Reading your template…") over the picked photo. The
// backdrop is fully OPAQUE (theme background) — no translucency: the photo
// sits in a rounded card at full strength with the progress row beneath it.
// ============================================================================

import { ActivityIndicator, Image, Modal, StyleSheet, View } from 'react-native';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { radii, spacing } from '../lib/theme';

export function ScanOverlay({
  visible,
  imageUri,
  label,
}: {
  visible: boolean;
  /** The picked photo, previewed while the AI reads it. */
  imageUri: string | null;
  /** Localized progress message — pass a t() result. */
  label: string;
}) {
  const { colors } = useAtelierTheme();
  return (
    <Modal visible={visible} animationType="fade">
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[
              styles.image,
              { backgroundColor: colors.surface, borderColor: colors.hairline },
            ]}
            resizeMode="contain"
          />
        ) : null}
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.surface, borderColor: colors.hairline },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
          <Text variant="body" style={styles.badgeText}>
            {label}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  image: {
    width: '100%',
    height: '60%',
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  badgeText: { textAlign: 'center' },
});
