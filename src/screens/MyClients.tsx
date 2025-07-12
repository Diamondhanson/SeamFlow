import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, FlatList, Pressable, TouchableOpacity, TextInput, Platform, Dimensions, ScrollView } from 'react-native';
import { Client, useClients } from '../context/clientContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { defaultStyles, themeUtils } from '../theme';
import { useNavigation } from "@react-navigation/native";
import ClientDetails from '../components/clientDetails';
import Icons from "react-native-vector-icons/FontAwesome5";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Header from '../components/Header';
import { useTranslation } from '../hooks/useTranslation';

const MONTHS = [
  { name: 'JAN', value: '01' },
  { name: 'FEB', value: '02' },
  { name: 'MAR', value: '03' },
  { name: 'APR', value: '04' },
  { name: 'MAY', value: '05' },
  { name: 'JUN', value: '06' },
  { name: 'JUL', value: '07' },
  { name: 'AUG', value: '08' },
  { name: 'SEP', value: '09' },
  { name: 'OCT', value: '10' },
  { name: 'NOV', value: '11' },
  { name: 'DEC', value: '12' },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;

const MyClients = () => {
  const navigation = useNavigation();
  const { clients } = useClients();
  const { t } = useTranslation();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const [dimensions, setDimensions] = useState({ 
    window: Dimensions.get('window') 
  });

  // Responsive calculations
  const { width } = dimensions.window;
  const isTabletLayout = width >= 768;
  const containerPadding = isTabletLayout ? spacing.pageTablet : spacing.page;

  // Filter clients based on search query and selected month
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Filter by name
      const nameMatch = client.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by month if a month is selected
      if (selectedMonth) {
        // Check if any order's delivery date matches the selected month
        const hasOrderInMonth = client.orders.some(order => {
          // Extract month from delivery date (format: YYYY-MM-DD)
          const orderMonth = order.dateDelivery.split('-')[1];
          return orderMonth === selectedMonth;
        });
        
        return nameMatch && hasOrderInMonth;
      }
      
      // If no month selected, just filter by name
      return nameMatch;
    });
  }, [clients, searchQuery, selectedMonth]);

  const handleClientPress = (client: Client) => {
    setSelectedClient(client);
  };

  const handleBack = () => {
    setSelectedClient(null);
  };

  const handleMonthPress = (monthValue: string, index: number) => {
    // Handle month selection/deselection
    if (selectedMonth === monthValue) {
      setSelectedMonth(null);
    } else {
      setSelectedMonth(monthValue);
      
      // Handle scrolling - delay slightly to ensure UI updates first
      setTimeout(() => {
        if (monthScrollRef.current) {
          const scrollToX = Math.max(0, (index - 2) * 60);
          monthScrollRef.current.scrollTo({
            x: scrollToX,
            animated: true
          });
        }
      }, 100);
    }
  };

  if (selectedClient) {
    return (
      <ClientDetails
        client={selectedClient}
        onBack={handleBack}
      />
    );
  }

  const renderClient = ({ item }: { item: Client }) => (
    <TouchableOpacity 
      style={styles.clientCard}
      onPress={() => handleClientPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.fullName}</Text>
        <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
      </View>
      <View style={styles.orderBadge}>
        <Text style={styles.orderCountText}>
          {item.orders.length}
        </Text>
        <Text style={styles.orderLabel}>
          {item.orders.length === 1 ? t('myClients.order') : t('myClients.orders')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMonthTile = (month: { name: string; value: string }, index: number) => (
    <TouchableOpacity
      key={month.value}
      style={[
        styles.monthTile,
        selectedMonth === month.value && styles.selectedMonthTile
      ]}
      onPress={() => handleMonthPress(month.value, index)}
      activeOpacity={0.8}
    >
      <Text 
        style={[
          styles.monthText,
          selectedMonth === month.value && styles.selectedMonthText
        ]}
      >
        {month.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <Header 
          title={t('navigation.myClients')} 
          onBack={() => navigation.goBack()} 
        />
        
        {/* Content Container */}
        <View style={[
          styles.contentContainer,
          { paddingHorizontal: containerPadding }
        ]}>
          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Icons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('myClients.searchClients')}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                  activeOpacity={0.7}
                >
                  <Icons name="times-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Month Filter Section */}
          <View style={styles.monthFilterSection}>
            <Text style={styles.sectionLabel}>{t('myClients.filterByMonth')}</Text>
            <View style={styles.monthFilterContainer}>
              <ScrollView 
                ref={monthScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthsContainer}
              >
                {MONTHS.map((month, index) => renderMonthTile(month, index))}
              </ScrollView>
              {selectedMonth && (
                <TouchableOpacity 
                  onPress={() => setSelectedMonth(null)}
                  style={styles.clearMonthButton}
                  activeOpacity={0.7}
                >
                  <Icons name="times" size={12} color={colors.textSecondary} />
                  <Text style={styles.clearMonthText}>{t('common.clear')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Clients List */}
          <View style={styles.listSection}>
            {filteredClients.length > 0 ? (
              <FlatList
                data={filteredClients}
                renderItem={renderClient}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Icons name="users" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateTitle}>{t('myClients.noClientsFound')}</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {searchQuery || selectedMonth 
                    ? t('myClients.adjustFilters') 
                    : t('myClients.createFirstOrder')
                  }
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => (navigation as any).navigate('NewOrder')}
          activeOpacity={0.8}
        >
          <Icons name="plus" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    paddingTop: spacing.m,
  },
  
  // Search Section
  searchSection: {
    marginBottom: spacing.l,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.m,
    paddingHorizontal: spacing.m,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  searchIcon: {
    marginRight: spacing.s,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  clearButton: {
    padding: spacing.xs,
  },
  
  // Month Filter Section
  monthFilterSection: {
    marginBottom: spacing.section,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.s,
    letterSpacing: 0.2,
  },
  monthFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthsContainer: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    gap: spacing.s,
  },
  monthTile: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: spacing.borderRadius.l,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    minWidth: 52,
    ...themeUtils.getElevation('xs'),
  },
  selectedMonthTile: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  selectedMonthText: {
    color: colors.textOnPrimary,
  },
  clearMonthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.m,
    marginLeft: spacing.s,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  clearMonthText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  
  // List Section
  listSection: {
    flex: 1,
  },
  listContainer: {
    gap: spacing.cardGap,
    paddingBottom: spacing.xl + 56, // Extra padding for FAB
  },
  clientCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    padding: spacing.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  clientInfo: {
    flex: 1,
    marginRight: spacing.m,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  phoneNumber: {
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  orderBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.m,
    alignItems: 'center',
    minWidth: 48,
  },
  orderCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
    lineHeight: 18,
  },
  orderLabel: {
    fontSize: 10,
    color: colors.textOnPrimary,
    opacity: 0.9,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.m,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: spacing.m,
    right: isTablet ? spacing.pageTablet : spacing.page,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...themeUtils.getElevation('m'),
  },
});

export default MyClients; 