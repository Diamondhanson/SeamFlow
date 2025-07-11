import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { Client } from '../context/clientContext';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';
import { defaultStyles, themeUtils } from '../theme';
import AddNewOrder from './addNewOrder';
import EditMeasurementValue from './editMeasurementValue';
import AddOrderImagesModal from './AddOrderImagesModal';
import { useClients } from '../context/clientContext';
import Icons from "react-native-vector-icons/MaterialIcons";
import Header from './Header';
import SafeAreaWrapper from './SafeAreaWrapper';
import { useApp } from '../context/AppContext';

interface ClientDetailsProps {
  client: Client;
  onBack: () => void;
}

const ClientDetails = ({ client: initialClient, onBack }: ClientDetailsProps) => {
  const { updateClientMeasurements, clients } = useClients();
  const { measurementAttributes } = useApp();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<{
    name: string;
    value: number;
  } | null>(null);
  const [addImagesModal, setAddImagesModal] = useState<{
    visible: boolean;
    orderId: string;
    orderName: string;
  }>({
    visible: false,
    orderId: '',
    orderName: '',
  });

  // Get the latest client data from context
  const client = useMemo(() => {
    if (!initialClient) return null;
    return clients.find(c => c.id === initialClient.id) || initialClient;
  }, [clients, initialClient]);

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleUpdateMeasurement = (newValue: number) => {
    if (editingMeasurement && client) {
      const updatedMeasurements = {
        ...client.measurements,
        [editingMeasurement.name]: newValue
      };
      updateClientMeasurements(client.id, updatedMeasurements);
    }
  };

  if (!client) return null;

  return (
    <SafeAreaWrapper>
       <Header 
          title="Client Details" 
          onBack={onBack}
        />
      <View style={styles.container}>
       
        
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.sectionIconText}>👤</Text>
              </View>
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{client.fullName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{client.phoneNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{client.address}</Text>
            </View>
          </View>

          {/* Measurements */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}>
                <Text style={styles.sectionIconText}>📏</Text>
              </View>
              <Text style={styles.sectionTitle}>Measurements</Text>
            </View>
            <View style={styles.measurementsGrid}>
              {measurementAttributes.map((attr) => (
                <View key={attr} style={styles.measurementItem}>
                  <Text style={styles.label}>
                    {attr.charAt(0).toUpperCase() + attr.slice(1)}:
                  </Text>
                  <TouchableOpacity 
                    style={styles.measurementValueContainer}
                    onPress={() => setEditingMeasurement({
                      name: attr,
                      value: client.measurements[attr] || 0
                    })}
                  >
                    <Text style={styles.value2}>
                      {client.measurements[attr] || 0}
                    </Text>
                    <Icons 
                      name="edit" 
                      size={14} 
                      color={colors.primary} 
                      style={styles.editIcon} 
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Orders List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.secondary }]}>
                <Text style={styles.sectionIconText}>📦</Text>
              </View>
              <Text style={styles.sectionTitle}>Orders History</Text>
            </View>
            {client.orders.map((order) => (
              <TouchableOpacity 
                key={order.id} 
                style={[
                  styles.orderItem,
                  expandedOrderId === order.id && styles.orderItemExpanded
                ]}
                onPress={() => toggleOrderExpansion(order.id)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderName}>{order.orderName}</Text>
                  <View style={styles.orderDueDate}>
                    <Text style={styles.dateLabel}>Due:</Text>
                    <Text style={styles.dateValue}>
                      {new Date(order.dateDelivery).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {expandedOrderId === order.id && (
                  <View style={styles.orderExpandedContent}>
                    {order.notes && (
                      <Text style={styles.orderNote}>{order.notes}</Text>
                    )}
                    
                    {/* Order Images Section */}
                    {(order.image1Url || order.image2Url) && (
                      <View style={styles.orderImagesSection}>
                        <Text style={styles.orderImagesTitle}>Order Images</Text>
                        <View style={styles.orderImagesContainer}>
                          {order.image1Url && (
                            <Image 
                              source={{ uri: order.image1Url }} 
                              style={styles.orderImage} 
                              resizeMode="cover"
                            />
                          )}
                          {order.image2Url && (
                            <Image 
                              source={{ uri: order.image2Url }} 
                              style={styles.orderImage} 
                              resizeMode="cover"
                            />
                          )}
                        </View>
                      </View>
                    )}

                    {/* Add Images Button for orders without images */}
                    {!order.image1Url && !order.image2Url && (
                      <TouchableOpacity
                        style={styles.addImagesButton}
                        onPress={() => setAddImagesModal({
                          visible: true,
                          orderId: order.id,
                          orderName: order.orderName,
                        })}
                      >
                        <Icons name="add-a-photo" size={20} color={colors.primary} />
                        <Text style={styles.addImagesButtonText}>Add Images</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Payment Details Section */}
                    <View style={styles.paymentDetails}>
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Total Price:</Text>
                        <Text style={styles.paymentValue}>
                          ${order.price?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Advance Paid:</Text>
                        <Text style={styles.paymentValue}>
                          ${order.advancePayment?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Balance:</Text>
                        <Text style={[
                          styles.paymentValue,
                          { color: ((order.price || 0) - (order.advancePayment || 0)) > 0 ? colors.error : colors.success }
                        ]}>
                          ${((order.price || 0) - (order.advancePayment || 0)).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.orderFooter}>
                      <View style={styles.dateGroup}>
                        <Text style={styles.dateLabel}>Ordered:</Text>
                        <Text style={styles.dateValue}>
                          {new Date(order.dateOrdered).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.statusContainer}>
                        <Text style={styles.statusLabel}>Status:</Text>
                        <Text style={[styles.statusValue, styles[order.status]]}>
                          {order.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Add New Order Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddOrder(true)}
        >
          <Text style={styles.addButtonText}>Add New Order</Text>
        </TouchableOpacity>

        {/* Keep the modals for editing and adding orders */}
        {showAddOrder && (
          <AddNewOrder
            visible={showAddOrder}
            onClose={() => setShowAddOrder(false)}
            clientId={client.id}
          />
        )}

        {editingMeasurement && (
          <EditMeasurementValue
            visible={!!editingMeasurement}
            onClose={() => setEditingMeasurement(null)}
            attributeName={editingMeasurement.name}
            currentValue={editingMeasurement.value}
            onSave={handleUpdateMeasurement}
          />
        )}

        <AddOrderImagesModal
          visible={addImagesModal.visible}
          onClose={() => setAddImagesModal({ visible: false, orderId: '', orderName: '' })}
          clientId={client.id}
          orderId={addImagesModal.orderId}
          orderName={addImagesModal.orderName}
        />
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: Dimensions.get('window').width >= 768 ? spacing.pageTablet : spacing.page,
  },
  scrollContainer: {
    paddingBottom: spacing.huge,
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
  sectionTitle: {
    fontSize: textVariants.H5.fontSize,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
  },
  infoItem: {
    marginBottom: spacing.m,
  },
  label: {
    fontSize: textVariants.body2.fontSize,
    color: colors.subText,
    marginBottom: 4,
  },
  value: {
    fontSize: textVariants.body3.fontSize,
    color: colors.mainText,
    marginBottom: 12,
  },
  value2: {
    fontSize: textVariants.body1.fontSize,
    color: colors.mainText,
    marginBottom: 12,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  measurementItem: {
    width: '48%',
    marginBottom: 12,
  },
  measurementValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIcon: {
    opacity: 0.7,
  },
  orderItem: {
    backgroundColor: '#ffffff15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  orderItemExpanded: {
    backgroundColor: '#ffffff20',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.mainText,
    flex: 1,
  },
  orderDueDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderExpandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffffff15',
  },
  orderFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNote: {
    fontSize: 16,
    color: colors.mainText,
    marginBottom: 12,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: colors.subText,
    marginRight: 8,
  },
  dateValue: {
    fontSize: 14,
    color: colors.accent,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.subText,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  registered: {
    backgroundColor: colors.primary,
    color: colors.mainText,
  },
  in_progress: {
    backgroundColor: '#ffd700',
    color: '#000',
  },
  testing: {
    backgroundColor: '#87ceeb',
    color: '#000',
  },
  on_pause: {
    backgroundColor: '#ff6b6b',
    color: colors.mainText,
  },
  delivered: {
    backgroundColor: '#90EE90',
    color: '#000',
  },
  paymentDetails: {
    backgroundColor: '#ffffff08',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paymentLabel: {
    color: colors.subText,
    fontSize: textVariants.body2.fontSize,
  },
  paymentValue: {
    color: colors.mainText,
    fontSize: textVariants.body2.fontSize,
    fontWeight: '600',
  },
  orderImagesSection: {
    marginVertical: spacing.m,
  },
  orderImagesTitle: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: '600',
    color: colors.mainText,
    marginBottom: spacing.s,
  },
  orderImagesContainer: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  orderImage: {
    width: 120,
    height: 90,
    borderRadius: spacing.borderRadius.m,
    backgroundColor: colors.surface,
    ...themeUtils.getElevation('xs'),
  },
  addImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: spacing.borderRadius.m,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    marginVertical: spacing.m,
    gap: spacing.s,
  },
  addImagesButtonText: {
    fontSize: textVariants.body1.fontSize,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default ClientDetails;
