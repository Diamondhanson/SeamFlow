// ============================================================================
// <FullscreenGallery> — one design, every angle, nothing cropped.
//
// The design screen shows its photos in a fixed-height hero with
// resizeMode="cover", which is right for a page but wrong for looking: a tall
// gown loses its hem, a wide two-piece loses its sleeves. Tapping the hero
// opens this, where each image is shown WHOLE at its true aspect ratio.
//
// THE BACKDROP
// A contained image leaves bars wherever its shape differs from the screen's.
// Flat black bars read as "this photo is the wrong size". Instead the same
// photo is drawn again underneath, stretched to cover and heavily blurred,
// under a dark scrim — so the bars become a soft, dark wash of the garment's
// own colours. The image appears to sit in light it came with.
//
// It is the SAME photo on purpose, not a generic blur or a gradient: an indigo
// agbada gets an indigo glow, a gold kaba a gold one, with no colour
// extraction and nothing to keep in sync.
//
// BEHAVIOUR
//   · swipe between angles, exactly like the hero — same order, same index
//   · opens at whichever angle the hero was showing, so tapping the back view
//     does not dump you on the front
//   · closes with the × or the system back gesture
//   · the counter ("2 / 4") only appears for more than one photo
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FeedImage } from '@seamflow/schemas';
import { activeFontFamilies, Text } from '@seamflow/ui';
import { spacing } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

/**
 * Strong enough that no detail survives — the backdrop should read as light
 * and colour, never as a second, fuzzy copy of the dress competing with it.
 */
const BACKDROP_BLUR = 40;

export function FullscreenGallery({
  images,
  visible,
  startIndex,
  onClose,
  onIndexChange,
}: {
  images: FeedImage[];
  visible: boolean;
  startIndex: number;
  onClose: () => void;
  /** Keeps the hero in step, so closing lands on the angle you were viewing. */
  onIndexChange?: (index: number) => void;
}) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const listRef = useRef<FlatList<FeedImage>>(null);

  // Re-sync every time it opens: the hero may have been swiped since.
  useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      setIndex(next);
      onIndexChange?.(next);
    }
  };

  const current = images[index] ?? images[0];
  if (!current) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        {/* The backdrop follows the CURRENT image, so swiping from a green
            front to a gold detail shot re-tints the whole screen with it. */}
        <Image
          key={current.imageUrl}
          source={{ uri: current.imageUrl }}
          // Scaled past the edges: a blur samples beyond the image boundary and
          // fades to transparent there, which shows as a grey rim around the
          // screen. Overscanning pushes that rim off-screen.
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          resizeMode="cover"
          blurRadius={BACKDROP_BLUR}
        />
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />

        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(img) => `${img.position}-${img.imageUrl}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(startIndex, Math.max(0, images.length - 1))}
          // Without this FlatList cannot jump to initialScrollIndex before it
          // has measured every page, and opens on the first photo regardless.
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={({ item }) => (
            <View style={{ width, height }}>
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width, height }}
                // `contain` is the whole point of this screen: the garment is
                // shown entire, at its own proportions, never cropped.
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          )}
        />

        <View style={[styles.topBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
          {images.length > 1 ? (
            <View style={styles.counter}>
              <Text variant="caption" style={styles.counterText}>
                {index + 1} / {images.length}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <Pressable
            onPress={onClose}
            style={styles.close}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('discover.closeViewer')}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        {images.length > 1 ? (
          <View style={[styles.dots, { bottom: insets.bottom + spacing.lg }]} pointerEvents="none">
            {images.map((img, i) => (
              <View
                key={`${img.position}-${img.imageUrl}`}
                style={[styles.dot, i === index ? styles.dotActive : null]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Fixed colours throughout, deliberately not theme tokens: this surface is
  // always a dark viewing room, in light mode as much as dark.
  root: { flex: 1, backgroundColor: '#000' },
  backdrop: { transform: [{ scale: 1.2 }] },
  // Dark enough to keep the photo the brightest thing on screen, light enough
  // that the bars still carry its colours. At 0.55 they read as flat grey —
  // measured on a cream agbada against a red-and-yellow doorway, where the
  // colour simply vanished.
  scrim: { backgroundColor: 'rgba(0,0,0,0.35)' },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  counterText: { color: '#fff', fontFamily: activeFontFamilies.bodySemibold },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 18, backgroundColor: '#fff' },
});
