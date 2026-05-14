import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, TouchableOpacity, Platform } from 'react-native';
import { useClients } from '../context/clientContext';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { useNavigation } from "@react-navigation/native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import DateTimePicker from '@react-native-community/datetimepicker';



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
  const { addClient } = useClients();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    orderName: '',
    deliveryDate: new Date(Date.now() + 12096e5), // Default to 2 weeks from now
    notes: '',
    // Updated measurements
    shoulder: '',
    hips: '',
    chest: '',
    waist: '',
    topLength: '',
    trouserLength: '',
    legRound: '',
    armRound: '',
    wrist: '',
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, deliveryDate: selectedDate }));
    }
  };

  const handleSubmit = () => {
    const measurements: Measurements = {
      shoulder: Number(formData.shoulder),
      hips: Number(formData.hips),
      chest: Number(formData.chest),
      waist: Number(formData.waist),
      topLength: Number(formData.topLength),
      trouserLength: Number(formData.trouserLength),
      legRound: Number(formData.legRound),
      armRound: Number(formData.armRound),
      wrist: Number(formData.wrist),
    };

    const newClient = {
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber,
      address: formData.address,
      measurements,
      orders: [{
        orderName: formData.orderName,
        dateOrdered: new Date().toISOString().split('T')[0], // Current date
        dateDelivery: formData.deliveryDate.toISOString().split('T')[0],
        notes: formData.notes
      }]
    };

    addClient(newClient);
    alert('Client order has been added successfully!');
    navigation.navigate('Home');
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAwareScrollView>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>New Order</Text>

        
        <Text  style={styles.sectionTitle}>Client Information</Text>
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
          
          <MeasurementInput
            label="Shoulder"
            value={formData.shoulder}
            onChangeText={(text) => setFormData(prev => ({ ...prev, shoulder: text }))}
          />
          <MeasurementInput
            label="Chest"
            value={formData.chest}
            onChangeText={(text) => setFormData(prev => ({ ...prev, chest: text }))}
          />
          <MeasurementInput
            label="Hips"
            value={formData.hips}
            onChangeText={(text) => setFormData(prev => ({ ...prev, hips: text }))}
          />
          <MeasurementInput
            label="Waist"
            value={formData.waist}
            onChangeText={(text) => setFormData(prev => ({ ...prev, waist: text }))}
          />
          <MeasurementInput
            label="Top Length"
            value={formData.topLength}
            onChangeText={(text) => setFormData(prev => ({ ...prev, topLength: text }))}
          />
          <MeasurementInput
            label="Trouser Length"
            value={formData.trouserLength}
            onChangeText={(text) => setFormData(prev => ({ ...prev, trouserLength: text }))}
          />
          <MeasurementInput
            label="Leg Round"
            value={formData.legRound}
            onChangeText={(text) => setFormData(prev => ({ ...prev, legRound: text }))}
          />
          <MeasurementInput
            label="Arm Round"
            value={formData.armRound}
            onChangeText={(text) => setFormData(prev => ({ ...prev, armRound: text }))}
          />
          <MeasurementInput
            label="Wrist"
            value={formData.wrist}
            onChangeText={(text) => setFormData(prev => ({ ...prev, wrist: text }))}
          />
        </View>
        
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Order Notes"
          value={formData.notes}
          onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
          multiline
          placeholderTextColor={colors.subText}
        />

        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Save Order</Text>
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
    fontSize: textVariants.H3.fontSize,
  },
  input: {
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    color: colors.mainText,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
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
  },
  dateText: {
    color: colors.mainText,
    fontSize: 16,
  },
  measurementsTable: {
    backgroundColor: '#ffffff08',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
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
    fontSize: textVariants.body1.fontSize,
  },
  measurementInput: {
    color: colors.mainText,
    fontSize: textVariants.body1.fontSize,
    textAlign: 'right',
    padding: 0,
  },
});

export default NewOrder;
