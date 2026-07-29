// ============================================================================
// <ScanOverlay> — labeled progress state for the AI scan step.
//
// Per the skeleton rule this is an async AI job, not a data fetch, so it gets
// a progress message ("Reading your template…") with the picked photo dimmed
// behind it — not a data skeleton and not a bare spinner.
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
  /** The picked photo, dimmed behind the progress badge. */
  imageUri: string | null;
  /** Localized progress message — pass a t() result. */
  label: string;
}) {
  const { colors } = useAtelierTheme();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : null}
        <View style={[styles.badge, { backgroundColor: colors.overlay }]}>
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
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  badge: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
  },
  badgeText: { marginTop: spacing.sm, textAlign: 'center' },
});
