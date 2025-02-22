import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { textVariants } from '../../theme/textVariants';
import { useClients } from '../../context/clientContext';
import { useApp } from '../../context/AppContext';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Header from '../../components/Header';

interface Member {
  id: string;
  name: string;
  measurements: { [key: string]: number };
  notes?: string;
}

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

const AddBulkOrder = () => {
  const navigation = useNavigation();
  const { addBulkOrder } = useClients();
  const { measurementAttributes } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    orderName: '',
    phoneNumber: '',
    address: '',
    deliveryDate: new Date(Date.now() + 12096e5), // Default to 2 weeks from now
    notes: '',
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState({
    name: '',
    measurements: {},
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, deliveryDate: selectedDate }));
    }
  };

  const handleAddMember = () => {
    if (!currentMember.name.trim()) {
      Alert.alert('Error', 'Please enter member name');
      return;
    }

    const newMember: Member = {
      id: Date.now().toString(),
      name: currentMember.name,
      measurements: currentMember.measurements,
    };

    setMembers([...members, newMember]);
    setCurrentMember({
      name: '',
      measurements: {},
    });
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter(member => member.id !== id));
  };

  const handleMeasurementChange = (attr: string, value: string) => {
    setCurrentMember(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [attr]: parseFloat(value) || 0,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!formData.orderName.trim()) {
      Alert.alert('Error', 'Please enter order name');
      return;
    }

    if (members.length === 0) {
      Alert.alert('Error', 'Please add at least one member');
      return;
    }

    setIsLoading(true);
    try {
      await addBulkOrder({
        orderName: formData.orderName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        dateOrdered: new Date().toISOString().split('T')[0],
        dateDelivery: formData.deliveryDate.toISOString().split('T')[0],
        notes: formData.notes,
        members: members,
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error saving bulk order:', error);
      Alert.alert('Error', 'Failed to save bulk order');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Saving order...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <KeyboardAwareScrollView>
        <Header 
          title="New Bulk Order" 
          onBack={() => navigation.goBack()} 
        />

        <View style={styles.container}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Order Name (e.g., HANSEN WEDDING)"
            value={formData.orderName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, orderName: text }))}
            placeholderTextColor={colors.subText}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
            placeholderTextColor={colors.subText}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Address"
            value={formData.address}
            onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
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
              minimumDate={new Date()}
            />
          )}

          <Text style={styles.sectionTitle}>Add Members</Text>
          
          {/* Current Member Form */}
          <View style={styles.memberForm}>
            <TextInput
              style={styles.input}
              placeholder="Member Name"
              value={currentMember.name}
              onChangeText={(text) => setCurrentMember(prev => ({ ...prev, name: text }))}
              placeholderTextColor={colors.subText}
            />

            <View style={styles.measurementsTable}>
              {measurementAttributes.map((attr) => (
                <MeasurementInput
                  key={attr}
                  label={attr.charAt(0).toUpperCase() + attr.slice(1)}
                  value={currentMember.measurements[attr]?.toString() || ''}
                  onChangeText={(text) => handleMeasurementChange(attr, text)}
                />
              ))}
            </View>

            <TouchableOpacity 
              style={styles.addMemberButton}
              onPress={handleAddMember}
            >
              <MaterialIcons name="person-add" size={20} color="white" />
              <Text style={styles.addMemberButtonText}>Add Member</Text>
            </TouchableOpacity>
          </View>

          {/* Members List */}
          {members.length > 0 && (
            <View style={styles.membersList}>
              <Text style={styles.sectionTitle}>Members ({members.length})</Text>
              {members.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(member.id)}
                    style={styles.removeMemberButton}
                  >
                    <MaterialIcons name="close" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Only Bulk Order Notes */}
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Order Notes"
            value={formData.notes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
            multiline
            placeholderTextColor={colors.subText}
          />

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Saving...' : 'Save Bulk Order'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.mainText,
  },
  sectionTitle: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: colors.mainText,
  },
  input: {
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    color: colors.mainText,
    fontSize: textVariants.body2.fontSize,
  },
  dateInput: {
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateText: {
    color: colors.mainText,
    fontSize: textVariants.body2.fontSize,
  },
  memberForm: {
    backgroundColor: '#ffffff08',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  measurementsTable: {
    marginBottom: 16,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  columnLeft: {
    flex: 1,
  },
  columnRight: {
    flex: 1,
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
  measurementLabel: {
    color: colors.subText,
    fontSize: textVariants.body2.fontSize,
  },
  measurementInput: {
    color: colors.mainText,
    fontSize: textVariants.body2.fontSize,
    textAlign: 'right',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  addMemberButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addMemberButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: textVariants.body2.fontSize,
    fontWeight: 'bold',
  },
  membersList: {
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberName: {
    flex: 1,
    color: colors.mainText,
    fontSize: textVariants.body2.fontSize,
  },
  removeMemberButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AddBulkOrder;
