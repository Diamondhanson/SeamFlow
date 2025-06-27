import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { supabase } from '../../supabaseConfig';

const PasswordReset: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  // Get token from route params or URL
  const token = (route.params as any)?.token;
  const type = (route.params as any)?.type;

  useEffect(() => {
    validateResetToken();
  }, []);

  const validateResetToken = async () => {
    setIsValidating(true);
    
    if (!token || type !== 'recovery') {
      Alert.alert(
        'Invalid Reset Link',
        'This password reset link is invalid or has expired. Please request a new one.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('EnterDetails' as never),
          },
        ]
      );
      return;
    }

    try {
      // Verify the session with the recovery token
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setTokenValid(true);
      } else {
        throw new Error('Invalid or expired reset token');
      }
    } catch (error: any) {
      console.error('Error validating reset token:', error);
      Alert.alert(
        'Invalid Reset Link',
        'This password reset link is invalid or has expired. Please request a new one.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('EnterDetails' as never),
          },
        ]
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert(
        'Password Updated',
        'Your password has been successfully updated. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Sign out to clear the recovery session
              supabase.auth.signOut();
              navigation.navigate('EnterDetails' as never);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Validating reset link...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tokenValid) {
    return null; // Will be handled by the alert in validateResetToken
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={32} color={colors.primary} />
          </View>
          <Text variant="headingLarge" style={styles.title}>
            Reset Your Password
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your new password below
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text variant="bodyMedium" style={styles.inputLabel}>
              New Password
            </Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text variant="bodyMedium" style={styles.inputLabel}>
              Confirm New Password
            </Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password requirements */}
          <View style={styles.requirementsContainer}>
            <Text variant="bodySmall" style={styles.requirementsTitle}>
              Password Requirements:
            </Text>
            <View style={styles.requirement}>
              <Ionicons
                name={newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={newPassword.length >= 6 ? colors.success : colors.textSecondary}
              />
              <Text
                variant="bodySmall"
                style={[
                  styles.requirementText,
                  newPassword.length >= 6 && styles.requirementMet,
                ]}
              >
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons
                name={
                  confirmPassword && newPassword === confirmPassword
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={16}
                color={
                  confirmPassword && newPassword === confirmPassword
                    ? colors.success
                    : colors.textSecondary
                }
              />
              <Text
                variant="bodySmall"
                style={[
                  styles.requirementText,
                  confirmPassword &&
                    newPassword === confirmPassword &&
                    styles.requirementMet,
                ]}
              >
                Passwords match
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!newPassword.trim() ||
                !confirmPassword.trim() ||
                newPassword !== confirmPassword ||
                newPassword.length < 6) &&
                styles.buttonDisabled,
            ]}
            disabled={
              !newPassword.trim() ||
              !confirmPassword.trim() ||
              newPassword !== confirmPassword ||
              newPassword.length < 6 ||
              isLoading
            }
            onPress={handlePasswordReset}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text variant="bodyLarge" style={styles.buttonText}>
                Update Password
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.navigate('EnterDetails' as never)}
            disabled={isLoading}
          >
            <Text variant="bodyMedium" style={styles.cancelButtonText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  requirementsContainer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    marginLeft: 8,
    color: colors.textSecondary,
  },
  requirementMet: {
    color: colors.success,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: colors.textSecondary,
  },
});

export default PasswordReset; 