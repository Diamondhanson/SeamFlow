import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text,  FlatList, Pressable, TouchableOpacity, TextInput } from 'react-native';
import { Client, useClients } from '../context/clientContext';
import { colors } from '../theme/colors';
import { useNavigation } from "@react-navigation/native";
import ClientDetails from '../components/clientDetails';
import Icons from "react-native-vector-icons/FontAwesome5";
import SafeAreaWrapper from '../components/SafeAreaWrapper';

const MyClients = () => {
  const navigation = useNavigation();
  const { clients } = useClients();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      client.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);

  const handleClientPress = (client: Client) => {
    // console.log('Selected client:', client);
    setSelectedClient(client);
    setModalVisible(true);
  };

  const handleAddNewOrder = (clientId: string) => {
    setModalVisible(false);
    // Navigate to NewOrder screen with client ID
    navigation.navigate('NewOrder', { clientId });
  };

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

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>My Clients</Text>
        
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
        
        <FlatList
          data={filteredClients}
          renderItem={renderClient}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />

        <ClientDetails
          client={selectedClient}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onAddNewOrder={handleAddNewOrder}
        />
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    marginBottom: 20,
    color: colors.mainText,
  },
  listContainer: {
    gap: 16,
  },
  clientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: colors.mainText,
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
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
});

export default MyClients; 