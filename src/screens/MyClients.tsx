import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, FlatList, Pressable, TouchableOpacity, TextInput, Platform, Dimensions, ScrollView } from 'react-native';
import { Client, useClients } from '../context/clientContext';
import { colors } from '../theme/colors';
import { useNavigation } from "@react-navigation/native";
import ClientDetails from '../components/clientDetails';
import Icons from "react-native-vector-icons/FontAwesome5";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Header from '../components/Header';

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

// Approximate width of each month tile including margin
const MONTH_TILE_WIDTH = 70;

const MyClients = () => {
  const navigation = useNavigation();
  const { clients } = useClients();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const monthScrollRef = useRef<ScrollView>(null);

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
          // Calculate approximate scroll position based on index
          const screenWidth = Dimensions.get('window').width;
          const visibleMonths = Math.floor((screenWidth * 0.95) / MONTH_TILE_WIDTH);
          
          // Determine the best position to scroll to
          let scrollToIndex = index;
          
          // If near the beginning, show from beginning
          if (index < 2) {
            scrollToIndex = 0;
          } 
          // If near the end, show the end
          else if (index > MONTHS.length - 3) {
            scrollToIndex = Math.max(0, MONTHS.length - visibleMonths);
          } 
          // Otherwise, center the selected month
          else {
            scrollToIndex = Math.max(0, index - Math.floor(visibleMonths / 2));
          }
          
          // Scroll to the calculated position
          monthScrollRef.current.scrollTo({
            x: scrollToIndex * MONTH_TILE_WIDTH,
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
    >
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.fullName}</Text>
        <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
      </View>
      <View style={styles.orderCount}>
        <Text style={styles.orderCountText}>
          {item.orders.length} {item.orders.length === 1 ? 'order' : 'orders'}
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
          title="My Clients" 
          onBack={() => navigation.goBack()} 
        />
        
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Icons name="search" size={20} color={colors.subText} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients by name..."
            placeholderTextColor={colors.subText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Icons name="times-circle" size={20} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Month Tiles */}
        <View style={styles.monthsContainerWrapper}>
          <Text style={styles.monthLabel}>Search by delivery month</Text>
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
              >
                <Icons name="times-circle" size={16} color={colors.subText} />
                <Text style={styles.clearMonthText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <FlatList
          data={filteredClients}
          renderItem={renderClient}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('NewOrder')}
        >
          <Icons name="plus" size={24} color="white" />
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
  title: {
    marginBottom: 20,
    color: colors.mainText,
  },
  listContainer: {
    gap: 5,
  },
  clientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.mainText,
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: colors.subText,
  },
  orderCount: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderCountText: {
    fontSize: 12,
    color: colors.mainText,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    height: 48,
    marginTop: 16,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.mainText,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  monthsContainerWrapper: {
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "95%",
    alignSelf: "center",
    marginBottom: 16,
  },
  monthLabel: {
    color: colors.subText,
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  monthFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthsContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  monthTile: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  selectedMonthTile: {
    backgroundColor: colors.primary,
  },
  monthText: {
    color: colors.subText,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedMonthText: {
    color: colors.mainText,
  },
  clearMonthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  clearMonthText: {
    color: colors.subText,
    fontSize: 12,
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: colors.primary,
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
    // Adjust position for tablet layout
    right: Platform.OS === "android" && Dimensions.get("window").width >= 768 
      ? '15%' 
      : 16,
  },
});

export default MyClients; 