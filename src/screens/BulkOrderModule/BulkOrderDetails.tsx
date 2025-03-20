import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { textVariants } from '../../theme/textVariants';
import { BulkOrder, OrderStatus } from '../../context/clientContext';
import Header from '@/src/components/Header';
import { theme } from '@/src/theme';

interface BulkOrderDetailsProps {
  order: BulkOrder;
  onBack: () => void;
  onStatusChange?: (status: OrderStatus) => void;
}

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      registered: theme.colors.primary,
      in_progress: '#f1c40f',
      testing: '#e67e22',
      on_pause: '#e74c3c',
      delivered: '#2ecc71',
    };
    return colors[status] || '#95a5a6';
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
      <Text style={styles.statusText}>
        {status.replace('_', ' ').toUpperCase()}
      </Text>
    </View>
  );
};

const BulkOrderDetails = ({ order, onBack, onStatusChange }: BulkOrderDetailsProps) => {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId);
  };

  const renderMeasurements = (measurements: { [key: string]: number }) => {
    return (
      <View style={styles.measurementsContainer}>
        {Object.entries(measurements).map(([key, value]) => (
          <View key={key} style={styles.measurementRow}>
            <Text style={styles.measurementLabel}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
            <Text style={styles.measurementValue}>{value}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      
      <Header title="Order Details" onBack={onBack} />

      <View style={styles.orderInfoSection}>
        <Text style={styles.orderName}>{order.orderName}</Text>
        <StatusBadge status={order.status} />
        
        <View style={styles.infoRow}>
          <MaterialIcons name="event" size={18} color={colors.subText} />
          <Text style={styles.infoText}>Ordered: {order.dateOrdered}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="event" size={18} color={colors.subText} />
          <Text style={styles.infoText}>Delivery: {order.dateDelivery}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="phone" size={18} color={colors.subText} />
          <Text style={styles.infoText}>{order.phoneNumber}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="location-on" size={18} color={colors.subText} />
          <Text style={styles.infoText}>{order.address}</Text>
        </View>
      </View>

      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>Members ({order.members.length})</Text>
        {order.members.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <TouchableOpacity 
              style={styles.memberHeader}
              onPress={() => toggleMemberExpansion(member.id)}
            >
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.notes && (
                  <Text style={styles.memberNotes} numberOfLines={1}>
                    {member.notes}
                  </Text>
                )}
              </View>
              <MaterialIcons 
                name={expandedMemberId === member.id ? "expand-less" : "expand-more"} 
                size={24} 
                color={colors.mainText} 
              />
            </TouchableOpacity>
            
            {expandedMemberId === member.id && (
              renderMeasurements(member.measurements)
            )}
          </View>
        ))}
      </View>

      {/* {order.notes && ( */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Order Notes</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        </View>
      {/* )} */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: 'bold',
    color: colors.mainText,
  },
  orderInfoSection: {
    padding: 16,
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  orderName: {
    fontSize: textVariants.H5.fontSize,
    fontWeight: 'bold',
    color: colors.mainText,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    color: colors.subText,
    fontSize: textVariants.body2.fontSize,
  },
  membersSection: {
    padding: 16,
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: 'bold',
    color: colors.mainText,
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: textVariants.body1.fontSize,
    fontWeight: '500',
    color: colors.mainText,
  },
  memberNotes: {
    fontSize: textVariants.body2.fontSize,
    color: colors.subText,
    marginTop: 4,
  },
  measurementsContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  measurementLabel: {
    color: colors.subText,
    fontSize: textVariants.body2.fontSize,
  },
  measurementValue: {
    color: colors.mainText,
    fontSize: textVariants.body2.fontSize,
    fontWeight: '500',
  },
  notesSection: {
    padding: 16,
    backgroundColor: colors.background,
  },
  notesCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
  },
  notesText: {
    color: colors.mainText,
    fontSize: textVariants.body2.fontSize,
    lineHeight: 20,
  },
});

export default BulkOrderDetails;
