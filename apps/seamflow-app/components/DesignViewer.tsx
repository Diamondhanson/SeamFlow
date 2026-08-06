// ============================================================================
// <DesignViewer> — fullscreen swipeable preview for the design gallery.
//
// Tap a tile → this modal opens on that image over a black backdrop. Swipe
// left/right to move through the whole gallery (horizontal paging), swipe
// DOWN (or tap ✕) to drop back to the grid — the image follows the finger and
// the backdrop fades, photos-app style. A pencil button jumps to the design's
// detail screen (caption/tags/describe), since tap-to-preview replaced the
// old tap-to-open-details.
//
// Plain RN gestures only (PanResponder + Animated): the horizontal FlatList
// claims sideways drags, the parent claims vertical-dominant ones — no extra
// gesture dependencies, identical behavior on iOS and Android.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Design } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';
import { isWeb } from '../lib/platform-capabilities';

const CLOSE_DRAG = 110; // px of downward drag that commits the dismiss
const CLOSE_VELOCITY = 0.7;

export function DesignViewer({
  items,
  initialIndex,
  onClose,
  onOpenDetails,
}: {
  items: Design[];
  /** Index into `items` the viewer opens on; null = closed. */
  initialIndex: number | null;
  onClose: () => void;
  /** Navigate to the design's detail/edit screen. */
  onOpenDetails: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const visible = initialIndex !== null;

  useEffect(() => {
    if (initialIndex !== null) setIndex(initialIndex);
  }, [initialIndex]);

  // Web: swiping is a touch idiom — with a mouse you expect arrow keys and
  // Esc. Wire them up so the viewer is usable on a desktop browser.
  useEffect(() => {
    if (!isWeb || initialIndex === null) return;
    const onKey = (ev: Event) => {
      const e = ev as Event & { key: string };
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(Math.min(index + 1, items.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(Math.max(index - 1, 0));
      }
    };
    globalThis.addEventListener?.('keydown', onKey);
    return () => globalThis.removeEventListener?.('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex, index, items.length]);

  const listRef = useRef<FlatList<Design>>(null);
  const goTo = (i: number) => {
    setIndex(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  // Swipe-down-to-dismiss: image translates with the finger, backdrop fades.
  const dragY = useRef(new Animated.Value(0)).current;
  const pan = useRef(
    PanResponder.create({
      // Claim only clearly-vertical drags; sideways stays with the pager.
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dy) > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > CLOSE_DRAG || g.vy > CLOSE_VELOCITY) {
          dragY.setValue(0);
          onClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const backdropOpacity = dragY.interpolate({
    inputRange: [0, height / 2],
    outputRange: [1, 0.35],
    extrapolate: 'clamp',
  });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      <Animated.View
        style={[styles.content, { transform: [{ translateY: dragY }] }]}
        {...pan.panHandlers}
      >
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(d) => d.id}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex ?? 0}
          getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const url = item.signedUrl ?? item.thumbnailUrl;
            return (
              <View style={{ width, height: '100%' }}>
                {url ? (
                  <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
                ) : null}
                {item.caption ? (
                  <View style={[styles.captionWrap, { paddingBottom: insets.bottom + spacing.lg }]}>
                    <Text variant="bodySm" style={styles.caption} numberOfLines={2}>
                      {item.caption}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      </Animated.View>

      {/* Chrome sits above the pager and outside the drag translation. */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('designs.viewerClose')}
          style={styles.chromeBtn}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text variant="caption" style={styles.counter} numeric>
          {t('designs.viewerCounter', { current: index + 1, total: items.length })}
        </Text>
        <Pressable
          onPress={() => {
            const id = items[index]?.id;
            if (id) onOpenDetails(id);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('designs.viewerOpenDetails')}
          style={styles.chromeBtn}
        >
          <Ionicons name="create-outline" size={22} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  content: { flex: 1 },
  image: { width: '100%', height: '100%' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  chromeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: { color: '#fff', opacity: 0.85 },
  captionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingTop: spacing.sm,
  },
  caption: { color: '#fff' },
});
