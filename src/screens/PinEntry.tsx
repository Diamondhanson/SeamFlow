import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';
import Icons from 'react-native-vector-icons/FontAwesome5';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { useApp } from '../context/AppContext';

const PinEntry: React.FC = () => {
  const navigation = useNavigation();
  const { 
    validatePinWithTracking, 
    checkPinLockoutStatus, 
    companyInfo,
    hasSecurityQuestions 
  } = useApp();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

  // Check lockout status on component mount
  useEffect(() => {
    const checkLockout = async () => {
      try {
        const status = await checkPinLockoutStatus();
        if (status.locked && status.lockedUntil) {
          setIsLocked(true);
          const timeRemaining = Math.ceil((status.lockedUntil.getTime() - Date.now()) / 1000);
          setLockTimeRemaining(Math.max(0, timeRemaining));
        }
        setAttemptsRemaining(status.attemptsRemaining);
      } catch (error) {
        console.error('Error checking lockout status:', error);
      }
    };
    
    checkLockout();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && lockTimeRemaining > 0) {
      timer = setInterval(() => {
        setLockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttemptsRemaining(5);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockTimeRemaining]);

  const handleNumberPress = (num: string) => {
    if (pin.length < 4 && !isLocked) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (pin.length !== 4 || isLocked) return;

    setIsLoading(true);
    try {
      const result = await validatePinWithTracking(pin);
      
      if (result.success) {
        // PIN validation successful - reset navigation stack to Home
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' as never }],
        });
      } else {
        setAttemptsRemaining(result.attemptsRemaining);
        
        if (result.locked) {
          setIsLocked(true);
          setLockTimeRemaining(3600); // 1 hour in seconds
          Alert.alert(
            'Account Locked',
            'Too many failed PIN attempts. Your account has been locked for 1 hour for security.'
          );
        } else {
          Alert.alert(
            'Incorrect PIN',
            `${result.attemptsRemaining} attempts remaining.`
          );
        }
        setPin('');
      }
    } catch (error) {
      console.error('Error validating PIN:', error);
      Alert.alert('Error', 'Failed to validate PIN. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPin = () => {
    navigation.navigate('PinRecovery' as never);
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  const renderPinDots = () => (
    <View style={styles.pinDotsContainer}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            index < pin.length && styles.pinDotFilled,
            attemptsRemaining < 5 && styles.pinDotError
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
          style={[styles.keypadButton, isLocked && styles.keypadButtonDisabled]}
          onPress={() => handleNumberPress(num.toString())}
          disabled={isLocked || pin.length >= 4}
        >
          <Text style={[styles.keypadButtonText, isLocked && styles.keypadButtonTextDisabled]}>
            {num}
          </Text>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity 
        style={[styles.keypadButton, styles.forgotButton]} 
        onPress={handleForgotPin}
        disabled={isLocked}
      >
        <Text style={styles.forgotButtonText}>Forgot?</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.keypadButton, isLocked && styles.keypadButtonDisabled]}
        onPress={() => handleNumberPress('0')}
        disabled={isLocked || pin.length >= 4}
      >
        <Text style={[styles.keypadButtonText, isLocked && styles.keypadButtonTextDisabled]}>
          0
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.keypadButton, isLocked && styles.keypadButtonDisabled]}
        onPress={handleDelete}
        disabled={isLocked || pin.length === 0}
      >
        <Icons 
          name="backspace" 
          size={24} 
          color={isLocked ? colors.textSecondary : colors.text} 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <View style={styles.companySection}>
              <Text style={styles.companyName}>{companyInfo.name}</Text>
              <Text style={styles.welcomeText}>Welcome back</Text>
            </View>
          </View>

          <View style={styles.lockSection}>
            <Icons 
              name="lock" 
              size={64} 
              color={isLocked ? colors.error : colors.primary} 
              style={styles.lockIcon}
            />
            <Text style={styles.title}>
              {isLocked ? 'App Locked' : 'Enter Your PIN'}
            </Text>
            {isLocked ? (
              <Text style={styles.lockMessage}>
                Too many failed attempts.{'\n'}
                Try again in {lockTimeRemaining} seconds.
              </Text>
            ) : (
              <Text style={styles.subtitle}>
                Enter your 4-digit PIN to continue
              </Text>
            )}
          </View>

          {renderPinDots()}
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            renderKeypad()
          )}

          {attemptsRemaining < 5 && !isLocked && (
            <Text style={styles.attemptsWarning}>
              {attemptsRemaining} attempts remaining
            </Text>
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
  headerSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  companySection: {
    alignItems: 'center',
  },
  companyName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  lockSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
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
  lockMessage: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.m,
    marginVertical: spacing.xxl,
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
  pinDotError: {
    backgroundColor: colors.error,
    borderColor: colors.error,
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
  keypadButtonDisabled: {
    opacity: 0.3,
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
  },
  keypadButtonTextDisabled: {
    color: colors.textSecondary,
  },
  forgotButton: {
    backgroundColor: colors.surfaceElevated,
  },
  forgotButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    height: 240, // Same height as keypad
    justifyContent: 'center',
    alignItems: 'center',
  },
  attemptsWarning: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.m,
  },
});

export default PinEntry; 