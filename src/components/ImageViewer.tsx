import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  SafeAreaView,
  PanResponder,
  Animated,
} from 'react-native';
import Icons from 'react-native-vector-icons/FontAwesome5';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMBNAIL_SIZE = 60;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;

interface ImageItem {
  id: string;
  imageUrl: string;
  tags?: string[];
}

interface ImageViewerProps {
  visible: boolean;
  images: ImageItem[];
  initialIndex: number;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  images,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const translateX = useRef(new Animated.Value(0)).current;
  const thumbnailListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      translateX.setValue(0);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    // Scroll thumbnail list to show current image
    if (thumbnailListRef.current && currentIndex >= 0 && currentIndex < images.length) {
      thumbnailListRef.current.scrollToIndex({
        index: currentIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [currentIndex, images.length]);

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    onPanResponderGrant: () => {
      translateX.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      translateX.setValue(gestureState.dx);
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx, vx } = gestureState;
      const shouldSwipe = Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.5;

      if (shouldSwipe) {
        if (dx > 0) {
          // Swipe right - go to previous
          goToPrevious();
        } else {
          // Swipe left - go to next
          goToNext();
        }
      }

      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  });

  const animatedStyle = {
    transform: [
      {
        translateX: translateX,
      },
    ],
    opacity: translateX.interpolate({
      inputRange: [-SCREEN_WIDTH * 0.5, 0, SCREEN_WIDTH * 0.5],
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    }),
  };

  const renderThumbnail = ({ item, index }: { item: ImageItem; index: number }) => {
    const isActive = index === currentIndex;
    
    return (
      <TouchableOpacity
        style={[
          styles.thumbnailContainer,
          isActive && styles.thumbnailActive,
        ]}
        onPress={() => goToImage(index)}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {isActive && <View style={styles.thumbnailActiveOverlay} />}
      </TouchableOpacity>
    );
  };

  const currentImage = images[currentIndex];

  if (!visible || !currentImage) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.imageCounter}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icons name="times" size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>

        {/* Main Image */}
        <View style={styles.imageContainer}>
          <Animated.View
            style={[styles.imageWrapper, animatedStyle]}
            {...panResponder.panHandlers}
          >
            <Image
              source={{ uri: currentImage.imageUrl }}
              style={styles.mainImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={goToPrevious}
            >
              <Icons name="chevron-left" size={24} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
          
          {currentIndex < images.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={goToNext}
            >
              <Icons name="chevron-right" size={24} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}

          {/* Thumbnail Carousel */}
          {images.length > 1 && (
            <View style={styles.thumbnailCarousel}>
              <FlatList
                ref={thumbnailListRef}
                data={images}
                renderItem={renderThumbnail}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailList}
                getItemLayout={(data, index) => ({
                  length: THUMBNAIL_SIZE + spacing.m,
                  offset: (THUMBNAIL_SIZE + spacing.m) * index,
                  index,
                })}
                initialScrollIndex={initialIndex}
                onScrollToIndexFailed={() => {}}
              />
            </View>
          )}

          {/* Tags */}
          {currentImage.tags && currentImage.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <FlatList
                data={currentImage.tags}
                renderItem={({ item }) => (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item}</Text>
                  </View>
                )}
                keyExtractor={(item, index) => `${item}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsList}
              />
            </View>
          )}
        </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    height: 60,
    paddingTop: 50
  },
  headerLeft: {
    flex: 1,
  },
  imageCounter: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: SCREEN_WIDTH - spacing.l * 2,
    height: '100%',
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -25 }],
  },
  navButtonLeft: {
    left: spacing.m,
  },
  navButtonRight: {
    right: spacing.m,
  },
  thumbnailCarousel: {
    paddingVertical: spacing.m,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbnailList: {
    paddingHorizontal: spacing.m,
  },
  thumbnailContainer: {
    marginRight: spacing.m,
    borderRadius: spacing.borderRadius.m,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  thumbnailActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  thumbnailActiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: spacing.borderRadius.m,
  },
  tagsContainer: {
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
  },
  tagsList: {
    paddingHorizontal: spacing.xs,
  },
  tag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.s,
    marginRight: spacing.xs,
  },
  tagText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ImageViewer; 