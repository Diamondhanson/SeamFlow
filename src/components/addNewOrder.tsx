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
import { themeUtils } from '../theme';
import DatePicker from './DatePicker';
import OrderImagePicker from './OrderImagePicker';
import { useClients } from '../context/clientContext';
import { useTranslation } from '../hooks/useTranslation';

interface AddNewOrderProps {
  visible: boolean;
  onClose: () => void;
  clientId: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768; // Common tablet breakpoint

const AddNewOrder = ({ visible, onClose, clientId }: AddNewOrderProps) => {
  const { addOrderToClient } = useClients();
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    orderName: '',
    deliveryDate: new Date(Date.now() + 12096e5), // Default to 2 weeks from now
    notes: '',
    price: '',
    advancePayment: ''
  });

  const [orderImages, setOrderImages] = useState({
    image1Uri: undefined as string | undefined,
    image2Uri: undefined as string | undefined,
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

  const handleSubmit = () => {
    if (formData.orderName.trim()) {
      addOrderToClient(clientId, {
        orderName: formData.orderName.trim(),
        dateDelivery: formData.deliveryDate.toISOString().split('T')[0],
        dateOrdered: new Date().toISOString().split('T')[0],
        notes: formData.notes.trim(),
        price: parseFloat(formData.price) || 0,
        advancePayment: parseFloat(formData.advancePayment) || 0,
        image1Url: orderImages.image1Uri,
        image2Url: orderImages.image2Uri,
      });
      
      // Reset form and close modal
      setFormData({
        orderName: '',
        deliveryDate: new Date(Date.now() + 12096e5),
        notes: '',
        price: '',
        advancePayment: ''
      });
      setOrderImages({
        image1Uri: undefined,
        image2Uri: undefined,
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
                  <Text style={styles.headerText}>{t('addNewOrder.title')}</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder={t('addNewOrder.orderNamePlaceholder')}
                  placeholderTextColor={colors.subText}
                  value={formData.orderName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, orderName: text }))}
                />

                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {t('addNewOrder.deliveryDate')} {formData.deliveryDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <DatePicker
                  visible={showDatePicker}
                  selectedDate={formData.deliveryDate}
                  onClose={() => setShowDatePicker(false)}
                  onDateChange={(date) => {
                    setFormData(prev => ({ ...prev, deliveryDate: date }));
                  }}
                  mode="date"
                />

                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder={t('addNewOrder.orderNotesPlaceholder')}
                  placeholderTextColor={colors.subText}
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  multiline
                />

                <OrderImagePicker
                  image1Uri={orderImages.image1Uri}
                  image2Uri={orderImages.image2Uri}
                  onImagesChange={(image1Uri, image2Uri) => {
                    setOrderImages({ image1Uri, image2Uri });
                  }}
                />

                <Text style={styles.sectionTitle}>{t('addNewOrder.paymentDetails')}</Text>
                <View style={styles.paymentContainer}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>{t('addNewOrder.totalPrice')}</Text>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      placeholder={t('addNewOrder.totalPricePlaceholder')}
                      placeholderTextColor={colors.subText}
                      value={formData.price}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>{t('addNewOrder.advanceReceived')}</Text>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      placeholder={t('addNewOrder.advancePlaceholder')}
                      placeholderTextColor={colors.subText}
                      value={formData.advancePayment}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, advancePayment: text }))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.submitButton,
                    !formData.orderName.trim() && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!formData.orderName.trim()}
                >
                  <Text style={styles.submitButtonText}>{t('addNewOrder.addOrder')}</Text>
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
    width: '100%',
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: isTablet ? 16 : 12,
    borderRadius: 8,
    marginBottom: isTablet ? 16 : 12,
    color: colors.mainText,
    fontSize: isTablet ? 18 : 16,
    ...themeUtils.getElevation('xs'),
  },
  dateInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: isTablet ? 16 : 12,
    borderRadius: 8,
    marginBottom: isTablet ? 16 : 12,
    ...themeUtils.getElevation('xs'),
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
    color: colors.textOnPrimary,
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
  },
  paymentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: isTablet ? textVariants.H5.fontSize : textVariants.H6.fontSize,
    color: colors.mainText,
    marginTop: 16,
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    color: colors.subText,
    fontSize: textVariants.body2.fontSize,
    marginBottom: 4,
  },
});

export default AddNewOrder;
