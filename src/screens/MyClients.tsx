import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text,  FlatList, Pressable, TouchableOpacity, TextInput, Platform, Dimensions } from 'react-native';
import { Client, useClients } from '../context/clientContext';
import { colors } from '../theme/colors';
import { useNavigation } from "@react-navigation/native";
import ClientDetails from '../components/clientDetails';
import Icons from "react-native-vector-icons/FontAwesome5";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Header from '../components/Header';

const MyClients = () => {
  const navigation = useNavigation();
  const { clients } = useClients();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      client.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);

  const handleClientPress = (client: Client) => {
    setSelectedClient(client);
  };

  const handleBack = () => {
    setSelectedClient(null);
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
        
        <FlatList
          data={filteredClients}
          renderItem={renderClient}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
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
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
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
    marginBottom: 16,
    height: 48,
    marginTop: 16,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
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
});

export default MyClients; 