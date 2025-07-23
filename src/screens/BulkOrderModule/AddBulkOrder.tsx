import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { textVariants } from '../../theme/textVariants';
import { spacing } from '../../theme/spacing';
import { defaultStyles, themeUtils } from '../../theme';
import { useClients } from '../../context/clientContext';
import { useApp } from '../../context/AppContext';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Header from '../../components/Header';
import DatePicker from '../../components/DatePicker';
import PhoneNumberInput from '../../components/PhoneNumberInput';
import OrderImagePicker from '../../components/OrderImagePicker';
import AddMeasurementAttributeModal from '../../components/AddMeasurementAttributeModal';
import { useTranslation } from '../../hooks/useTranslation';

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
        placeholder="0.00"
      />
    </View>
  </View>
);

const AddBulkOrder = () => {
  const navigation = useNavigation();
  const { addBulkOrder } = useClients();
  const { measurementAttributes } = useApp();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    orderName: '',
    phoneNumber: '',
    address: '',
    deliveryDate: new Date(Date.now() + 12096e5), // Default to 2 weeks from now
    notes: '',
    price: '',
    advancePayment: ''
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState({
    name: '',
    measurements: {} as { [key: string]: number },
  });
  const [orderImages, setOrderImages] = useState({
    image1Uri: undefined as string | undefined,
    image2Uri: undefined as string | undefined,
  });
  const [showAddAttributeModal, setShowAddAttributeModal] = useState(false);

  const handleAddMember = () => {
    if (!currentMember.name.trim()) {
      Alert.alert(t('common.error'), t('addBulkOrder.enterMemberName'));
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
        [attr]: value === '' ? 0 : parseFloat(value) || 0,
      },
    }));
  };

  const handleAttributeAdded = (newAttributeName: string) => {
    // Add the new attribute to current member's measurements with default value 0
    setCurrentMember(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [newAttributeName]: 0
      }
    }));
  };

  const handleSubmit = async () => {
    // Enhanced validation
    if (!formData.orderName.trim()) {
      Alert.alert(t('common.error'), t('addBulkOrder.enterOrderName'));
      return;
    }

    if (!formData.phoneNumber.trim()) {
      Alert.alert(t('common.error'), 'Please enter a phone number');
      return;
    }

    if (!formData.address.trim()) {
      Alert.alert(t('common.error'), 'Please enter an address');
      return;
    }

    if (members.length === 0) {
      Alert.alert(t('common.error'), t('addBulkOrder.addAtLeastOneMember'));
      return;
    }

    console.log('🚀 Submitting bulk order:', {
      orderName: formData.orderName,
      phoneNumber: formData.phoneNumber,
      address: formData.address,
      membersCount: members.length,
      deliveryDate: formData.deliveryDate.toISOString().split('T')[0],
      price: formData.price
    });

    setIsLoading(true);
    try {
      const bulkOrderData = {
        orderName: formData.orderName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        dateOrdered: new Date().toISOString().split('T')[0],
        dateDelivery: formData.deliveryDate.toISOString().split('T')[0],
        notes: formData.notes,
        members: members,
        price: parseFloat(formData.price) || 0,
        advancePayment: parseFloat(formData.advancePayment) || 0,
        image1Url: orderImages.image1Uri,
        image2Url: orderImages.image2Uri,
      };

      console.log('📦 Bulk order data prepared:', bulkOrderData);

      await addBulkOrder(bulkOrderData);
      
      console.log('✅ Bulk order submitted successfully');
      Alert.alert('Success', 'Bulk order saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('❌ Error saving bulk order:', error);
      Alert.alert(
        t('common.error'), 
        `${t('addBulkOrder.orderSaveFailed')}: ${error.message || 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('addBulkOrder.savingOrder')}</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer}>
        <Header 
          title={t('addBulkOrder.title')} 
          onBack={() => navigation.goBack()} 
        />

        <View style={styles.contentContainer}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.pageTitle}>{t('addBulkOrder.createBulkOrder')}</Text>
            <Text style={styles.pageSubtitle}>
              {t('addBulkOrder.organizeMultipleOrders')}
            </Text>
          </View>

          {/* Order Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.sectionIconText}>📋</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('addBulkOrder.orderInformation')}</Text>
            </View>

            <View style={styles.sectionContent}>
              <TextInput
                style={styles.input}
                placeholder={t('addBulkOrder.orderNamePlaceholder')}
                value={formData.orderName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, orderName: text }))}
                placeholderTextColor={colors.subText}
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
                placeholderTextColor={colors.subText}
              />

              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="event" size={20} color={colors.primary} style={styles.inputIcon} />
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
            </View>
          </View>

          {/* Members Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.success }]}>
                <Text style={styles.sectionIconText}>👥</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('addBulkOrder.addMembers')}</Text>
            </View>

            <View style={styles.sectionContent}>
              {/* Members List */}
              {members.length > 0 && (
                <View style={styles.membersList}>
                  <View style={styles.membersHeader}>
                    <Text style={styles.membersCount}>{t('addBulkOrder.membersCount', { count: members.length })}</Text>
                  </View>
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

              {/* Current Member Form */}
              <View style={styles.memberForm}>
                <TextInput
                  style={styles.input}
                  placeholder={t('addBulkOrder.memberName')}
                  value={currentMember.name}
                  onChangeText={(text) => setCurrentMember(prev => ({ ...prev, name: text }))}
                  placeholderTextColor={colors.subText}
                />

                <View style={styles.measurementsContainer}>
                  <Text style={styles.measurementsTitle}>📏 {t('newOrder.measurements')}</Text>
                  <TouchableOpacity
                    style={styles.addAttributeButton}
                    onPress={() => setShowAddAttributeModal(true)}
                  >
                    <MaterialIcons name="add" size={18} color={colors.primary} />
                    <Text style={styles.addAttributeButtonText}>Add Attribute</Text>
                  </TouchableOpacity>
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
                </View>

                <TouchableOpacity 
                  style={styles.addMemberButton}
                  onPress={handleAddMember}
                >
                  <MaterialIcons name="person-add" size={20} color="white" />
                  <Text style={styles.addMemberButtonText}>{t('addBulkOrder.addMember')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Notes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.warning }]}>
                <Text style={styles.sectionIconText}>📝</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('addBulkOrder.orderNotes')}</Text>
            </View>

            <View style={styles.sectionContent}>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder={t('addBulkOrder.addInstructions')}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                multiline
                placeholderTextColor={colors.subText}
              />
            </View>
          </View>

          {/* Payment Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}>
                <Text style={styles.sectionIconText}>💰</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('newOrder.paymentDetails')}</Text>
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.paymentContainer}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>{t('addBulkOrder.bulkOrderPrice')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('newOrder.enterTotalPrice')}
                    value={formData.price}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                    keyboardType="numeric"
                    placeholderTextColor={colors.subText}
                  />
                </View>
                
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>{t('newOrder.advanceReceived')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('newOrder.enterAdvanceAmount')}
                    value={formData.advancePayment}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, advancePayment: text }))}
                    keyboardType="numeric"
                    placeholderTextColor={colors.subText}
                  />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? t('common.saving') : t('addBulkOrder.saveBulkOrder')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      <AddMeasurementAttributeModal
        visible={showAddAttributeModal}
        onClose={() => setShowAddAttributeModal(false)}
        onAttributeAdded={handleAttributeAdded}
      />
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 32,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
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
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.mainText,
    marginBottom: 4,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 16,
    color: colors.subText,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.surface + '80',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionIconText: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.mainText,
    flex: 1,
  },
  sectionContent: {
    padding: 24,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 48,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  dateInput: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    color: colors.mainText,
    flex: 1,
  },
  memberForm: {
    backgroundColor: colors.surface + '40',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  measurementsContainer: {
    marginBottom: 24,
  },
  measurementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.mainText,
    marginBottom: 16,
  },
  measurementsTable: {
    backgroundColor: colors.surface + '60',
    borderRadius: 8,
    padding: 16,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border + '40',
  },
  columnLeft: {
    flex: 1,
  },
  columnRight: {
    flex: 1,
  },
  separatorContainer: {
    width: 1,
    marginHorizontal: 16,
  },
  separator: {
    flex: 1,
    width: 1,
    backgroundColor: colors.border,
  },
  measurementLabel: {
    fontSize: 18,
    color: colors.subText,
  },
  measurementInput: {
    fontSize: 18,
    color: colors.mainText,
    textAlign: 'right',
    padding: 4,
  },
  addMemberButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  addMemberButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
  membersList: {
    marginBottom: 24,
  },
  membersHeader: {
    marginBottom: 16,
  },
  membersCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface + '60',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  memberName: {
    fontSize: 16,
    color: colors.mainText,
    flex: 1,
  },
  removeMemberButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.error + '20',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  paymentContainer: {
    flexDirection: Platform.OS === 'ios' && Dimensions.get('window').width >= 768 ? 'row' : 'column',
    gap: 16,
  },
  inputWrapper: {
    flex: Platform.OS === 'ios' && Dimensions.get('window').width >= 768 ? 1 : undefined,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.subText,
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  addAttributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface + '60',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  addAttributeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 8,
  },
});

export default AddBulkOrder;
