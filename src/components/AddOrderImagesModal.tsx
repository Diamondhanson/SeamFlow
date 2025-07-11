import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';
import { textVariants } from '../theme/textVariants';
import OrderImagePicker from './OrderImagePicker';
import { useClients } from '../context/clientContext';
import { useApp } from '../context/AppContext';

interface AddOrderImagesModalProps {
  visible: boolean;
  onClose: () => void;
  clientId: string;
  orderId: string;
  orderName: string;
}

// Helper function to upload images to storage using the orders folder
const uploadOrderImage = async (imageUri: string, user: any): Promise<string> => {
  try {
    // For React Native, we need to handle file uploads
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/orders/${Date.now()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { supabase } = await import('../../supabaseConfig');
    const { data, error } = await supabase.storage
      .from('seamflow-images')
      .upload(fileName, uint8Array, {
        contentType: `image/${fileExt}`,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return imageUri; // Return local URI as fallback
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('seamflow-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return imageUri; // Return local URI as fallback
  }
};

const AddOrderImagesModal: React.FC<AddOrderImagesModalProps> = ({
  visible,
  onClose,
  clientId,
  orderId,
  orderName,
}) => {
  const { updateOrderImages } = useClients();
  const { user } = useApp();
  const [orderImages, setOrderImages] = useState({
    image1Uri: undefined as string | undefined,
    image2Uri: undefined as string | undefined,
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async () => {
    if (!orderImages.image1Uri && !orderImages.image2Uri) {
      Alert.alert('No Images', 'Please add at least one image before saving.');
      return;
    }

    setIsUploading(true);
    try {
      let uploadedImage1: string | undefined;
      let uploadedImage2: string | undefined;

      // Upload images if they exist
      if (orderImages.image1Uri && user) {
        uploadedImage1 = await uploadOrderImage(orderImages.image1Uri, user);
      }
      if (orderImages.image2Uri && user) {
        uploadedImage2 = await uploadOrderImage(orderImages.image2Uri, user);
      }

      // Update the order with image URLs
      await updateOrderImages(clientId, orderId, uploadedImage1, uploadedImage2);

      // Reset and close
      setOrderImages({
        image1Uri: undefined,
        image2Uri: undefined,
      });
      onClose();

      Alert.alert('Success', 'Images added to order successfully!');
    } catch (error) {
      console.error('Error adding images to order:', error);
      Alert.alert('Error', 'Failed to add images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    
    setOrderImages({
      image1Uri: undefined,
      image2Uri: undefined,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Add Images</Text>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
              disabled={isUploading}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.orderName}>Order: {orderName}</Text>
          <Text style={styles.description}>
            Add up to 2 images to help visualize this order
          </Text>

          <OrderImagePicker
            image1Uri={orderImages.image1Uri}
            image2Uri={orderImages.image2Uri}
            onImagesChange={(image1Uri, image2Uri) => {
              setOrderImages({ image1Uri, image2Uri });
            }}
            disabled={isUploading}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isUploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                isUploading && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={isUploading || (!orderImages.image1Uri && !orderImages.image2Uri)}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.saveButtonText}>Save Images</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.l,
    padding: spacing.l,
    ...themeUtils.getElevation('l'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  headerText: {
    fontSize: textVariants.H3.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: 28,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  orderName: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: textVariants.body2.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.l,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.m,
    marginTop: spacing.l,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderRadius: spacing.borderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  saveButton: {
    backgroundColor: colors.primary,
    ...themeUtils.getElevation('s'),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: textVariants.body1.fontSize,
    fontWeight: '500',
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: textVariants.body1.fontSize,
    fontWeight: '600',
  },
});

export default AddOrderImagesModal; 