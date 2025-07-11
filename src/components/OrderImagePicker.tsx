import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Icons from 'react-native-vector-icons/FontAwesome5';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';
import { textVariants } from '../theme/textVariants';

interface OrderImagePickerProps {
  image1Uri?: string;
  image2Uri?: string;
  onImagesChange: (image1Uri?: string, image2Uri?: string) => void;
  disabled?: boolean;
}

// Image compression utility
const compressImage = async (imageUri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 800 } }, // Resize to max 800px width
      ],
      {
        compress: 0.8, // 80% quality
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    return imageUri; // Return original if compression fails
  }
};

const OrderImagePicker: React.FC<OrderImagePickerProps> = ({
  image1Uri,
  image2Uri,
  onImagesChange,
  disabled = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const pickImage = async (slot: 1 | 2) => {
    if (disabled) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setIsProcessing(true);
      try {
        const compressedUri = await compressImage(result.assets[0].uri);
        
        if (slot === 1) {
          onImagesChange(compressedUri, image2Uri);
        } else {
          onImagesChange(image1Uri, compressedUri);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        Alert.alert('Error', 'Failed to process image. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const removeImage = (slot: 1 | 2) => {
    if (disabled) return;

    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (slot === 1) {
              onImagesChange(undefined, image2Uri);
            } else {
              onImagesChange(image1Uri, undefined);
            }
          },
        },
      ]
    );
  };

  const renderImageSlot = (slot: 1 | 2, imageUri?: string) => {
    const isEmpty = !imageUri;

    return (
      <TouchableOpacity
        style={[
          styles.imageSlot,
          isEmpty && styles.emptyImageSlot,
          disabled && styles.disabledImageSlot,
        ]}
        onPress={() => isEmpty ? pickImage(slot) : undefined}
        disabled={disabled || isProcessing}
        activeOpacity={0.7}
      >
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.addImageContainer}>
            <Icons name="camera" size={24} color={colors.textSecondary} />
            <Text style={styles.addImageText}>Add Image {slot}</Text>
          </View>
        ) : (
          <>
            <Image source={{ uri: imageUri }} style={styles.orderImage} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(slot)}
              disabled={disabled}
            >
              <Icons name="times" size={12} color={colors.textOnPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => pickImage(slot)}
              disabled={disabled}
            >
              <Icons name="edit" size={12} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Order Images (Optional)</Text>
      <Text style={styles.sectionSubtitle}>
        Add up to 2 images to help visualize this order
      </Text>
      
      <View style={styles.imagesRow}>
        {renderImageSlot(1, image1Uri)}
        {renderImageSlot(2, image2Uri)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.m,
  },
  sectionTitle: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: textVariants.body2.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.m,
    lineHeight: 18,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  imageSlot: {
    flex: 1,
    aspectRatio: 4/3,
    borderRadius: spacing.borderRadius.m,
    overflow: 'hidden',
    position: 'relative',
    ...themeUtils.getElevation('xs'),
  },
  emptyImageSlot: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledImageSlot: {
    opacity: 0.5,
  },
  addImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  addImageText: {
    fontSize: textVariants.body2.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  orderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...themeUtils.getElevation('s'),
  },
  changeButton: {
    position: 'absolute',
    top: 8,
    right: 40,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...themeUtils.getElevation('s'),
  },
  processingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  processingText: {
    fontSize: textVariants.body2.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default OrderImagePicker; 