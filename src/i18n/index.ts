import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fallback implementation for react-native-localize
const RNLocalize = {
  getLocales: () => {
    // Try to get device locale, fallback to 'en'
    try {
      if (typeof navigator !== 'undefined' && navigator.language) {
        return [{ languageCode: navigator.language.split('-')[0] }];
      }
      return [{ languageCode: 'en' }];
    } catch (error) {
      return [{ languageCode: 'en' }];
    }
  }
};

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

// Get device locales
export const getDeviceLanguage = (): string => {
  const locales = RNLocalize.getLocales();
  const deviceLanguage = locales[0]?.languageCode || 'en';
  
  // Check if we support the device language
  const supportedLanguages = ['en', 'es', 'fr'];
  return supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';
};

// Initialize language
export const initializeLanguage = async (): Promise<void> => {
  try {
    // First check if user has a saved preference
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    
    if (savedLanguage && ['en', 'es', 'fr'].includes(savedLanguage)) {
      i18n.locale = savedLanguage;
    } else {
      // Use device language
      const deviceLanguage = getDeviceLanguage();
      i18n.locale = deviceLanguage;
      // Save device language as user preference
      await AsyncStorage.setItem(LANGUAGE_KEY, deviceLanguage);
    }
  } catch (error) {
    console.error('Error initializing language:', error);
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