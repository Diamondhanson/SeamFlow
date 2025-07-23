import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

interface AddMeasurementAttributeModalProps {
  visible: boolean;
  onClose: () => void;
  onAttributeAdded?: (attributeName: string) => void;
}

const AddMeasurementAttributeModal: React.FC<AddMeasurementAttributeModalProps> = ({
  visible,
  onClose,
  onAttributeAdded,
}) => {
  const { measurementAttributes, updateMeasurementAttributes } = useApp();
  const { t } = useTranslation();
  const [attributeName, setAttributeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddAttribute = async () => {
    const trimmedName = attributeName.trim().toLowerCase();
    
    // Validation
    if (!trimmedName) {
      Alert.alert(t('common.error'), 'Please enter an attribute name');
      return;
    }

    // Check for duplicates
    if (measurementAttributes.some(attr => attr.toLowerCase() === trimmedName)) {
      Alert.alert(t('common.error'), 'This measurement attribute already exists');
      return;
    }

    // Validate name format (only letters, numbers, and spaces)
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
      Alert.alert(t('common.error'), 'Attribute name can only contain letters, numbers, and spaces');
      return;
    }

    setIsLoading(true);
    try {
      // Add the new attribute to the list
      const updatedAttributes = [...measurementAttributes, trimmedName];
      await updateMeasurementAttributes(updatedAttributes);
      
      console.log('✅ New measurement attribute added:', trimmedName);
      
      // Call the callback if provided
      onAttributeAdded?.(trimmedName);
      
      // Reset and close
      setAttributeName('');
      onClose();
      
      Alert.alert('Success', `"${trimmedName}" has been added to your measurement attributes!`);
    } catch (error: any) {
      console.error('❌ Error adding measurement attribute:', error);
      Alert.alert(
        'Error',
        `Failed to add attribute: ${error.message || 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setAttributeName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}>
                <MaterialIcons name="straighten" size={20} color={colors.textOnPrimary} />
              </View>
              <Text style={styles.headerTitle}>Add Measurement Attribute</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isLoading}
            >
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Add a new measurement attribute that will be available across all orders and clients.
            </Text>

            {/* Current Attributes Preview */}
            <View style={styles.currentAttributesSection}>
              <Text style={styles.sectionLabel}>Current Attributes ({measurementAttributes.length}):</Text>
              <View style={styles.attributesList}>
                {measurementAttributes.slice(0, 6).map((attr, index) => (
                  <View key={attr} style={styles.attributeChip}>
                    <Text style={styles.attributeChipText}>
                      {attr.charAt(0).toUpperCase() + attr.slice(1)}
                    </Text>
                  </View>
                ))}
                {measurementAttributes.length > 6 && (
                  <View style={styles.attributeChip}>
                    <Text style={styles.attributeChipText}>
                      +{measurementAttributes.length - 6} more
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>New Attribute Name</Text>
              <TextInput
                style={[styles.textInput, isLoading && styles.inputDisabled]}
                placeholder="e.g., neck, sleeve length, thigh..."
                value={attributeName}
                onChangeText={setAttributeName}
                placeholderTextColor={colors.textSecondary}
                editable={!isLoading}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleAddAttribute}
              />
            </View>

            {/* Preview */}
            {attributeName.trim() && (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <View style={[styles.attributeChip, styles.previewChip]}>
                  <Text style={styles.attributeChipText}>
                    {attributeName.trim().charAt(0).toUpperCase() + attributeName.trim().slice(1)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.addButton,
                (!attributeName.trim() || isLoading) && styles.addButtonDisabled
              ]}
              onPress={handleAddAttribute}
              disabled={!attributeName.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <>
                  <MaterialIcons name="add" size={20} color={colors.textOnPrimary} />
                  <Text style={styles.addButtonText}>Add Attribute</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    ...themeUtils.getElevation('l'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    ...themeUtils.getElevation('xs'),
  },
  headerTitle: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: spacing.borderRadius.round,
  },
  content: {
    padding: spacing.l,
  },
  description: {
    fontSize: textVariants.body2.fontSize,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.l,
  },
  currentAttributesSection: {
    marginBottom: spacing.l,
  },
  sectionLabel: {
    fontSize: textVariants.body2.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: 0.1,
  },
  attributesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  attributeChip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  previewChip: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  attributeChipText: {
    fontSize: textVariants.caption.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: spacing.m,
  },
  inputLabel: {
    fontSize: textVariants.body2.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: 0.1,
  },
  textInput: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    padding: spacing.m,
    fontSize: textVariants.body1.fontSize,
    color: colors.text,
    minHeight: 48,
    ...themeUtils.getElevation('xs'),
  },
  inputDisabled: {
    opacity: 0.6,
  },
  previewSection: {
    marginBottom: spacing.m,
  },
  previewLabel: {
    fontSize: textVariants.body2.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.l,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.m,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: textVariants.body1.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  addButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    ...themeUtils.getElevation('s'),
  },
  addButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: textVariants.body1.fontSize,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
});

export default AddMeasurementAttributeModal; 