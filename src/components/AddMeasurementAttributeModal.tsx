import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';
import { defaultStyles, themeUtils } from '../theme';
import Icons from "react-native-vector-icons/MaterialIcons";
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

interface AddMeasurementAttributeModalProps {
  visible: boolean;
  onClose: () => void;
  onAttributeAdded: (attributeName: string, initialValue: number) => void;
}

const AddMeasurementAttributeModal = ({
  visible,
  onClose,
  onAttributeAdded,
}: AddMeasurementAttributeModalProps) => {
  const { measurementAttributes, updateMeasurementAttributes } = useApp();
  const { t } = useTranslation();
  const [attributeName, setAttributeName] = useState('');
  const [initialValue, setInitialValue] = useState('');

  const handleAddAttribute = async () => {
    if (!attributeName.trim()) {
      Alert.alert(t('common.error'), t('addMeasurementAttribute.enterAttributeName'));
      return;
    }

    // Check for duplicates (case-insensitive)
    const normalizedNewAttr = attributeName.trim().toLowerCase();
    if (measurementAttributes.some(attr => attr.toLowerCase() === normalizedNewAttr)) {
      Alert.alert(t('common.error'), t('addMeasurementAttribute.attributeExists'));
      return;
    }

    try {
      // Add the new attribute to the global list
      const newAttributes = [...measurementAttributes, attributeName.trim()];
      await updateMeasurementAttributes(newAttributes);

      // Call the callback with the new attribute and initial value
      const value = parseFloat(initialValue) || 0;
      onAttributeAdded(attributeName.trim(), value);

      // Reset form and close modal
      setAttributeName('');
      setInitialValue('');
      onClose();
    } catch (error) {
      console.error('Error adding measurement attribute:', error);
      Alert.alert(t('common.error'), t('addMeasurementAttribute.saveError'));
    }
  };

  const handleCancel = () => {
    setAttributeName('');
    setInitialValue('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}>
              <Icons name="add" size={24} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.modalTitle}>{t('addMeasurementAttribute.title')}</Text>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.description}>
              {t('addMeasurementAttribute.description')}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('addMeasurementAttribute.attributeName')}</Text>
              <TextInput
                style={styles.input}
                value={attributeName}
                onChangeText={setAttributeName}
                placeholder={t('addMeasurementAttribute.attributeNamePlaceholder')}
                placeholderTextColor={colors.subText}
                autoFocus
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('addMeasurementAttribute.initialValue')}</Text>
              <TextInput
                style={styles.input}
                value={initialValue}
                onChangeText={setInitialValue}
                placeholder={t('addMeasurementAttribute.initialValuePlaceholder')}
                placeholderTextColor={colors.subText}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={handleAddAttribute}
            >
              <Text style={styles.addButtonText}>{t('addMeasurementAttribute.add')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    width: '100%',
    maxWidth: 400,
    ...themeUtils.getElevation('l'),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  modalTitle: {
    fontSize: textVariants.H5.fontSize,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  modalContent: {
    padding: spacing.l,
  },
  description: {
    fontSize: textVariants.body2.fontSize,
    color: colors.subText,
    marginBottom: spacing.l,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: spacing.m,
  },
  inputLabel: {
    fontSize: textVariants.body2.fontSize,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    padding: spacing.input,
    color: colors.text,
    fontSize: textVariants.body2.fontSize,
    minHeight: 48,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.l,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.m,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.m,
    borderRadius: spacing.borderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: textVariants.body1.fontSize,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: colors.textOnPrimary,
    fontSize: textVariants.body1.fontSize,
    fontWeight: '600',
  },
});

export default AddMeasurementAttributeModal; 