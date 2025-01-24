import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity 
} from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';

interface EditMeasurementValueProps {
  visible: boolean;
  onClose: () => void;
  attributeName: string;
  currentValue: number;
  onSave: (newValue: number) => void;
}

const EditMeasurementValue = ({ 
  visible, 
  onClose, 
  attributeName, 
  currentValue,
  onSave 
}: EditMeasurementValueProps) => {
  const [value, setValue] = useState(() => {
    if (currentValue === undefined || currentValue === null) {
      return '0';
    }
    return currentValue.toString();
  });

  const handleSave = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onSave(numValue);
      onClose();
    }
  };

  const handleChange = (text: string) => {
    if (/^\d*\.?\d*$/.test(text) || text === '') {
      setValue(text);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Edit {attributeName}</Text>
          
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={handleChange}
            keyboardType="numeric"
            autoFocus={true}
            selectTextOnFocus={true}
            placeholder="Enter measurement"
            placeholderTextColor={colors.subText}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={value === '' || isNaN(parseFloat(value))}
            >
              <Text style={[
                styles.buttonText,
                (value === '' || isNaN(parseFloat(value))) && styles.buttonTextDisabled
              ]}>
                Save
              </Text>
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
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  title: {
    fontSize: textVariants.H6.fontSize,
    color: colors.mainText,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#ffffff15',
    borderRadius: 8,
    padding: 12,
    color: colors.mainText,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
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
    fontWeight: '600',
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
});

export default EditMeasurementValue;
