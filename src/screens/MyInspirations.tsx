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

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 48) / 2; // 2 columns with 16px padding on sides and between

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
          <Text style={styles.modalTitle}>Add Tag</Text>
          <Text style={styles.modalSubtitle}>
            {selectedCount} image{selectedCount !== 1 ? 's' : ''} selected
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
                  +{selectedImages.length - 6} more
                </Text>
              )}
            </View>
          )}
          
          <TextInput
            style={styles.tagInput}
            placeholder="Enter tag for all images..."
            placeholderTextColor={colors.textSecondary}
            value={tag}
            onChangeText={setTag}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Add interface for selected image view
interface FullImageViewProps {
  imageUrl: string;
  visible: boolean;
  onClose: () => void;
}

// Full image view component
const FullImageView = ({ imageUrl, visible, onClose }: FullImageViewProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <SafeAreaView style={styles.fullImageContainer}>
        <TouchableOpacity 
          style={styles.closeFullImageButton} 
          onPress={onClose}
        >
          <Text style={styles.closeFullImageText}>×</Text>
        </TouchableOpacity>
        <Image
          source={{ uri: imageUrl }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      </SafeAreaView>
    </Modal>
  );
};

const MyInspirations = () => {
  const navigation = useNavigation();
  const { inspirations, addMultipleInspirations } = useApp();
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<CompressedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 });

  // Filter inspirations based on search query
  const filteredInspirations = useMemo(() => {
    if (!searchQuery.trim()) return inspirations;
    const query = searchQuery.toLowerCase().trim();
    return inspirations.filter(inspiration => 
      inspiration.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [inspirations, searchQuery]);

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
        alert('Failed to process images. Please try again.');
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
        // Prepare inspirations for batch upload using compressed images
        const inspirationsToUpload = selectedImages.map(img => ({
          imageUrl: img.compressedUri, // Use compressed version for storage
          tags: [tag],
          description: ''
        }));
        
        // Upload all inspirations in parallel batches
        await addMultipleInspirations(inspirationsToUpload, (current, total) => {
          setUploadProgress({ current, total });
        });
        
        setSelectedImages([]);
        setUploadProgress({ current: 0, total: 0 });
      } catch (error) {
        console.error('Error uploading inspirations:', error);
        alert('Failed to upload some inspirations. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedFullImage(imageUrl);
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={styles.inspirationTile}
        onPress={() => handleImagePress(item.imageUrl)}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.inspirationImage}
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
          title="My Inspirations" 
          onBack={() => navigation.goBack()} 
        />
        
        <View style={styles.contentContainer}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.pageTitle}>Inspiration Gallery</Text>
            <Text style={styles.pageSubtitle}>
              Upload multiple images at once and organize your creative inspirations
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icons name="search" size={20} color={colors.accent} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search inspirations by tag..."
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
            data={filteredInspirations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContainer}
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
                Compressing {compressionProgress.current}/{compressionProgress.total}
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

        <FullImageView
          imageUrl={selectedFullImage || ''}
          visible={!!selectedFullImage}
          onClose={() => setSelectedFullImage(null)}
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
    paddingHorizontal: Dimensions.get('window').width >= 768 ? spacing.pageTablet : spacing.page,
    flex: 1,
  },
  welcomeSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    padding: spacing.l,
    marginVertical: spacing.m,
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
  },
  
  inspirationTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
  },
  inspirationImage: {
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
    color: colors.text,
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
    color: colors.text,
    fontSize: 16,
    height: '100%',
    paddingHorizontal: spacing.xs,
  },
  clearButton: {
    padding: 4,
  },
  fullImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  closeFullImageButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  closeFullImageText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: 'bold',
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
});

export default MyInspirations; 