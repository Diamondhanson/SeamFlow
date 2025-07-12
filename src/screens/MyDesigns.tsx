import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  SafeAreaView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { colors } from '../theme/colors';
import { useNavigation } from "@react-navigation/native";
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';
import { defaultStyles, themeUtils } from '../theme';
import Icons from "react-native-vector-icons/FontAwesome5";
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useApp } from '../context/AppContext';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Header from '../components/Header';
import { useTranslation } from '../hooks/useTranslation';
import ImageViewer from '../components/ImageViewer';

const { width } = Dimensions.get('window');

// Responsive grid system for different screen sizes
const getGridConfig = () => {
  const screenWidth = width;
  
  if (screenWidth < 768) {
    // Mobile: 2 columns
    const columns = 2;
    const padding = 16;
    const gap = 16;
    const tileSize = (screenWidth - (padding * 2) - gap) / columns;
    return { columns, tileSize, padding };
  } else if (screenWidth < 1024) {
    // Small tablet: 3 columns
    const columns = 3;
    const padding = 24;
    const gap = 16;
    const tileSize = (screenWidth - (padding * 2) - (gap * (columns - 1))) / columns;
    return { columns, tileSize, padding };
  } else {
    // Large tablet: 4 columns
    const columns = 4;
    const padding = 32;
    const gap = 20;
    const tileSize = (screenWidth - (padding * 2) - (gap * (columns - 1))) / columns;
    return { columns, tileSize, padding };
  }
};

const { columns: GRID_COLUMNS, tileSize: TILE_SIZE, padding: GRID_PADDING } = getGridConfig();

// Image compression utility
const compressImage = async (imageUri: string): Promise<{ compressed: string; thumbnail: string }> => {
  try {
    // Create compressed version (max 1200px, 85% quality)
    const compressedResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 1200 } }, // Resize to max 1200px width (maintains aspect ratio)
      ],
      {
        compress: 0.85, // 85% quality
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Create thumbnail (300px, 80% quality)
    const thumbnailResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 300 } }, // Small thumbnail
      ],
      {
        compress: 0.8, // 80% quality
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      compressed: compressedResult.uri,
      thumbnail: thumbnailResult.uri,
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original if compression fails
    return {
      compressed: imageUri,
      thumbnail: imageUri,
    };
  }
};

interface CompressedImage {
  originalUri: string;
  compressedUri: string;
  thumbnailUri: string;
}

interface TagModalProps {
  visible: boolean;
  selectedCount: number;
  selectedImages: CompressedImage[];
  onClose: () => void;
  onSave: (tag: string) => void;
}

const TagModal = ({ visible, selectedCount, selectedImages, onClose, onSave }: TagModalProps) => {
  const { t } = useTranslation();
  const [tag, setTag] = useState('');

  const handleSave = () => {
    if (tag.trim()) {
      onSave(tag.trim());
      setTag('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('myDesigns.addTag')}</Text>
          <Text style={styles.modalSubtitle}>
            {t('myDesigns.imagesSelected', { count: selectedCount })}
          </Text>
          
          {/* Image Preview */}
          {selectedImages.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              <FlatList
                data={selectedImages.slice(0, 6)} // Show max 6 previews
                horizontal
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item.thumbnailUri }}
                    style={styles.imagePreview}
                  />
                )}
                keyExtractor={(item, index) => index.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagePreviewList}
              />
              {selectedImages.length > 6 && (
                <Text style={styles.moreImagesText}>
                  {t('myDesigns.moreImages', { count: selectedImages.length - 6 })}
                </Text>
              )}
            </View>
          )}
          
          <TextInput
            style={styles.tagInput}
            placeholder={t('myDesigns.enterTag')}
            placeholderTextColor={colors.textSecondary}
            value={tag}
            onChangeText={setTag}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};



const MyDesigns = () => {
  const navigation = useNavigation();
  const { designs, addMultipleDesigns } = useApp();
  const { t } = useTranslation();
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<CompressedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 });

  // Filter designs based on search query
  const filteredDesigns = useMemo(() => {
    if (!searchQuery.trim()) return designs;
    const query = searchQuery.toLowerCase().trim();
    return designs.filter(design => 
      design.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [designs, searchQuery]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: true, // Enable multiple selection
    });

    if (!result.canceled && result.assets.length > 0) {
      setIsCompressing(true);
      setCompressionProgress({ current: 0, total: result.assets.length });
      
      try {
        const compressedImages: CompressedImage[] = [];
        
        // Process images in parallel batches of 2
        const BATCH_SIZE = 2;
        for (let i = 0; i < result.assets.length; i += BATCH_SIZE) {
          const batch = result.assets.slice(i, i + BATCH_SIZE);
          
          const batchPromises = batch.map(async (asset, batchIndex) => {
            const actualIndex = i + batchIndex;
            const compressed = await compressImage(asset.uri);
            
            setCompressionProgress({ current: actualIndex + 1, total: result.assets.length });
            
            return {
              originalUri: asset.uri,
              compressedUri: compressed.compressed,
              thumbnailUri: compressed.thumbnail,
            };
          });
          
          const batchResults = await Promise.allSettled(batchPromises);
          batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
              compressedImages.push(result.value);
            }
          });
        }
        
        setSelectedImages(compressedImages);
        setTagModalVisible(true);
        
      } catch (error) {
        console.error('Error compressing images:', error);
        alert(t('myDesigns.imageProcessFailed'));
      } finally {
        setIsCompressing(false);
        setCompressionProgress({ current: 0, total: 0 });
      }
    }
  };

  const handleAddTag = async (tag: string) => {
    if (selectedImages.length > 0) {
      setIsUploading(true);
      setTagModalVisible(false);
      setUploadProgress({ current: 0, total: selectedImages.length });
      
      try {
        // Prepare designs for batch upload using compressed images
        const designsToUpload = selectedImages.map(img => ({
          imageUrl: img.compressedUri, // Use compressed version for storage
          tags: [tag],
          description: ''
        }));
        
        // Upload all designs in parallel batches
        await addMultipleDesigns(designsToUpload, (current, total) => {
          setUploadProgress({ current, total });
        });
        
        setSelectedImages([]);
        setUploadProgress({ current: 0, total: 0 });
      } catch (error) {
        console.error('Error uploading designs:', error);
        alert(t('myDesigns.uploadFailed'));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleImagePress = (imageUrl: string) => {
    const index = filteredDesigns.findIndex(design => design.imageUrl === imageUrl);
    if (index !== -1) {
      setSelectedImageIndex(index);
      setImageViewerVisible(true);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={styles.designTile}
        onPress={() => handleImagePress(item.imageUrl)}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.designImage}
          resizeMode="cover"
        />
        {/* <View style={styles.tagContainer}>
          {item.tags.map((tag: string, idx: number) => (
            <Text key={idx} style={styles.tag}>{tag}</Text>
          ))}
        </View> */}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <Header 
          title={t('navigation.myDesigns')} 
          onBack={() => navigation.goBack()} 
        />
        
        <View style={styles.contentContainer}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.pageTitle}>{t('myDesigns.title')}</Text>
            <Text style={styles.pageSubtitle}>
              {t('myDesigns.subtitle')}
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icons name="search" size={20} color={colors.accent} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('myDesigns.searchDesigns')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Icons name="times-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredDesigns}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={GRID_COLUMNS}
            columnWrapperStyle={GRID_COLUMNS > 1 ? styles.columnWrapper : undefined}
            contentContainerStyle={styles.gridContainer}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Icons name="palette" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateTitle}>{t('myDesigns.noDesigns')}</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {t('myDesigns.addFirstDesign')}
                </Text>
              </View>
            )}
          />
        </View>
        
        {/* Floating Action Button */}
        <TouchableOpacity 
          style={[styles.fab, (isUploading || isCompressing) && styles.fabDisabled]} 
          onPress={pickImage}
          disabled={isUploading || isCompressing}
        >
          {isCompressing ? (
            <View style={styles.uploadProgress}>
              <ActivityIndicator size={20} color={colors.textOnPrimary} />
              <Text style={styles.uploadProgressText}>
                {t('myDesigns.compressing', { current: compressionProgress.current, total: compressionProgress.total })}
              </Text>
            </View>
          ) : isUploading ? (
            <View style={styles.uploadProgress}>
              <ActivityIndicator size={20} color={colors.textOnPrimary} />
              <Text style={styles.uploadProgressText}>
                {uploadProgress.current}/{uploadProgress.total}
              </Text>
            </View>
          ) : (
            <Icons name="plus" size={24} color={colors.textOnPrimary} />
          )}
        </TouchableOpacity>

        <TagModal
          visible={tagModalVisible}
          selectedCount={selectedImages.length}
          selectedImages={selectedImages}
          onClose={() => {
            if (!isUploading) {
              setTagModalVisible(false);
              setSelectedImages([]);
            }
          }}
          onSave={handleAddTag}
        />

        <ImageViewer
          visible={imageViewerVisible}
          images={filteredDesigns}
          initialIndex={selectedImageIndex}
          onClose={() => setImageViewerVisible(false)}
        />
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: GRID_PADDING,
    flex: 1,
  },
  welcomeSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    padding: spacing.l,
    marginVertical: spacing.xs,
    ...themeUtils.getElevation('xs'),
  },
  pageTitle: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: textVariants.body3.fontSize,
    color: colors.textSecondary,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  gridContainer: {
    paddingBottom: spacing.huge,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: spacing.m,
    paddingHorizontal: GRID_COLUMNS > 2 ? spacing.xs : 0,
  },
  
  designTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
  },
  designImage: {
    width: '100%',
    height: '100%',
  },
  tagContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    color: colors.textOnPrimary,
    fontSize: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: colors.mainText,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  tagInput: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.m,
    padding: spacing.m,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#ffffff15',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.m,
    marginBottom: 8,
    height: 48,
    marginTop: 8,
    paddingHorizontal: spacing.m,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.mainText,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 64,
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...themeUtils.getElevation('m'),
  },
  fabDisabled: {
    opacity: 0.6,
  },
  uploadProgress: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadProgressText: {
    color: colors.textOnPrimary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  imagePreviewContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  imagePreviewList: {
    paddingHorizontal: 8,
  },
  imagePreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  moreImagesText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: textVariants.H5.fontSize,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.s,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: textVariants.body2.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default MyDesigns; 