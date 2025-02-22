import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useClients } from '../../context/clientContext';
import { MaterialIcons } from '@expo/vector-icons';
import { OrderStatus, BulkOrder as BulkOrderType } from '../../context/clientContext';
import { theme } from '@/src/theme';
import Header from '@/src/components/Header';
import { colors } from '@/src/theme/colors';
import BulkOrderDetails from './BulkOrderDetails';

// Helper function to get status color
const getStatusColor = (status: OrderStatus) => {
  const colors = {
    registered: '#3498db',    // Blue
    in_progress: '#f1c40f',   // Yellow
    testing: '#e67e22',       // Orange
    on_pause: '#e74c3c',      // Red
    delivered: '#2ecc71',     // Green
  };
  return colors[status] || '#95a5a6';  // Default gray
};

const BulkOrderList = ({ onSelectOrder }) => {
  const navigation = useNavigation();
  const { bulkOrders } = useClients();

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => onSelectOrder(item)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderName}>{item.orderName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <MaterialIcons name="event" size={16} color="#666" />
          <Text style={styles.dateText}>Delivery: {item.dateDelivery}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="group" size={16} color="#666" />
          <Text style={styles.memberCount}>
            {item.members.length} {item.members.length === 1 ? 'Member' : 'Members'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="phone" size={16} color="#666" />
          <Text style={styles.phoneText}>{item.phoneNumber}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="group-add" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No bulk orders yet</Text>
      <Text style={styles.emptyStateSubText}>
        Tap the + button to create your first bulk order
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Bulk Orders" onBack={() => navigation.goBack()} />
      <FlatList
        data={bulkOrders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyState}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddBulkOrder')}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const BulkOrder = () => {
  const [selectedOrder, setSelectedOrder] = useState<BulkOrderType | null>(null);
  const { updateBulkOrderStatus } = useClients();

  const handleSelectOrder = (order: BulkOrderType) => {
    setSelectedOrder(order);
  };

  const handleBack = () => {
    setSelectedOrder(null);
  };

  const handleStatusChange = async (status: OrderStatus) => {
    if (selectedOrder) {
      await updateBulkOrderStatus(selectedOrder.id, status);
      setSelectedOrder(prev => prev ? { ...prev, status } : null);
    }
  };

  if (selectedOrder) {
    return (
      <BulkOrderDetails 
        order={selectedOrder} 
        onBack={handleBack}
        onStatusChange={handleStatusChange}
      />
    );
  }

  return <BulkOrderList onSelectOrder={handleSelectOrder} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
    color: colors.mainText,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    color: colors.subText,
    fontSize: 14,
  },
  memberCount: {
    color: colors.subText,
    fontSize: 14,
  },
  phoneText: {
    color: colors.subText,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholderText: {
    padding: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default BulkOrder;