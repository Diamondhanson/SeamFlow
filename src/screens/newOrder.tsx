import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, TouchableOpacity, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useClients, Client, Measurements } from '../context/clientContext';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../components/Header';
import { useApp } from '../context/AppContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';

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
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Find existing client if clientId is provided
  const existingClient = clientId ? clients.find(c => c.id === clientId) : null;

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    orderName: '',
    deliveryDate: new Date(Date.now() + 12096e5),
    notes: '',
  });

  const [measurements, setMeasurements] = useState<Measurements>({});

  // Load initial data from Firestore
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.clients) {
              const currentClient = userData.clients.find((c: Client) => c.id === clientId);
              if (currentClient) {
                setFormData(prev => ({
                  ...prev,
                  fullName: currentClient.fullName,
                  phoneNumber: currentClient.phoneNumber,
                  address: currentClient.address,
                }));
                
                // Initialize measurements with existing data
                const initialMeasurements: Measurements = {};
                measurementAttributes.forEach(attr => {
                  initialMeasurements[attr] = currentClient.measurements[attr] || 0;
                });
                setMeasurements(initialMeasurements);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
        setDataLoaded(true);
      }
    };

    loadData();
  }, [user, clientId, measurementAttributes]);

  const handleMeasurementChange = (attr: string, text: string) => {
    if (!dataLoaded) return; // Prevent updates before data is loaded
    
    const value = parseFloat(text) || 0;
    setMeasurements(prev => ({
      ...prev,
      [attr]: value
    }));
  };

  const handleSubmit = async () => {
    if (!dataLoaded) return; // Prevent submission before data is loaded

    const orderDetails = {
      orderName: formData.orderName,
      dateOrdered: new Date().toISOString().split('T')[0],
      dateDelivery: formData.deliveryDate.toISOString().split('T')[0],
      notes: formData.notes,
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

  if (isLoading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

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

        {showDatePicker && (
          <DateTimePicker
            value={formData.deliveryDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()} // Can't select past dates
          />
        )}

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
                  value={measurements[attr]?.toString()}
                  onChangeText={(text) => handleMeasurementChange(attr, text)}
                  keyboardType="numeric"
                  placeholderTextColor={colors.subText}
                  editable={dataLoaded} // Disable input until data is loaded
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

        <Pressable 
          style={[styles.button, !dataLoaded && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={!dataLoaded || isLoading}
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
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
    alignSelf: "center",
  },
  input: {
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    color: colors.mainText,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
    alignSelf: "center",
    fontSize: textVariants.body2.fontSize,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
    alignSelf: "center",
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
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
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
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
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
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
    minHeight: 56,
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
});

export default NewOrder;
