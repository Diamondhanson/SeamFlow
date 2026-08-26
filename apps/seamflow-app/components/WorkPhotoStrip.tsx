// ============================================================================
// The photos of one design, as a horizontal strip.
//
// Shared by the describe screen (right after picking) and the design editor,
// so the set of photos looks and behaves the same in both places — a tailor
// who learns "tap a photo to make it the cover" in one should not have to
// learn it again in the other.
//
// Cover is position 0 and is badged, because which photo represents the design
// in the grid and on the public catalogue is a real decision and nothing else
// on screen would reveal it.
// ============================================================================

import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkImage } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { spacing, radii, useThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

const TILE = 84;

export interface WorkPhotoStripProps {
  /** Uploaded images. Empty while a fresh upload is still in flight. */
  images?: WorkImage[];
  /**
   * Local preview URIs, shown before the upload finishes so the tailor can see
   * what they picked while they type. Ignored once `images` arrives.
   */
  previewUris?: string[];
  /** Omit to render a read-only strip (no per-photo actions). */
  onPressImage?: (image: WorkImage) => void;
  onAdd?: () => void;
  busy?: boolean;
}

export function WorkPhotoStrip({
  images,
  previewUris,
  onPressImage,
  onAdd,
  busy,
}: WorkPhotoStripProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const uploaded = images ?? [];
  // Previews stand in only until the real images exist; showing both would
  // briefly double every photo.
  const showPreviews = uploaded.length === 0 && (previewUris?.length ?? 0) > 0;
  const count = showPreviews ? previewUris!.length : uploaded.length;

  return (
    <View>
      <View style={styles.header}>
        <Text variant="bodySm" tone="textMuted">
          {t('feed.photosLabel')}
        </Text>
        {count > 1 ? (
          <Text variant="caption" tone="textMuted">
            {t('feed.photosCount', { count })}
          </Text>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {showPreviews
          ? previewUris!.map((uri, i) => (
              <Tile key={uri} uri={uri} isCover={i === 0} dimmed />
            ))
          : uploaded.map((img) => (
              <Tile
                key={img.id}
                uri={img.thumbnailUrl ?? img.signedUrl}
                isCover={img.position === 0}
                onPress={onPressImage ? () => onPressImage(img) : undefined}
              />
            ))}

        {onAdd ? (
          <Pressable
            onPress={onAdd}
            disabled={busy}
            accessibilityLabel={t('feed.addPhotos')}
            style={[
              styles.tile,
              styles.addTile,
              { borderColor: colors.border, borderRadius: radii.lg },
            ]}
          >
            <Ionicons name="add" size={24} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Tile({
  uri,
  isCover,
  onPress,
  dimmed,
}: {
  uri?: string;
  isCover: boolean;
  onPress?: () => void;
  dimmed?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.tile, { backgroundColor: colors.card, borderRadius: radii.lg }]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius: radii.lg, opacity: dimmed ? 0.55 : 1 }]}
          resizeMode="cover"
        />
      ) : null}
      {isCover ? (
        <View style={[styles.coverBadge, { backgroundColor: colors.accent }]}>
          <Text variant="caption" style={{ color: colors.accentText }}>
            {t('feed.coverBadge')}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  strip: { gap: spacing.sm, paddingVertical: 2 },
  tile: { width: TILE, height: TILE, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  coverBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
});
