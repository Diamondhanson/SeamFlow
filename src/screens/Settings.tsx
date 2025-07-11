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
  const { logout, user, companyInfo, updateCompanyInfo, hasPinSet, removePin, hasSecurityQuestions } = useApp();
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
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleSetupPin = () => {
    navigation.navigate('PinSetup' as never);
  };

  const handleChangePin = () => {
    // First verify current PIN before allowing change
    (navigation as any).navigate('PinEntry', { mode: 'change' });
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove PIN',
      'Are you sure you want to remove your PIN? This will make your app less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await removePin();
              Alert.alert('Success', 'PIN has been removed successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove PIN. Please try again.');
            }
          }
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

      <View style={styles.content}>
        {/* Profile Section */}
        <View style={[styles.section, styles.profileSection]}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
              <Icons name="user-circle" size={20} color={colors.textOnPrimary} />
            </View>
        <Text style={styles.sectionTitle}>Company Profile</Text>
          </View>
        
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoContainer} onPress={pickImage} disabled={isLoading}>
            {isLoading ? (
                <ActivityIndicator size="large" color={colors.textOnPrimary} />
            ) : companyInfo.logo ? (
              <Image source={{ uri: companyInfo.logo }} style={styles.logo} />
            ) : (
              <>
                  <Icons name="camera" size={32} color={colors.textOnPrimary} />
                <Text style={styles.logoText}>Add Logo</Text>
              </>
            )}
          </TouchableOpacity>
            <Text style={styles.logoHint}>Tap to update company logo</Text>
        </View>

        <View style={styles.companyNameSection}>
          {isEditing ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.nameInput}
                value={newCompanyName}
                onChangeText={setNewCompanyName}
                placeholder="Enter company name"
                  placeholderTextColor={colors.textSecondary}
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
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleUpdateCompanyName}
                  disabled={isLoading}
                >
                    <Text style={styles.saveButtonText}>
                    {isLoading ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
              <View style={styles.nameDisplayContainer}>
                <View style={styles.nameInfo}>
                  <Text style={styles.nameLabel}>Company Name</Text>
              <Text style={styles.companyName}>{companyInfo.name}</Text>
                </View>
              <TouchableOpacity 
                style={styles.editNameButton}
                onPress={() => setIsEditing(true)}
              >
                  <Icons name="edit" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

        {/* Account Section */}
        <View style={[styles.section, styles.accountSection]}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.secondary }]}>
              <Icons name="id-card" size={20} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.sectionTitle}>Account Information</Text>
          </View>
          
          <View style={styles.accountInfo}>
            <Icons name="envelope" size={16} color={colors.textSecondary} />
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>
        </View>

        {/* Customization Section */}
        <View style={[styles.section, styles.customizationSection]}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.accent }]}>
              <Icons name="palette" size={20} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.sectionTitle}>Customization</Text>
      </View>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigation.navigate('ChangeMeasurementAttributes' as never)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.info }]}>
              <Icons name="ruler-combined" size={16} color={colors.textOnPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>Customize Measurements</Text>
              <Text style={styles.menuItemSubtext}>Configure measurement attributes</Text>
            </View>
            <Icons name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Security Section */}
        <View style={[styles.section, styles.securitySection]}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.warning }]}>
              <Icons name="shield-alt" size={20} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.sectionTitle}>Security & Privacy</Text>
      </View>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={hasPinSet ? handleRemovePin : handleSetupPin}
          >
            <View style={[
              styles.menuIconContainer, 
              { backgroundColor: hasPinSet ? colors.success : colors.warning }
            ]}>
              <Icons 
                name={hasPinSet ? "lock" : "lock-open"} 
                size={16} 
                color={colors.textOnPrimary} 
              />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>
                {hasPinSet ? 'PIN Protection Active' : 'Set Up PIN Protection'}
              </Text>
              <Text style={styles.menuItemSubtext}>
                {hasPinSet ? 'Tap to manage or remove PIN' : 'Secure your app with a 4-digit PIN'}
              </Text>
            </View>
            <Icons name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {hasPinSet && (
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleChangePin}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.primary }]}>
                <Icons name="key" size={16} color={colors.textOnPrimary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Change PIN</Text>
                <Text style={styles.menuItemSubtext}>Update your security PIN</Text>
              </View>
              <Icons name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigation.navigate('SecurityQuestionsSetup' as never)}
          >
            <View style={[
              styles.menuIconContainer, 
              { backgroundColor: hasSecurityQuestions ? colors.success : colors.info }
            ]}>
              <Icons 
                name="question-circle" 
                size={16} 
                color={colors.textOnPrimary} 
              />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>
                {hasSecurityQuestions ? 'Security Questions Set' : 'Set Up Security Questions'}
              </Text>
              <Text style={styles.menuItemSubtext}>
                {hasSecurityQuestions ? 'Update your security questions' : 'Help recover your PIN if forgotten'}
              </Text>
            </View>
            <Icons name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {hasPinSet && (
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => navigation.navigate('PinRecovery' as never)}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.warning }]}>
                <Icons name="unlock-alt" size={16} color={colors.textOnPrimary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>PIN Recovery</Text>
                <Text style={styles.menuItemSubtext}>Reset your PIN if forgotten</Text>
              </View>
              <Icons name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Logout Section */}
        <View style={[styles.section, styles.logoutSection]}>
        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutButton]} 
          onPress={handleLogout}
        >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.error }]}>
              <Icons name="sign-out-alt" size={16} color={colors.textOnPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, styles.logoutText]}>Sign Out</Text>
              <Text style={[styles.menuItemSubtext, styles.logoutSubtext]}>
                Sign out of your account
              </Text>
            </View>
        </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff15',
  },
  profileSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  accountSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  customizationSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  securitySection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  logoutSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: textVariants.H3.fontSize,
    color: colors.mainText,
    marginLeft: 10,
    fontWeight: '500',
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    color: colors.textOnPrimary,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  logoHint: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  companyNameSection: {
    marginTop: 20,
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff10',
    padding: 12,
    borderRadius: 8,
  },
  nameInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  nameLabel: {
    fontSize: 16,
    color: colors.accentDark,
    fontWeight: '500',
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
  cancelButtonText: {
    color: colors.mainText,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15,
  },
  userEmail: {
    fontSize: 16,
    color: colors.subText,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.mainText,
    flex: 1,
  },
  menuItemSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  logoutButton: {
    marginTop: 20,
  },
  logoutText: {
    color: colors.error,
  },
  logoutSubtext: {
    color: colors.subText,
  },
});

export default Settings; 