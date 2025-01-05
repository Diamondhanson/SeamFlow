import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Pressable,
  Dimensions
} from 'react-native';
import { Client } from '../context/clientContext';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import AddNewOrder from './addNewOrder';

interface ClientDetailsProps {
  client: Client | null;
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

const ClientDetails = ({ client, visible, onClose }: ClientDetailsProps) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showAddOrder, setShowAddOrder] = useState(false);

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  if (!client) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView style={styles.scrollView}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerText}>Client Details</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{client.fullName}</Text>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{client.phoneNumber}</Text>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{client.address}</Text>
            </View>

            {/* Measurements */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Measurements</Text>
              <View style={styles.measurementsGrid}>
                <View style={styles.measurementItem}>
                  <Text style={styles.label}>Shoulder:</Text>
                  <Text style={styles.value}>{client.measurements.shoulder}</Text>
                </View>
                <View style={styles.measurementItem}>
                  <Text style={styles.label}>Chest:</Text>
                  <Text style={styles.value}>{client.measurements.chest}</Text>
                </View>
                <View style={styles.measurementItem}>
                  <Text style={styles.label}>Hips:</Text>
                  <Text style={styles.value}>{client.measurements.hips}</Text>
                </View>
                <View style={styles.measurementItem}>
                  <Text style={styles.label}>Length:</Text>
                  <Text style={styles.value}>{client.measurements.length}</Text>
                </View>
              </View>
            </View>

            {/* Orders List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Orders History</Text>
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
          <Pressable 
            style={styles.addButton}
            onPress={() => setShowAddOrder(true)}
          >
            <Text style={styles.addButtonText}>Add New Order</Text>
          </Pressable>

          {/* Add the new order modal */}
          {client && (
            <AddNewOrder
              visible={showAddOrder}
              onClose={() => setShowAddOrder(false)}
              clientId={client.id}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    minHeight: '80%',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: textVariants.H2.fontSize,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: textVariants.H3.fontSize,
    fontWeight: 'bold',
    color: colors.mainText,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: colors.subText,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
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
});

export default ClientDetails;
