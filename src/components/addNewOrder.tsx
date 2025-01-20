import React, { useState, useEffect } from 'react';
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
  Keyboard,
  Dimensions,
  ScaledSize
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768; // Common tablet breakpoint

const AddNewOrder = ({ visible, onClose, clientId }: AddNewOrderProps) => {
  const { addOrderToClient } = useClients();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    orderName: '',
    deliveryDate: new Date(Date.now() + 12096e5), // Default to 2 weeks from now
    notes: ''
  });

  const [dimensions, setDimensions] = useState({ 
    window: Dimensions.get('window') 
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }) => {
        setDimensions({ window });
      }
    );
    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions.window;
  const isLandscape = width > height;
  const isTabletLayout = width >= 768;

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
            <View style={[
              styles.modalContent,
              isTabletLayout && styles.tabletModalContent,
              isTabletLayout && isLandscape && styles.tabletLandscapeModalContent
            ]}>
              <ScrollView 
                contentContainerStyle={[
                  styles.scrollContent,
                  isTabletLayout && styles.tabletScrollContent
                ]}
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
    paddingHorizontal: isTablet ? 40 : 16,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isTablet ? 40 : 20,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tabletModalContent: {
    width: isTablet ? Math.min(600, SCREEN_WIDTH * 0.7) : '90%',
    maxHeight: '90%',
    borderRadius: 24,
  },
  tabletLandscapeModalContent: {
    flexDirection: 'row',
    width: Math.min(800, SCREEN_WIDTH * 0.8),
  },
  scrollContent: {
    padding: 20,
  },
  tabletScrollContent: {
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: isTablet ? textVariants.H1.fontSize : textVariants.H2.fontSize,
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
    padding: isTablet ? 16 : 12,
    borderRadius: 8,
    marginBottom: isTablet ? 16 : 12,
    color: colors.mainText,
    fontSize: isTablet ? 18 : 16,
  },
  dateInput: {
    backgroundColor: '#ffffff15',
    padding: isTablet ? 16 : 12,
    borderRadius: 8,
    marginBottom: isTablet ? 16 : 12,
  },
  dateText: {
    color: colors.mainText,
    fontSize: isTablet ? 18 : 16,
  },
  notesInput: {
    height: isTablet ? 150 : 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: isTablet ? 20 : 16,
    borderRadius: isTablet ? 12 : 8,
    alignItems: 'center',
    marginTop: isTablet ? 24 : 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.mainText,
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
  },
});

export default AddNewOrder;
