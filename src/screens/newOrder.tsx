import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, TouchableOpacity, Platform, Dimensions, ActivityIndicator } from 'react-native';
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
import { useApp } from '../context/AppContext';

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

  const handleSubmit = async () => {
    const orderDetails = {
      orderName: formData.orderName,
      dateOrdered: new Date().toISOString().split('T')[0],
      dateDelivery: formData.deliveryDate.toISOString().split('T')[0],
      notes: formData.notes,
      price: parseFloat(formData.price) || 0,
      advancePayment: parseFloat(formData.advancePayment) || 0,
    };

    setIsLoading(true);
    try {
      if (existingClient) {
        await updateClientMeasurements(existingClient.id, measurements);
        await addOrderToClient(existingClient.id, orderDetails);
      } else {
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
        await addClient(newClient);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer}>
        <Header 
          title="New Order" 
          onBack={() => navigation.goBack()} 
        />

        <View style={styles.contentContainer}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.pageTitle}>Create New Order</Text>
            <Text style={styles.pageSubtitle}>
              {existingClient ? `Adding order for ${existingClient.fullName}` : 'Add a new client and their first order'}
            </Text>
          </View>

          {/* Client Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.sectionIconText}>👤</Text>
              </View>
              <Text style={styles.sectionTitle}>Client Information</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={formData.fullName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              placeholderTextColor={colors.textSecondary}
            />
            <PhoneNumberInput
              value={formData.phoneNumber}
              onChangePhoneNumber={(phone) => setFormData(prev => ({ ...prev, phoneNumber: phone }))}
              placeholder="Phone Number"
              defaultCountry="US"
            />
            <TextInput
              style={styles.input}
              placeholder="Address"
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
              <Text style={styles.sectionTitle}>Order Details</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Order Name"
              value={formData.orderName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, orderName: text }))}
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                Delivery Date: {formData.deliveryDate.toLocaleDateString()}
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
          </View>

          {/* Measurements Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}>
                <Text style={styles.sectionIconText}>📏</Text>
              </View>
              <Text style={styles.sectionTitle}>Measurements</Text>
            </View>
            <View style={styles.measurementsTable}>
              <View style={styles.tableHeader}>
                <View style={styles.columnLeft}>
                  <Text style={styles.headerText}>Attribute</Text>
                </View>
                <View style={styles.separatorContainer}>
                  <View style={styles.separator} />
                </View>
                <View style={styles.columnRight}>
                  <Text style={styles.headerText}>Value</Text>
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
              placeholder="Order Notes"
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
              <Text style={styles.sectionTitle}>Payment Details</Text>
            </View>
            <View style={styles.paymentContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Total Price</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Enter total price"
                  value={formData.price}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Advance Received</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Enter advance amount"
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
                {isLoading ? 'Saving...' : 'Save Order'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
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
});

export default NewOrder;
