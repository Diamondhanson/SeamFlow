import { useState, useEffect, useCallback } from 'react';
import { translate, i18n, initializeLanguage, changeLanguage, getCurrentLanguage, getAvailableLanguages } from '../i18n';

interface TranslationHook {
  t: (key: string, options?: any) => string;
  locale: string;
  changeLanguage: (language: string) => Promise<void>;
  availableLanguages: Array<{ code: string; name: string; nativeName: string }>;
  isReady: boolean;
}

export const useTranslation = (): TranslationHook => {
  const [locale, setLocale] = useState<string>(getCurrentLanguage());
  const [isReady, setIsReady] = useState<boolean>(false);

  // Initialize translations on first load
  useEffect(() => {
    const initTranslations = async () => {
      await initializeLanguage();
      setLocale(getCurrentLanguage());
      setIsReady(true);
    };

    initTranslations();
  }, []);

  // Handle language changes
  const handleChangeLanguage = useCallback(async (language: string) => {
    await changeLanguage(language);
    setLocale(getCurrentLanguage());
    
    // Force re-render by updating the i18n instance
    i18n.locale = language;
  }, []);

  // Translation function
  const t = useCallback((key: string, options?: any) => {
    return translate(key, options);
  }, [locale]); // Re-create when locale changes

  return {
    t,
    locale,
    changeLanguage: handleChangeLanguage,
    availableLanguages: getAvailableLanguages(),
    isReady,
  };
};

// Helper function to get translated measurement attributes
export const getTranslatedMeasurementAttributes = (
  customAttributes: string[], 
  defaultTranslations: Record<string, string>
): string[] => {
  const defaultAttributeKeys = [
    'shoulder', 'chest', 'waist', 'hips', 'topLength', 
    'trouserLength', 'legRound', 'armRound', 'wrist'
  ];
  
  return customAttributes.map(attr => {
    // Check if this is a default attribute that should be translated
    if (defaultAttributeKeys.includes(attr.toLowerCase())) {
      return defaultTranslations[attr] || attr;
    }
    
    // Return custom user-defined attributes as-is
    return attr;
  });
};

export default useTranslation; 