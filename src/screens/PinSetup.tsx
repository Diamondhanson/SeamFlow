import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';
import Icons from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Header from '../components/Header';
import { useApp } from '../context/AppContext';

const PinSetup = () => {
  const navigation = useNavigation();
  const { setupPin } = useApp();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'setup' | 'confirm'>('setup');
  const [isLoading, setIsLoading] = useState(false);

  const handleNumberPress = (num: string) => {
    if (step === 'setup') {
      if (pin.length < 4) {
        setPin(prev => prev + num);
      }
    } else {
      if (confirmPin.length < 4) {
        setConfirmPin(prev => prev + num);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'setup') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleContinue = () => {
    if (step === 'setup' && pin.length === 4) {
      setStep('confirm');
    } else if (step === 'confirm' && confirmPin.length === 4) {
      handleSetupPin();
    }
  };

  const handleSetupPin = async () => {
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    setIsLoading(true);
    try {
      await setupPin(pin);
      Alert.alert(
        'Success', 
        'PIN has been set successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('Home' as never) }]
      );
    } catch (error) {
      console.error('Error setting up PIN:', error);
      Alert.alert('Error', 'Failed to set up PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip PIN Setup',
      'You can set up a PIN later in Settings. Are you sure you want to skip?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => navigation.navigate('Home' as never) }
      ]
    );
  };

  const currentPin = step === 'setup' ? pin : confirmPin;
  const isComplete = currentPin.length === 4;

  const renderPinDots = () => (
    <View style={styles.pinDotsContainer}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            index < currentPin.length && styles.pinDotFilled
          ]}
        />
      ))}
    </View>
  );

  const renderKeypad = () => (
    <View style={styles.keypad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <TouchableOpacity
          key={num}
          style={styles.keypadButton}
          onPress={() => handleNumberPress(num.toString())}
          disabled={currentPin.length >= 4}
        >
          <Text style={styles.keypadButtonText}>{num}</Text>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity style={styles.keypadButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.keypadButton}
        onPress={() => handleNumberPress('0')}
        disabled={currentPin.length >= 4}
      >
        <Text style={styles.keypadButtonText}>0</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.keypadButton}
        onPress={handleDelete}
        disabled={currentPin.length === 0}
      >
        <Icons name="backspace" size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaWrapper>
      <Header 
        title="Set Up PIN" 
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.instructionSection}>
            <Icons 
              name="lock" 
              size={64} 
              color={colors.primary} 
              style={styles.lockIcon}
            />
            <Text style={styles.title}>
              {step === 'setup' ? 'Create Your PIN' : 'Confirm Your PIN'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'setup' 
                ? 'Set a 4-digit PIN to secure your app'
                : 'Enter your PIN again to confirm'
              }
            </Text>
          </View>

          {renderPinDots()}
          {renderKeypad()}

          {isComplete && (
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.continueButtonText}>
                  {step === 'setup' ? 'Continue' : 'Set PIN'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.page,
    justifyContent: 'space-between',
    paddingBottom: spacing.huge,
  },
  instructionSection: {
    alignItems: 'center',
    paddingTop: spacing.huge,
  },
  lockIcon: {
    marginBottom: spacing.l,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.m,
    marginVertical: spacing.xl,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
  },
  keypadButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...themeUtils.getElevation('xs'),
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.l,
    paddingVertical: spacing.m,
    alignItems: 'center',
    marginTop: spacing.l,
    ...themeUtils.getElevation('s'),
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
});

export default PinSetup; 