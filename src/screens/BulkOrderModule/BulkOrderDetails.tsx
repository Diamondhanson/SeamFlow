import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { textVariants } from '../../theme/textVariants';
import { spacing } from '../../theme/spacing';
import { defaultStyles, themeUtils } from '../../theme';
import { BulkOrder, OrderStatus } from '../../context/clientContext';
import Header from '@/src/components/Header';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import AddBulkOrderImagesModal from '../../components/AddBulkOrderImagesModal';
import AddMeasurementAttributeModal from '../../components/AddMeasurementAttributeModal';
import { supabase } from '../../../supabaseConfig';
import { useTranslation } from '../../hooks/useTranslation';

interface Member {
  id: string;
  name: string;
  measurements: { [key: string]: number };
  notes?: string;
  bulk_order_id?: string;
}

interface BulkOrderDetailsProps {
  order: BulkOrder;
  onBack: () => void;
  onStatusChange?: (status: OrderStatus) => void;
}

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const getStatusColor = (status: OrderStatus) => {
    const statusColors = {
      registered: colors.primary,
      in_progress: colors.warning,
      testing: colors.info,
      on_pause: colors.error,
      delivered: colors.success,
    };
    return statusColors[status] || colors.textSecondary;
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
  const { t } = useTranslation();
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState<{ name: string; measurements: { [key: string]: string } }>({ name: '', measurements: {} });
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addImagesModal, setAddImagesModal] = useState({
    visible: false,
    orderId: '',
    orderName: '',
  });
  const [showAddAttributeModal, setShowAddAttributeModal] = useState(false);

  // Fetch members from Supabase
  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from('bulk_order_members')
        .select('*')
        .eq('bulk_order_id', order.id)
        .order('id', { ascending: true });
      if (error) {
        Alert.alert(t('common.error'), error.message);
        setMembers([]);
      } else {
        setMembers(data || []);
      }
      setLoadingMembers(false);
    };
    fetchMembers();
  }, [order.id, t]);

  // Example measurement attributes (replace with dynamic if available)
  const measurementAttributes = React.useMemo(() => {
    if (members.length > 0) {
      return Object.keys(members[0].measurements || {});
    }
    // fallback to some defaults
    return ['height', 'chest', 'waist'];
  }, [members]);

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

  // Add Member Logic
  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      Alert.alert(t('common.error'), t('addBulkOrder.enterMemberName'));
      return;
    }
    setAddLoading(true);
    const measurements: { [key: string]: number } = {};
    for (const attr of measurementAttributes) {
      const val = parseFloat(newMember.measurements[attr] || '0');
      measurements[attr] = isNaN(val) ? 0 : val;
    }
    const { data, error } = await supabase
      .from('bulk_order_members')
      .insert([{
        bulk_order_id: order.id,
        name: newMember.name,
        measurements,
        notes: '',
      }])
      .select()
      .single();
    setAddLoading(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
      return;
    }
    setMembers([...members, data]);
    setNewMember({ name: '', measurements: {} });
    setShowAddModal(false);
  };

  // Delete Member Logic
  const handleDeleteMember = async (id: string) => {
    setDeleteLoading(true);
    const { error } = await supabase
      .from('bulk_order_members')
      .delete()
      .eq('id', id);
    setDeleteLoading(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
      return;
    }
    setMembers(members.filter((m) => m.id !== id));
    setShowDeleteConfirm(false);
    setDeleteMemberId(null);
  };

  const handleAttributeAdded = (newAttributeName: string) => {
    // The new attribute will be available through measurementAttributes from context
    // We don't need to update existing members here
  };

  return (
    <SafeAreaWrapper>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Header title={t('bulkOrderDetails.title')} onBack={onBack} />

        <View style={styles.contentContainer}>
          {/* Order Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.sectionIconText}>📋</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('addBulkOrder.orderInformation')}</Text>
            </View>
            
            <Text style={styles.orderName}>{order.orderName}</Text>
            <StatusBadge status={order.status} />
            
            <View style={styles.infoRow}>
              <MaterialIcons name="event" size={18} color={colors.accent} />
              <Text style={styles.infoText}>{t('clientDetails.ordered')}: {order.dateOrdered}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="event" size={18} color={colors.secondary} />
              <Text style={styles.infoText}>{t('bulkOrders.delivery')}: {order.dateDelivery}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={18} color={colors.success} />
              <Text style={styles.infoText}>{order.phoneNumber}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={18} color={colors.error} />
              <Text style={styles.infoText}>{order.address}</Text>
            </View>
          </View>

          {/* Order Images Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.secondary }]}>
                <Text style={styles.sectionIconText}>📸</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('clientDetails.orderImages')}</Text>
            </View>
            
            {(order.image1Url || order.image2Url) ? (
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
            ) : (
              <TouchableOpacity
                style={styles.addImagesButton}
                onPress={() => setAddImagesModal({
                  visible: true,
                  orderId: order.id,
                  orderName: order.orderName,
                })}
              >
                <MaterialIcons name="add-a-photo" size={24} color={colors.primary} />
                <Text style={styles.addImagesButtonText}>{t('clientDetails.addImages')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Members Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}>
                <Text style={styles.sectionIconText}>👥</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('addBulkOrder.membersCount', { count: members.length })}</Text>
              <TouchableOpacity 
                onPress={() => setShowAddAttributeModal(true)} 
                style={{ marginLeft: 8, backgroundColor: colors.surface, borderRadius: 8, padding: 8 }}
              >
                <MaterialIcons name="straighten" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddModal(true)} style={{ marginLeft: 8 }}>
                <MaterialIcons name="person-add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            {loadingMembers ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.subText, marginTop: 8 }}>{t('bulkOrderDetails.loadingMembers')}</Text>
              </View>
            ) : (
              members.map((member) => (
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => {
                          setDeleteMemberId(member.id);
                          setShowDeleteConfirm(true);
                        }}
                        style={{ marginRight: 8 }}
                        disabled={deleteLoading}
                      >
                        <MaterialIcons name="delete" size={22} color={colors.error} />
                      </TouchableOpacity>
                      <MaterialIcons 
                        name={expandedMemberId === member.id ? "expand-less" : "expand-more"} 
                        size={24} 
                        color={colors.text} 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {expandedMemberId === member.id && (
                    renderMeasurements(member.measurements)
                  )}
                </View>
              ))
            )}
          </View>

          {/* Order Notes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.warning }]}>
                <Text style={styles.sectionIconText}>📝</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('addBulkOrder.orderNotes')}</Text>
            </View>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{order.notes || t('bulkOrderDetails.noNotes')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalTitle}>{t('addBulkOrder.addMember')}</Text>
            <TextInput
              style={modalStyles.input}
              placeholder={t('addBulkOrder.memberName')}
              value={newMember.name}
              onChangeText={text => setNewMember(prev => ({ ...prev, name: text }))}
              placeholderTextColor={colors.subText}
              editable={!addLoading}
            />
            <Text style={modalStyles.measurementsTitle}>{t('newOrder.measurements')}</Text>
            {measurementAttributes.map(attr => (
              <View key={attr} style={modalStyles.measurementRow}>
                <Text style={modalStyles.measurementLabel}>{attr.charAt(0).toUpperCase() + attr.slice(1)}</Text>
                <TextInput
                  style={modalStyles.measurementInput}
                  placeholder="0.00"
                  value={newMember.measurements[attr] || ''}
                  onChangeText={text => setNewMember(prev => ({ ...prev, measurements: { ...prev.measurements, [attr]: text } }))}
                  keyboardType="numeric"
                  placeholderTextColor={colors.subText}
                  editable={!addLoading}
                />
              </View>
            ))}
            <View style={modalStyles.buttonRow}>
              <TouchableOpacity style={modalStyles.cancelButton} onPress={() => setShowAddModal(false)} disabled={addLoading}>
                <Text style={modalStyles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.addButton} onPress={handleAddMember} disabled={addLoading}>
                {addLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modalStyles.addButtonText}>{t('common.add')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.confirmContainer}>
            <Text style={modalStyles.confirmTitle}>{t('bulkOrderDetails.deleteMember')}</Text>
            <Text style={modalStyles.confirmText}>{t('bulkOrderDetails.confirmDeleteMember')}</Text>
            <View style={modalStyles.buttonRow}>
              <TouchableOpacity style={modalStyles.cancelButton} onPress={() => setShowDeleteConfirm(false)} disabled={deleteLoading}>
                <Text style={modalStyles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.deleteButton} onPress={() => handleDeleteMember(deleteMemberId!)} disabled={deleteLoading}>
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modalStyles.deleteButtonText}>{t('common.delete')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Images Modal */}
      <AddBulkOrderImagesModal
        visible={addImagesModal.visible}
        onClose={() => setAddImagesModal({ visible: false, orderId: '', orderName: '' })}
        orderId={addImagesModal.orderId}
        orderName={addImagesModal.orderName}
      />
      
      {/* Add Measurement Attribute Modal */}
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
    flexGrow: 1,
  },
  contentContainer: {
    paddingHorizontal: Dimensions.get('window').width >= 768 ? spacing.pageTablet : spacing.page,
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
    fontSize: textVariants.H6.fontSize,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
    flex: 1,
  },
  orderName: {
    fontSize: textVariants.H5.fontSize,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.m,
    letterSpacing: 0.3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.l,
    marginBottom: spacing.m,
  },
  statusText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
    gap: spacing.s,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: textVariants.body2.fontSize,
  },
  memberCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.m,
    marginBottom: spacing.m,
    overflow: 'hidden',
    ...themeUtils.getElevation('xs'),
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.m,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: textVariants.body1.fontSize,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.1,
  },
  memberNotes: {
    fontSize: textVariants.body2.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  measurementsContainer: {
    padding: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  measurementLabel: {
    color: colors.textSecondary,
    fontSize: textVariants.body2.fontSize,
  },
  measurementValue: {
    color: colors.text,
    fontSize: textVariants.body2.fontSize,
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.m,
    padding: spacing.m,
    ...themeUtils.getElevation('xs'),
  },
  notesText: {
    color: colors.text,
    fontSize: textVariants.body2.fontSize,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  orderImagesContainer: {
    flexDirection: 'row',
    gap: spacing.m,
    flexWrap: 'wrap',
  },
  orderImage: {
    width: 150,
    height: 112,
    borderRadius: spacing.borderRadius.m,
    backgroundColor: colors.surface,
    ...themeUtils.getElevation('xs'),
  },
  addImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: spacing.borderRadius.m,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.l,
    gap: spacing.s,
    ...themeUtils.getElevation('xs'),
  },
  addImagesButtonText: {
    fontSize: textVariants.body1.fontSize,
    color: colors.primary,
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'stretch',
    ...themeUtils.getElevation('m'),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.mainText,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.mainText,
    marginBottom: 16,
  },
  measurementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mainText,
    marginBottom: 8,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  measurementLabel: {
    flex: 1,
    color: colors.subText,
    fontSize: 15,
  },
  measurementInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 15,
    color: colors.mainText,
    textAlign: 'right',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 8,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  confirmContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
    ...themeUtils.getElevation('m'),
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 15,
    color: colors.mainText,
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default BulkOrderDetails;
