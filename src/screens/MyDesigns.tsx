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
import { useApp } from '../context/AppContext';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Header from '../components/Header';

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 48) / 2; // 2 columns with 16px padding on sides and between

interface TagModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (tag: string) => void;
}

const TagModal = ({ visible, onClose, onSave }: TagModalProps) => {
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
          <TextInput
            style={styles.tagInput}
            placeholder="Enter tag..."
            placeholderTextColor={colors.subText}
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
              <Text style={styles.buttonText}>Save</Text>
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

const MyDesigns = () => {
  const navigation = useNavigation();
  const { designs, addDesign } = useApp();
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      allowsEditing: false, // Changed to false to prevent cropping
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
      setTagModalVisible(true);
    }
  };

  const handleAddTag = async (tag: string) => {
    if (selectedImage) {
      setIsUploading(true);
      setTagModalVisible(false);
      
      try {
        await addDesign({
          imageUrl: selectedImage,
          tags: [tag],
          description: ''
        });
        setSelectedImage(null);
      } catch (error) {
        console.error('Error uploading design:', error);
        alert('Failed to upload design. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedFullImage(imageUrl);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (index === 0) {
      return (
        <TouchableOpacity 
          style={[styles.uploadTile, isUploading && styles.disabledTile]} 
          onPress={pickImage}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size={40} color={colors.mainText} />
              <Text style={styles.uploadText}>Uploading...</Text>
            </>
          ) : (
            <>
              <Icons name="plus" size={40} color={colors.mainText} />
              <Text style={styles.uploadText}>Upload Design</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }

    const design = item;
    return (
      <TouchableOpacity 
        style={styles.designTile}
        onPress={() => handleImagePress(design.imageUrl)}
      >
        <Image 
          source={{ uri: design.imageUrl }} 
          style={styles.designImage}
          resizeMode="cover"
        />
        <View style={styles.tagContainer}>
          {design.tags.map((tag: string, idx: number) => (
            <Text key={idx} style={styles.tag}>{tag}</Text>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <Header 
          title="My Designs" 
          onBack={() => navigation.goBack()} 
        />
        
        <View style={styles.contentContainer}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.pageTitle}>Design Gallery</Text>
            <Text style={styles.pageSubtitle}>
              Upload and organize your design inspirations
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icons name="search" size={20} color={colors.accent} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search designs by tag..."
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
            data={[{ id: 'upload' }, ...filteredDesigns]}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContainer}
          />
        </View>
        

        <TagModal
          visible={tagModalVisible}
          onClose={() => {
            if (!isUploading) {
              setTagModalVisible(false);
              setSelectedImage(null);
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
    fontSize: textVariants.H3.fontSize,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: textVariants.body1.fontSize,
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

  uploadTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  uploadText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: 'bold',
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
    color: colors.mainText,
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
    marginBottom: 16,
    fontWeight: 'bold',
  },
  tagInput: {
    backgroundColor: '#ffffff15',
    borderRadius: 8,
    padding: 12,
    color: colors.mainText,
    marginBottom: 16,
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
    color: colors.mainText,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    borderRadius: 8,
    marginBottom: 16,
    height: 48,
    marginTop: 16,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    paddingLeft: "2.5%",
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
    color: colors.mainText,
    fontSize: 40,
    fontWeight: 'bold',
  },
  disabledTile: {
    opacity: 0.6,
  },
});

export default MyDesigns; 