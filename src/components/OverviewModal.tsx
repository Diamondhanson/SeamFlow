import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Icons from 'react-native-vector-icons/FontAwesome5';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';
import { supabase } from '@/supabaseConfig';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

interface Order {
  id: string;
  client_name: string;  // This will be populated differently for simple vs bulk
  order_name?: string;  // For reference
  date_delivery: string;
  total_cost?: number;
  price?: number;  // Alternative field name
  status?: string;
  type: 'simple' | 'bulk';
}

interface OverviewModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'active' | 'week' | 'today';
}

const OverviewModal: React.FC<OverviewModalProps> = ({
  visible,
  onClose,
  initialTab = 'active'
}) => {
  const { user } = useApp();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'active' | 'week' | 'today'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<{
    active: Order[];
    week: Order[];
    today: Order[];
  }>({
    active: [],
    week: [],
    today: []
  });

  useEffect(() => {
    if (visible && user) {
      setActiveTab(initialTab);
      fetchOrderDetails();
    }
  }, [visible, user, initialTab]);

  const fetchOrderDetails = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get date ranges
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Fetch simple orders with client details (need to join with clients table)
      const { data: simpleOrders, error: simpleError } = await supabase
        .from('orders')
        .select(`
          id, 
          date_delivery, 
          price, 
          status,
          order_name,
          clients!inner(full_name)
        `)
        .eq('user_id', user.id);

      // Fetch bulk orders with details (they store order_name directly)
      const { data: bulkOrders, error: bulkError } = await supabase
        .from('bulk_orders')
        .select('id, order_name, date_delivery, price, status')
        .eq('user_id', user.id);

      if (simpleError) {
        console.error('Modal: Simple orders error:', simpleError);
        throw simpleError;
      }
      
      if (bulkError) {
        console.error('Modal: Bulk orders error:', bulkError);
        throw bulkError;
      }

      // Combine and categorize orders
      const allOrders: Order[] = [
        // Simple orders (with client join)
        ...(simpleOrders || []).map(order => ({
          id: order.id,
          client_name: (order.clients as any)?.full_name || t('overviewModal.unknownClient'),
          order_name: order.order_name,
          date_delivery: order.date_delivery,
          total_cost: order.price,
          price: order.price,
          status: order.status,
          type: 'simple' as const
        })),
        // Bulk orders (use order_name as display name)
        ...(bulkOrders || []).map(order => ({
          id: order.id,
          client_name: order.order_name || t('overviewModal.bulkOrder'),
          order_name: order.order_name,
          date_delivery: order.date_delivery,
          total_cost: order.price,
          price: order.price,
          status: order.status,
          type: 'bulk' as const
        }))
      ];

      // Filter active orders (exclude completed and delivered orders)
      const activeOrders = allOrders.filter(order => 
        order.status && !['completed', 'delivered', 'cancelled'].includes(order.status)
      );
      
      const weekOrders = allOrders.filter(order => 
        order.date_delivery >= weekStartStr && order.date_delivery <= weekEndStr
      );
      
      const todayOrders = allOrders.filter(order => 
        order.date_delivery === todayStr
      );

      setOrders({
        active: activeOrders,
        week: weekOrders,
        today: todayOrders
      });
    } catch (error) {
      console.error('Modal: Error fetching order details:', error);
      setOrders({
        active: [],
        week: [],
        today: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return `$${amount.toFixed(2)}`;
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.clientName}>
            {item.type === 'simple' ? item.client_name : item.order_name}
          </Text>
          {item.type === 'simple' && item.order_name && (
            <Text style={styles.orderNameSubtitle}>{item.order_name}</Text>
          )}
          <View style={styles.orderMeta}>
            <View style={[styles.typeTag, item.type === 'bulk' ? styles.bulkTag : styles.simpleTag]}>
              <Text style={styles.typeText}>
                {item.type === 'bulk' ? t('overviewModal.bulk') : t('overviewModal.order')}
              </Text>
            </View>
            {item.status && (
              <View style={[styles.statusTag, getStatusStyle(item.status)]}>
                <Text style={[styles.statusText, getStatusTextStyle(item.status)]}>
                  {item.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.orderId}>#{item.id.slice(-6)}</Text>
          </View>
        </View>
        <View style={styles.orderDetails}>
          <Text style={styles.deliveryDate}>{formatDate(item.date_delivery)}</Text>
          <Text style={styles.totalCost}>{formatCurrency(item.total_cost || item.price)}</Text>
        </View>
      </View>
    </View>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'registered':
        return { backgroundColor: colors.info + '20', borderColor: colors.info };
      case 'in_progress':
        return { backgroundColor: colors.warning + '20', borderColor: colors.warning };
      case 'testing':
        return { backgroundColor: colors.accent + '20', borderColor: colors.accent };
      case 'on_pause':
        return { backgroundColor: colors.textSecondary + '20', borderColor: colors.textSecondary };
      case 'completed':
        return { backgroundColor: colors.success + '20', borderColor: colors.success };
      case 'delivered':
        return { backgroundColor: colors.primary + '20', borderColor: colors.primary };
      case 'cancelled':
        return { backgroundColor: colors.error + '20', borderColor: colors.error };
      default:
        return { backgroundColor: colors.surface, borderColor: colors.border };
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'registered':
        return { color: colors.info };
      case 'in_progress':
        return { color: colors.warning };
      case 'testing':
        return { color: colors.accent };
      case 'on_pause':
        return { color: colors.textSecondary };
      case 'completed':
        return { color: colors.success };
      case 'delivered':
        return { color: colors.primary };
      case 'cancelled':
        return { color: colors.error };
      default:
        return { color: colors.text };
    }
  };

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Icons name="calendar-times" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>{t('overviewModal.noOrdersFound')}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('overviewModal.loading')}</Text>
        </View>
      );
    }

    const currentOrders = orders[activeTab];
    
    if (currentOrders.length === 0) {
      const messages = {
        active: t('overviewModal.noActiveOrders'),
        week: t('overviewModal.noWeekOrders'),
        today: t('overviewModal.noTodayOrders')
      };
      return renderEmptyState(messages[activeTab]);
    }

    return (
      <FlatList
        data={currentOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const tabs = [
    { key: 'active', label: t('overviewModal.activeOrders'), count: orders.active.length },
    { key: 'week', label: t('overviewModal.thisWeek'), count: orders.week.length },
    { key: 'today', label: t('overviewModal.today'), count: orders.today.length },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('overviewModal.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icons name="times" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
              <View style={[
                styles.countBadge,
                activeTab === tab.key && styles.activeCountBadge
              ]}>
                <Text style={[
                  styles.countText,
                  activeTab === tab.key && styles.activeCountText
                ]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderTabContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.round,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.page,
    paddingTop: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  activeTabText: {
    color: colors.primary,
  },
  countBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.round,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeCountBadge: {
    backgroundColor: colors.primary,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeCountText: {
    color: colors.textOnPrimary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.m,
    fontSize: 16,
    color: colors.textSecondary,
  },
  ordersList: {
    padding: spacing.page,
  },
  orderItem: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  orderNameSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeTag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.s,
    marginRight: spacing.xs,
  },
  statusTag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.s,
    marginRight: spacing.xs,
    borderWidth: 1,
  },
  simpleTag: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  bulkTag: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  deliveryDate: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  totalCost: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.m,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default OverviewModal; 