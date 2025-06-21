import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import Icons from "react-native-vector-icons/FontAwesome5";
import { useApp } from '../context/AppContext';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Header from '../components/Header';

const Settings = () => {
  const { logout, user, companyInfo, updateCompanyInfo } = useApp();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState(companyInfo.name);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        setIsLoading(true);
        await updateCompanyInfo({
          ...companyInfo,
          logo: result.assets[0].uri,
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update logo. Please try again.');
      setIsLoading(false);
    }
  };

  const handleUpdateCompanyName = async () => {
    if (newCompanyName.trim() === '') {
      Alert.alert('Error', 'Company name cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      await updateCompanyInfo({
        ...companyInfo,
        name: newCompanyName.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating company name:', error);
      Alert.alert('Error', 'Failed to update company name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await logout();
              (navigation as any).navigate('Welcome');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Header 
        title="Settings" 
        onBack={() => (navigation as any).navigate('Home')}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Profile</Text>
        
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoContainer} onPress={pickImage} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.mainText} />
            ) : companyInfo.logo ? (
              <Image source={{ uri: companyInfo.logo }} style={styles.logo} />
            ) : (
              <>
                <Icons name="image" size={40} color={colors.mainText} />
                <Text style={styles.logoText}>Add Logo</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.logoHint}>Tap to change logo</Text>
        </View>

        <View style={styles.companyNameSection}>
          {isEditing ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.nameInput}
                value={newCompanyName}
                onChangeText={setNewCompanyName}
                placeholder="Enter company name"
                placeholderTextColor={colors.subText}
              />
              <View style={styles.editButtonsRow}>
                <TouchableOpacity 
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={() => {
                    setIsEditing(false);
                    setNewCompanyName(companyInfo.name);
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.editButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleUpdateCompanyName}
                  disabled={isLoading}
                >
                  <Text style={styles.editButtonText}>
                    {isLoading ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameContainer}>
              <Text style={styles.companyName}>{companyInfo.name}</Text>
              <TouchableOpacity 
                style={styles.editNameButton}
                onPress={() => setIsEditing(true)}
              >
                <Icons name="edit" size={16} color={colors.mainText} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutButton]} 
          onPress={handleLogout}
        >
          <Icons name="sign-out-alt" size={20} color={colors.error} />
          <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff15',
  },
  sectionTitle: {
    fontSize: textVariants.H3.fontSize,
    color: colors.mainText,
    marginBottom: 15,
    fontWeight: '500',
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    color: colors.mainText,
    marginTop: 8,
    fontSize: 14,
  },
  logoHint: {
    color: colors.subText,
    marginTop: 8,
    fontSize: 12,
  },
  companyNameSection: {
    marginTop: 20,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff10',
    padding: 12,
    borderRadius: 8,
  },
  companyName: {
    fontSize: 18,
    color: colors.mainText,
    fontWeight: '500',
  },
  editNameButton: {
    padding: 8,
  },
  editNameContainer: {
    gap: 12,
  },
  nameInput: {
    backgroundColor: '#ffffff15',
    borderRadius: 8,
    padding: 12,
    color: colors.mainText,
    fontSize: 16,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ffffff15',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  editButtonText: {
    color: colors.mainText,
    fontSize: 14,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 16,
    color: colors.subText,
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.mainText,
    flex: 1,
  },
  logoutButton: {
    marginTop: 20,
  },
  logoutText: {
    color: colors.error,
  },
});

export default Settings; 