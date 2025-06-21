import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, TouchableOpacity, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useClients, Client, Measurements } from '../context/clientContext';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import DatePicker from '../components/DatePicker';
import Header from '../components/Header';
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
      <KeyboardAwareScrollView>
        <Header 
          title="New Order" 
          onBack={() => navigation.goBack()} 
        />

        <Text style={styles.sectionTitle}>Client Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={formData.fullName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
          placeholderTextColor={colors.subText}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
          placeholderTextColor={colors.subText}
        />
        <TextInput
          style={styles.input}
          placeholder="Address"
          value={formData.address}
          onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
          placeholderTextColor={colors.subText}
        />

        <Text style={styles.sectionTitle}>Order Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Order Name"
          value={formData.orderName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, orderName: text }))}
          placeholderTextColor={colors.subText}
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

        <Text style={styles.sectionTitle}>Measurements</Text>
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
                  placeholderTextColor={colors.subText}
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
          placeholderTextColor={colors.subText}
        />

        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.paymentContainer}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Total Price</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="Enter total price"
              value={formData.price}
              onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
              keyboardType="numeric"
              placeholderTextColor={colors.subText}
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
              placeholderTextColor={colors.subText}
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
      </KeyboardAwareScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    marginBottom: 24,
    color: colors.mainText,
    fontSize: textVariants.H1.fontSize,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: colors.mainText,
    fontSize: textVariants.H6.fontSize,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
  },
  input: {
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    color: colors.mainText,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
    fontSize: textVariants.body2.fontSize,
  },
  notesInput: {
    height: 95,
    textAlignVertical: 'top',
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
  },
  buttonText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: 'bold',
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
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
  },
  dateText: {
    color: colors.mainText,
    fontSize: 16,
    width: "75%",
  },
  measurementsTable: {
    backgroundColor: '#ffffff08',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
  },
  tableHeader: {
    flexDirection: 'row',
    minHeight: 56,
    borderBottomWidth: 2,
    borderBottomColor: '#ffffff20',
    backgroundColor: '#ffffff10',
  },
  columnLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  columnRight: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 16,
  },
  separatorContainer: {
    width: 1,
    marginHorizontal: 12,
  },
  separator: {
    flex: 1,
    width: 1,
    backgroundColor: '#ffffff20',
  },
  headerText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  measurementRow: {
    flexDirection: 'row',
    minHeight: 45,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff10',
  },
  measurementLabel: {
    color: colors.subText,
    fontSize: textVariants.body2.fontSize,
  },
  measurementInput: {
    color: colors.mainText,
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
    color: colors.mainText,
    marginTop: 16,
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  paymentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
  },
  priceInput: {
    flex: 1,
    marginBottom: 12,
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

export default NewOrder;
