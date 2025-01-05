import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useClients } from '../context/clientContext';

interface AddNewOrderProps {
  visible: boolean;
  onClose: () => void;
  clientId: string;
}

const AddNewOrder = ({ visible, onClose, clientId }: AddNewOrderProps) => {
  const { addOrderToClient } = useClients();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    orderName: '',
    deliveryDate: new Date(Date.now() + 12096e5), // Default to 2 weeks from now
    notes: ''
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, deliveryDate: selectedDate }));
    }
  };

  const handleSubmit = () => {
    if (formData.orderName.trim()) {
      addOrderToClient(clientId, {
        orderName: formData.orderName.trim(),
        dateDelivery: formData.deliveryDate.toISOString().split('T')[0],
        dateOrdered: new Date().toISOString().split('T')[0],
        notes: formData.notes.trim()
      });
      
      // Reset form and close modal
      setFormData({
        orderName: '',
        deliveryDate: new Date(Date.now() + 12096e5),
        notes: ''
      });
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
              <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.header}>
                  <Text style={styles.headerText}>New Order</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Order Name"
                  placeholderTextColor={colors.subText}
                  value={formData.orderName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, orderName: text }))}
                />

                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    Delivery Date: {formData.deliveryDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={formData.deliveryDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}

                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Order Notes"
                  placeholderTextColor={colors.subText}
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  multiline
                />

                <TouchableOpacity 
                  style={[
                    styles.submitButton,
                    !formData.orderName.trim() && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!formData.orderName.trim()}
                >
                  <Text style={styles.submitButtonText}>Add Order</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%', // Limit height to ensure it's not too tall
    backgroundColor: colors.background,
    borderRadius: 20,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: textVariants.H2.fontSize,
    fontWeight: 'bold',
    color: colors.mainText,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 30,
    color: colors.mainText,
  },
  input: {
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    color: colors.mainText,
    fontSize: 16,
  },
  dateInput: {
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateText: {
    color: colors.mainText,
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddNewOrder;
