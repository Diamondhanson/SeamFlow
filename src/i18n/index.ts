import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { getLocales } from 'expo-localization';

// Import translations
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

// Create i18n instance
const i18n = new I18n({
  en,
  es,
  fr,
});

// Set default locale
i18n.defaultLocale = 'en';

// Enable fallback to default locale
i18n.enableFallback = true;

// Storage key for user's language preference
const LANGUAGE_KEY = 'user_language';

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr'];

// Get device locales with fallback (uses expo-localization, compatible with Expo Go)
export const getDeviceLanguage = (): string => {
  try {
    const locales = getLocales();
    const deviceLanguage = locales[0]?.languageCode || 'en';
    return SUPPORTED_LANGUAGES.includes(deviceLanguage) ? deviceLanguage : 'en';
  } catch {
    // Fallback: Use platform-specific locale detection
    let deviceLanguage = 'en';
    if (Platform.OS === 'ios') {
      deviceLanguage =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'en';
    } else if (Platform.OS === 'android') {
      deviceLanguage = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
    const languageCode = deviceLanguage.split(/[-_]/)[0].toLowerCase();
    return SUPPORTED_LANGUAGES.includes(languageCode) ? languageCode : 'en';
  }
};

// Initialize language
export const initializeLanguage = async (): Promise<void> => {
  try {
    // First check if user has a saved preference
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    
    if (savedLanguage && ['en', 'es', 'fr'].includes(savedLanguage)) {
      i18n.locale = savedLanguage;
      console.log('Using saved language:', savedLanguage);
    } else {
      // Use device language
      const deviceLanguage = getDeviceLanguage();
      i18n.locale = deviceLanguage;
      console.log('Using device language:', deviceLanguage);
      // Save device language as user preference
      await AsyncStorage.setItem(LANGUAGE_KEY, deviceLanguage);
    }
  } catch (error) {
    console.warn('Error initializing language, falling back to English:', error);
    i18n.locale = 'en'; // Fallback to English
  }
};

// Change language
export const changeLanguage = async (language: string): Promise<void> => {
  try {
    if (['en', 'es', 'fr'].includes(language)) {
      i18n.locale = language;
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    }
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.locale;
};

// Get available languages
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

// Translation function
export const translate = (key: string, options?: any): string => {
  return i18n.t(key, options);
};

// Export i18n instance
export { i18n };
export default i18n; 