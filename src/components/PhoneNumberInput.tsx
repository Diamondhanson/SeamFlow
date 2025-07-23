import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PhoneInput, { 
  ICountry, 
  isValidPhoneNumber,
  getCountryByPhoneNumber
} from 'react-native-international-phone-number';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { textVariants } from '../theme/textVariants';
import { themeUtils } from '../theme';

interface PhoneNumberInputProps {
  value: string;
  onChangePhoneNumber: (fullPhoneNumber: string) => void;
  onCountryChange?: (country: ICountry | null) => void;
  placeholder?: string;
  editable?: boolean;
  error?: string;
  label?: string;
  containerStyle?: any;
  defaultCountry?: string;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChangePhoneNumber,
  onCountryChange,
  placeholder = "Phone Number",
  editable = true,
  error,
  label,
  containerStyle,
  defaultCountry = "CMR",
}) => {
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);

  // Handle existing phone number value
  useEffect(() => {
    if (value && value.startsWith('+')) {
      // If value is in international format, use it directly
      try {
        const country = getCountryByPhoneNumber(value.replace(/\s/g, ''));
        if (country) {
          setSelectedCountry(country);
          // Extract the number without country code (handle both with and without space)
          const phoneWithoutCode = value.replace(country.callingCode, '').trim();
          setInputValue(phoneWithoutCode);
          setIsValid(isValidPhoneNumber(phoneWithoutCode, country));
        }
      } catch (error) {
        console.log('Could not parse phone number:', error);
      }
    } else if (value) {
      // If value is not in international format, treat as local number
      setInputValue(value);
    }
  }, [value]);

  const handleInputValue = (phoneNumber: string) => {
    setInputValue(phoneNumber);
    
    if (selectedCountry && phoneNumber) {
      const fullPhoneNumber = `${selectedCountry.callingCode} ${phoneNumber}`;
      onChangePhoneNumber(fullPhoneNumber);
      setIsValid(isValidPhoneNumber(phoneNumber, selectedCountry));
    } else {
      onChangePhoneNumber(phoneNumber);
      setIsValid(true);
    }
  };

  const handleSelectedCountry = (country: ICountry) => {
    setSelectedCountry(country);
    onCountryChange?.(country);
    
    // If there's an input value, revalidate with new country
    if (inputValue) {
      const fullPhoneNumber = `${country.callingCode} ${inputValue}`;
      onChangePhoneNumber(fullPhoneNumber);
      setIsValid(isValidPhoneNumber(inputValue, country));
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      
      <View style={[
        styles.phoneInputContainer,
        !editable && styles.phoneInputDisabled,
        error && styles.phoneInputError
      ]}>
        <PhoneInput
          value={inputValue}
          onChangePhoneNumber={handleInputValue}
          selectedCountry={selectedCountry}
          onChangeSelectedCountry={handleSelectedCountry}
                      defaultCountry={defaultCountry as any}
          placeholder={placeholder}
          disabled={!editable}
          phoneInputStyles={{
            container: {
              backgroundColor: 'transparent',
              borderWidth: 0,
              borderRadius: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
              minHeight: 46,
            },
            flagContainer: {
              backgroundColor: colors.surfaceElevated,
              borderTopLeftRadius: spacing.borderRadius.m,
              borderBottomLeftRadius: spacing.borderRadius.m,
              borderRightWidth: 1,
              borderRightColor: colors.borderLight,
              paddingHorizontal: spacing.sm,
              minWidth: 80,
              justifyContent: 'center',
            },
            flag: {
              fontSize: 20,
            },
            caret: {
              color: colors.textSecondary,
              fontSize: 16,
            },
            divider: {
              backgroundColor: colors.borderLight,
              width: 1,
              marginHorizontal: spacing.xs,
            },
            callingCode: {
              fontSize: textVariants.body2.fontSize,
              color: colors.textSecondary,
              fontWeight: '500',
              marginLeft: spacing.xs,
            },
            input: {
              backgroundColor: 'transparent',
              color: colors.text,
              fontSize: textVariants.body2.fontSize,
              paddingHorizontal: spacing.m,
              paddingVertical: spacing.sm,
              flex: 1,
              minHeight: 46,
            },
          }}
          modalStyles={{
            modal: {
              backgroundColor: colors.surface,
              borderRadius: spacing.borderRadius.l,
              marginHorizontal: spacing.l,
              marginVertical: '10%',
              maxHeight: '80%',
              maxWidth: '90%',
              alignSelf: 'center',
              justifyContent: 'center',
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
            },
            backdrop: {
              backgroundColor: colors.overlay,
              justifyContent: 'center',
              alignItems: 'center',
            },
            divider: {
              backgroundColor: colors.borderLight,
              height: 0.5,
              marginHorizontal: spacing.m,
            },
            countriesList: {
              backgroundColor: colors.surface,
            },
            searchInput: {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderLight,
              borderWidth: 1,
              borderRadius: spacing.borderRadius.m,
              color: colors.text,
              paddingHorizontal: spacing.m,
              paddingVertical: spacing.sm,
              margin: spacing.m,
              fontSize: textVariants.body2.fontSize,
            },
            countryButton: {
              backgroundColor: colors.surface,
              borderWidth: 0,
              borderBottomWidth: 0,
              borderBottomColor: 'transparent',
              paddingHorizontal: spacing.m,
              paddingVertical: spacing.m,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 56,
            },
            noCountryText: {
              color: colors.textSecondary,
              fontSize: textVariants.body2.fontSize,
              textAlign: 'center',
              padding: spacing.l,
            },
            noCountryContainer: {
              backgroundColor: colors.surface,
            },
            flag: {
              fontSize: 20,
              marginRight: spacing.sm,
            },
            callingCode: {
              color: colors.textSecondary,
              fontSize: textVariants.body2.fontSize,
              fontWeight: '500',
              marginRight: spacing.sm,
              minWidth: 50,
            },
            countryName: {
              color: colors.text,
              fontSize: textVariants.body2.fontSize,
              flex: 1,
            },
            sectionTitle: {
              color: colors.text,
              fontSize: textVariants.body1.fontSize,
              fontWeight: '600',
              backgroundColor: colors.surfaceElevated,
              paddingHorizontal: spacing.m,
              paddingVertical: spacing.sm,
              borderBottomWidth: 0,
              borderBottomColor: 'transparent',
            },
          }}
          modalSearchInputPlaceholder="Search countries..."
          modalNotFoundCountryMessage="No country found"
          modalHeight="80%"
        />
      </View>
      
      {/* Validation indicator */}
      {inputValue && selectedCountry && (
        <View style={styles.validationContainer}>
          <Text style={[
            styles.validationText,
            isValid ? styles.validationSuccess : styles.validationError
          ]}>
            {isValid ? '✓ Valid phone number' : '⚠ Invalid phone number'}
          </Text>
        </View>
      )}
      
      {/* Error message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.fieldGap,
  },
  label: {
    color: colors.textSecondary,
    fontSize: textVariants.body2.fontSize,
    marginBottom: spacing.xs,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  phoneInputContainer: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    overflow: 'hidden',
    ...themeUtils.getElevation('xs'),
  },
  phoneInputDisabled: {
    opacity: 0.6,
    backgroundColor: colors.backgroundSecondary,
  },
  phoneInputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  validationContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  validationText: {
    fontSize: textVariants.caption.fontSize,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  validationSuccess: {
    color: colors.success,
  },
  validationError: {
    color: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: textVariants.caption.fontSize,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: textVariants.caption.fontSize,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});

export default PhoneNumberInput; 