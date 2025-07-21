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
  Modal,
} from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import Icons from "react-native-vector-icons/FontAwesome5";
import { useApp } from '../context/AppContext';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Header from '../components/Header';
import { useTranslation } from '../hooks/useTranslation';

const Settings = () => {
  const { 
    logout, 
    user, 
    companyInfo, 
    updateCompanyInfo, 
    hasPinSet, 
    removePin, 
    hasSecurityQuestions,
    sendTestNotification,
    checkPushTokensInDatabase,
    pushToken,
    notificationPermissionStatus
  } = useApp();
  const navigation = useNavigation();
  const { t, changeLanguage, availableLanguages, locale } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState(companyInfo.name);
  const [isLoading, setIsLoading] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

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
      Alert.alert(t('common.error'), t('settings.logoUpdateFailed'));
      setIsLoading(false);
    }
  };

  const handleUpdateCompanyName = async () => {
    if (newCompanyName.trim() === '') {
      Alert.alert(t('common.error'), t('settings.companyNameRequired'));
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
      Alert.alert(t('common.error'), t('settings.companyNameUpdateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      setShowLanguageSelector(false);
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(t('common.error'), t('settings.languageChangeFailed'));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.confirmLogout'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.logout'), style: 'destructive', onPress: logout }
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
      t('settings.removePin'),
      t('settings.confirmRemovePin'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.remove'), 
          style: 'destructive', 
          onPress: async () => {
            try {
              await removePin();
              Alert.alert(t('common.success'), t('settings.pinRemovedSuccess'));
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.pinRemoveFailed'));
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Header 
        title={t('navigation.settings')} 
        onBack={() => (navigation as any).navigate('Home')}
      />

      <View style={styles.content}>
        {/* Profile Section */}
        <View style={[styles.section, styles.profileSection]}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
              <Icons name="user-circle" size={20} color={colors.textOnPrimary} />
            </View>
        <Text style={styles.sectionTitle}>{t('settings.companyProfile')}</Text>
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
                <Text style={styles.logoText}>{t('settings.addLogo')}</Text>
              </>
            )}
          </TouchableOpacity>
            <Text style={styles.logoHint}>{t('settings.tapToUpdateLogo')}</Text>
        </View>

        <View style={styles.companyNameSection}>
          {isEditing ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.nameInput}
                value={newCompanyName}
                onChangeText={setNewCompanyName}
                placeholder={t('settings.enterCompanyName')}
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
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleUpdateCompanyName}
                  disabled={isLoading}
                >
                    <Text style={styles.saveButtonText}>
                    {isLoading ? t('settings.saving') : t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
              <View style={styles.nameDisplayContainer}>
                <View style={styles.nameInfo}>
                  <Text style={styles.nameLabel}>{t('settings.companyName')}</Text>
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
            <Text style={styles.sectionTitle}>{t('settings.accountInformation')}</Text>
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
            <Text style={styles.sectionTitle}>{t('settings.customization')}</Text>
      </View>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigation.navigate('ChangeMeasurementAttributes' as never)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.info }]}>
              <Icons name="ruler-combined" size={16} color={colors.textOnPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>{t('settings.customizeMeasurements')}</Text>
              <Text style={styles.menuItemSubtext}>{t('settings.configureMeasurements')}</Text>
            </View>
            <Icons name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Language Section */}
        <View style={[styles.section, styles.customizationSection]}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.success }]}>
              <Icons name="language" size={20} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          </View>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => setShowLanguageSelector(true)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.info }]}>
              <Icons name="globe" size={16} color={colors.textOnPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>{t('settings.selectLanguage')}</Text>
              <Text style={styles.menuItemSubtext}>
                {availableLanguages.find(lang => lang.code === locale)?.nativeName || 'English'}
              </Text>
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
            <Text style={styles.sectionTitle}>{t('settings.securityPrivacy')}</Text>
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
                {hasPinSet ? t('settings.pinProtectionActive') : t('settings.setupPinProtection')}
              </Text>
              <Text style={styles.menuItemSubtext}>
                {hasPinSet ? t('settings.tapToManagePin') : t('settings.secureWithPin')}
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
                <Text style={styles.menuItemText}>{t('settings.changePin')}</Text>
                <Text style={styles.menuItemSubtext}>{t('settings.updateSecurityPin')}</Text>
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
                {hasSecurityQuestions ? t('settings.securityQuestionsSet') : t('settings.setupSecurityQuestions')}
              </Text>
              <Text style={styles.menuItemSubtext}>
                {hasSecurityQuestions ? t('settings.updateSecurityQuestions') : t('settings.helpRecoverPin')}
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
                <Text style={styles.menuItemText}>{t('settings.pinRecovery')}</Text>
                <Text style={styles.menuItemSubtext}>{t('settings.resetForgottenPin')}</Text>
              </View>
              <Icons name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Testing Section */}
        <View style={[styles.section, styles.customizationSection]}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.info }]}>
              <Icons name="bell" size={20} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.sectionTitle}>Notification Testing</Text>
          </View>

          <View style={styles.menuItem}>
            <View style={[styles.menuIconContainer, { backgroundColor: colors.info }]}>
              <Icons name="info-circle" size={16} color={colors.textOnPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>Push Token Status</Text>
              <Text style={styles.menuItemSubtext}>
                {pushToken ? 'Token available' : 'No token found'}
              </Text>
            </View>
          </View>

          <View style={styles.menuItem}>
            <View style={[styles.menuIconContainer, { backgroundColor: colors.info }]}>
              <Icons name="shield-alt" size={16} color={colors.textOnPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>Permission Status</Text>
              <Text style={styles.menuItemSubtext}>
                {notificationPermissionStatus}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={async () => {
              try {
                await checkPushTokensInDatabase();
                Alert.alert('Debug Info', 'Check console for push token details');
              } catch (error) {
                Alert.alert('Error', 'Failed to check push tokens');
              }
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.warning }]}>
              <Icons name="database" size={16} color={colors.textOnPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>Check Database Tokens</Text>
              <Text style={styles.menuItemSubtext}>View stored push tokens</Text>
            </View>
            <Icons name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={async () => {
              try {
                await sendTestNotification();
                Alert.alert('Success', 'Test notification sent!');
              } catch (error) {
                Alert.alert('Error', 'Failed to send test notification');
              }
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.success }]}>
              <Icons name="paper-plane" size={16} color={colors.textOnPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>Send Test Notification</Text>
              <Text style={styles.menuItemSubtext}>Test push notification</Text>
            </View>
            <Icons name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
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
              <Text style={[styles.menuItemText, styles.logoutText]}>{t('settings.signOut')}</Text>
              <Text style={[styles.menuItemSubtext, styles.logoutSubtext]}>
                {t('settings.signOutAccount')}
              </Text>
            </View>
        </TouchableOpacity>
        </View>
      </View>

      {/* Language Selector Modal */}
      <Modal
        visible={showLanguageSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowLanguageSelector(false)}
              >
                <Icons name="times" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageList}>
              {availableLanguages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageItem,
                    locale === language.code && styles.selectedLanguageItem
                  ]}
                  onPress={() => handleLanguageChange(language.code)}
                >
                  <View style={styles.languageInfo}>
                    <Text style={[
                      styles.languageName,
                      locale === language.code && styles.selectedLanguageText
                    ]}>
                      {language.nativeName}
                    </Text>
                    <Text style={[
                      styles.languageCode,
                      locale === language.code && styles.selectedLanguageText
                    ]}>
                      {language.name}
                    </Text>
                  </View>
                  {locale === language.code && (
                    <Icons name="check" size={16} color={colors.textOnPrimary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 8,
  },
  languageList: {
    maxHeight: 300,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
   
  },
  selectedLanguageItem: {
    backgroundColor: colors.primaryLight,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  languageCode: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectedLanguageText: {
    color: colors.textOnPrimary,
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