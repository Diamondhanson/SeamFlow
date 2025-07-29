import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, TouchableOpacity, Platform, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useClients, Client, Measurements } from '../context/clientContext';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';
import { defaultStyles, themeUtils } from '../theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import DatePicker from '../components/DatePicker';
import Header from '../components/Header';
import PhoneNumberInput from '../components/PhoneNumberInput';
import OrderImagePicker from '../components/OrderImagePicker';
import AddMeasurementAttributeModal from '../components/AddMeasurementAttributeModal';
import ColorPicker from '../components/ColorPicker';
import FabricInput from '../components/FabricInput';
import SuccessModal from '../components/SuccessModal';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { MaterialIcons } from '@expo/vector-icons';

type RouteParams = {
  clientId?: string;
};

const MeasurementInput = ({ label, value, onChangeText }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) => (
  <View style={styles.measurementRow}>
    <View style={styles.columnLeft}>
      <Text style={styles.measurementLabel}>{label}</Text>
    </View>
    <View style={styles.separatorContainer}>
      <View style={styles.separator} />
    </View>
    <View style={styles.columnRight}>
      <TextInput
        style={styles.measurementInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholderTextColor={colors.subText}
        placeholder="0.00"
      />
    </View>
  </View>
);

const NewOrder = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { clientId } = route.params as RouteParams || {};
  const { addClient, clients, addOrderToClient, updateClientMeasurements } = useClients();
  const { measurementAttributes, user } = useApp();
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Find existing client if clientId is provided
  const existingClient = clientId ? clients.find(c => c.id === clientId) : null;

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    orderName: '',
    deliveryDate: new Date(Date.now() + 12096e5),
    notes: '',
    price: '',
    advancePayment: ''
  });

  const [measurements, setMeasurements] = useState<Measurements>({});
  const [orderImages, setOrderImages] = useState({
    image1Uri: undefined as string | undefined,
    image2Uri: undefined as string | undefined,
  });
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [showAddAttributeModal, setShowAddAttributeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Initialize form data and measurements for existing client
  useEffect(() => {
    if (existingClient) {
      setFormData(prev => ({
        ...prev,
        fullName: existingClient.fullName,
        phoneNumber: existingClient.phoneNumber,
        address: existingClient.address,
      }));
      
      // Initialize measurements with existing data
      const initialMeasurements: Measurements = {};
      measurementAttributes.forEach(attr => {
        initialMeasurements[attr] = existingClient.measurements[attr] || 0;
      });
      setMeasurements(initialMeasurements);
    } else {
      // Initialize measurements for new client
      const initialMeasurements: Measurements = {};
      measurementAttributes.forEach(attr => {
        initialMeasurements[attr] = 0;
      });
      setMeasurements(initialMeasurements);
    }
  }, [existingClient, measurementAttributes]);

  const handleMeasurementChange = (attr: string, text: string) => {
    setMeasurements(prev => ({
      ...prev,
      [attr]: text === '' ? 0 : parseFloat(text) || 0
    }));
  };

  const handleAttributeAdded = (newAttributeName: string) => {
    // Add the new attribute to measurements with default value 0
    setMeasurements(prev => ({
      ...prev,
      [newAttributeName]: 0
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.orderName.trim()) {
      Alert.alert(t('common.error'), 'Please enter an order name');
      return;
    }

    if (!existingClient) {
      if (!formData.fullName.trim()) {
        Alert.alert(t('common.error'), 'Please enter client full name');
        return;
      }
      if (!formData.phoneNumber.trim()) {
        Alert.alert(t('common.error'), 'Please enter client phone number');
        return;
      }
      if (!formData.address.trim()) {
        Alert.alert(t('common.error'), 'Please enter client address');
        return;
      }
    }

    console.log('🚀 Submitting order form:', {
      isExistingClient: !!existingClient,
      orderName: formData.orderName,
      deliveryDate: formData.deliveryDate.toISOString().split('T')[0],
      measurementsCount: Object.keys(measurements).length,
      user: user?.id
    });

    const orderDetails = {
      orderName: formData.orderName,
      dateOrdered: new Date().toISOString().split('T')[0],
      dateDelivery: formData.deliveryDate.toISOString().split('T')[0],
      notes: formData.notes,
      price: parseFloat(formData.price) || 0,
      advancePayment: parseFloat(formData.advancePayment) || 0,
      image1Url: orderImages.image1Uri,
      image2Url: orderImages.image2Uri,
      colors: selectedColors,
      fabrics: selectedFabrics,
    };

    console.log('📋 Order details prepared:', orderDetails);

    setIsLoading(true);
    try {
      if (existingClient) {
        console.log('👤 Updating existing client measurements and adding order');
        await updateClientMeasurements(existingClient.id, measurements);
        await addOrderToClient(existingClient.id, orderDetails);
      } else {
        console.log('👤 Creating new client with order');
        const newClient: Omit<Client, 'id'> = {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          measurements,
          orders: [{
            ...orderDetails,
            id: Date.now().toString(),
            status: 'registered'
          }]
        };
        console.log('👤 New client data:', newClient);
        await addClient(newClient);
      }
      console.log('✅ Order submission successful');
      setIsLoading(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('❌ Error saving order:', error);
      Alert.alert(
        'Error', 
        `Failed to save order: ${error.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer}>
        <Header 
          title={t('newOrder.title')} 
          onBack={() => navigation.goBack()} 
        />

        <View style={styles.contentContainer}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.pageTitle}>{t('newOrder.createNewOrder')}</Text>
            <Text style={styles.pageSubtitle}>
              {existingClient ? t('newOrder.addingOrderFor', { clientName: existingClient.fullName }) : t('newOrder.addNewClientSubtitle')}
            </Text>
          </View>

          {/* Client Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.sectionIconText}>👤</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('newOrder.clientInformation')}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('newOrder.fullName')}
              value={formData.fullName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              placeholderTextColor={colors.textSecondary}
            />
            <PhoneNumberInput
              value={formData.phoneNumber}
              onChangePhoneNumber={(phone) => setFormData(prev => ({ ...prev, phoneNumber: phone }))}
              placeholder={t('newOrder.phoneNumber')}
              defaultCountry="CMR"
            />
            <TextInput
              style={styles.input}
              placeholder={t('newOrder.address')}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Order Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.secondary }]}>
                <Text style={styles.sectionIconText}>📋</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('newOrder.orderDetails')}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('newOrder.orderName')}
              value={formData.orderName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, orderName: text }))}
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {t('newOrder.deliveryDate')}: {formData.deliveryDate.toLocaleDateString()}
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

            <OrderImagePicker
              image1Uri={orderImages.image1Uri}
              image2Uri={orderImages.image2Uri}
              onImagesChange={(image1Uri, image2Uri) => {
                setOrderImages({ image1Uri, image2Uri });
              }}
              disabled={isLoading}
            />

            <ColorPicker
              selectedColors={selectedColors}
              onColorsChange={setSelectedColors}
              label="Order Colors"
            />

            <FabricInput
              selectedFabrics={selectedFabrics}
              onFabricsChange={setSelectedFabrics}
              label="Fabric Types"
            />
          </View>

          {/* Measurements Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}>
                <Text style={styles.sectionIconText}>📏</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('newOrder.measurements')}</Text>
              <TouchableOpacity
                style={styles.addAttributeButton}
                onPress={() => setShowAddAttributeModal(true)}
              >
                <MaterialIcons name="add" size={20} color={colors.primary} />
                <Text style={styles.addAttributeButtonText}>Add Attribute</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.measurementsTable}>
              <View style={styles.tableHeader}>
                <View style={styles.columnLeft}>
                  <Text style={styles.headerText}>{t('newOrder.attribute')}</Text>
                </View>
                <View style={styles.separatorContainer}>
                  <View style={styles.separator} />
                </View>
                <View style={styles.columnRight}>
                  <Text style={styles.headerText}>{t('newOrder.value')}</Text>
                </View>
              </View>
              
              {measurementAttributes.map((attr) => (
                <View key={attr} style={styles.measurementRow}>
                  <View style={styles.columnLeft}>
                    <Text style={styles.measurementLabel}>
                      {attr.charAt(0).toUpperCase() + attr.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.separatorContainer}>
                    <View style={styles.separator} />
                  </View>
                  <View style={styles.columnRight}>
                    <TextInput
                      style={styles.measurementInput}
                      value={measurements[attr]?.toString() || ''}
                      onChangeText={(text) => handleMeasurementChange(attr, text)}
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                      placeholder="0.00"
                    />
                  </View>
                </View>
              ))}
            </View>
            
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder={t('newOrder.orderNotes')}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Payment Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.success }]}>
                <Text style={styles.sectionIconText}>💰</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('newOrder.paymentDetails')}</Text>
            </View>
            <View style={styles.paymentContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{t('newOrder.totalPrice')}</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder={t('newOrder.enterTotalPrice')}
                  value={formData.price}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{t('newOrder.advanceReceived')}</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder={t('newOrder.enterAdvanceAmount')}
                  value={formData.advancePayment}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, advancePayment: text }))}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <Pressable 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? t('common.saving') : t('newOrder.saveOrder')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <AddMeasurementAttributeModal
        visible={showAddAttributeModal}
        onClose={() => setShowAddAttributeModal(false)}
        onAttributeAdded={handleAttributeAdded}
      />
      <SuccessModal
        visible={showSuccessModal}
        title="Order Created!"
        message={existingClient 
          ? `Successfully added new order for ${existingClient.fullName}` 
          : "Successfully created new client and order"}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        autoCloseDelay={2500}
      />
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  contentContainer: {
    paddingHorizontal: Platform.OS === 'android' && Dimensions.get('window').width >= 768 
      ? spacing.pageTablet 
      : spacing.page,
    paddingBottom: spacing.huge,
    maxWidth: Dimensions.get('window').width >= 768 ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
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
  section: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    padding: spacing.l,
    marginVertical: spacing.m,
    ...themeUtils.getElevation('xs'),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    ...themeUtils.getElevation('xs'),
  },
  sectionIconText: {
    fontSize: 18,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.m,
  },
  title: {
    marginBottom: spacing.xl,
    color: colors.text,
    fontSize: textVariants.H1.fontSize,
  },
  sectionTitle: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
    flex: 1,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    padding: spacing.input,
    marginBottom: spacing.fieldGap,
    color: colors.text,
    fontSize: textVariants.body2.fontSize,
    minHeight: 48,
    ...themeUtils.getElevation('xs'),
  },
  notesInput: {
    height: 95,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.m,
    paddingVertical: spacing.button,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.huge,
    minHeight: 48,
    ...themeUtils.getElevation('s'),
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: colors.mainText,
    fontSize: 18,
  },
  dateInput: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    padding: spacing.input,
    marginBottom: spacing.fieldGap,
    minHeight: 48,
    justifyContent: 'center',
    ...themeUtils.getElevation('xs'),
  },
  dateText: {
    color: colors.text,
    fontSize: textVariants.body2.fontSize,
  },
  measurementsTable: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    marginBottom: spacing.l,
    overflow: 'hidden',
    ...themeUtils.getElevation('xs'),
  },
  tableHeader: {
    flexDirection: 'row',
    minHeight: 56,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  columnLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: spacing.m,
  },
  columnRight: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.m,
  },
  separatorContainer: {
    width: 1,
    marginHorizontal: spacing.sm,
  },
  separator: {
    flex: 1,
    width: 1,
    backgroundColor: colors.border,
  },
  headerText: {
    color: colors.text,
    fontSize: textVariants.body1.fontSize,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  measurementRow: {
    flexDirection: 'row',
    minHeight: 45,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  measurementLabel: {
    color: colors.textSecondary,
    fontSize: textVariants.body2.fontSize,
  },
  measurementInput: {
    color: colors.text,
    fontSize: textVariants.body1.fontSize,
    textAlign: 'right',
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    marginTop: spacing.m,
    fontSize: textVariants.body1.fontSize,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  paymentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.l,
  },
  priceInput: {
    flex: 1,
    marginBottom: spacing.fieldGap,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: textVariants.body2.fontSize,
    marginBottom: spacing.xs,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  addAttributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.s,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.m,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  addAttributeButtonText: {
    color: colors.primary,
    fontSize: textVariants.body2.fontSize,
    marginLeft: spacing.xs,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});

export default NewOrder;
